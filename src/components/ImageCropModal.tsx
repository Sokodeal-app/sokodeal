'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import imageCompression from 'browser-image-compression'

const MAX_ZOOM = 3

interface ImageCropModalProps {
  file: File
  aspect: number
  onConfirm: (croppedFile: File) => void
  onCancel: () => void
}

export default function ImageCropModal({ file, aspect, onConfirm, onCancel }: ImageCropModalProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const dragging = useRef(false)
  const dragStart = useRef({ mouseX: 0, mouseY: 0, frameX: 0, frameY: 0 })

  const [processing, setProcessing] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [framePos, setFramePos] = useState({ x: 0, y: 0 })
  const [frameSize, setFrameSize] = useState({ w: 0, h: 0 })
  const [imgSrc, setImgSrc] = useState<string>('')
  const [zoom, setZoom] = useState(1)
  const [minZoom, setMinZoom] = useState(1)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    setLoaded(false)
    setZoom(1)
    setMinZoom(1)
    setImgSrc(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const computeFrame = useCallback((displayW: number, displayH: number) => {

    const frameW = displayW * 0.80
    const frameH = frameW / aspect
    let finalFrameW = frameW
    let finalFrameH = frameH

    if (frameH > displayH * 0.80) {
      finalFrameH = displayH * 0.80
      finalFrameW = finalFrameH * aspect
    }

    setFrameSize({ w: finalFrameW, h: finalFrameH })
    setFramePos({
      x: (displayW - finalFrameW) / 2,
      y: (displayH - finalFrameH) / 2,
    })

    const minZoomW = finalFrameW / displayW
    const minZoomH = finalFrameH / displayH
    const calculatedMinZoom = Math.max(minZoomW, minZoomH)
    setMinZoom(calculatedMinZoom)

    setLoaded(true)
  }, [aspect])

  const getFrameBounds = useCallback(() => {
    const img = imgRef.current
    if (!img) return { minX: 0, minY: 0, maxX: 0, maxY: 0 }

    const baseW = img.offsetWidth
    const baseH = img.offsetHeight
    const displayW = baseW * zoom
    const displayH = baseH * zoom
    const offsetX = Math.max(0, (baseW - displayW) / 2)
    const offsetY = Math.max(0, (baseH - displayH) / 2)

    return {
      minX: offsetX,
      minY: offsetY,
      maxX: Math.max(offsetX, offsetX + displayW - frameSize.w),
      maxY: Math.max(offsetY, offsetY + displayH - frameSize.h),
    }
  }, [frameSize, zoom])

  const onImageLoad = useCallback(() => {
    const img = imgRef.current
    if (!img) return

    requestAnimationFrame(() => {
      const displayW = img.offsetWidth
      const displayH = img.offsetHeight

      if (displayW === 0 || displayH === 0) {
        setTimeout(() => {
          const w = img.offsetWidth
          const h = img.offsetHeight
          if (w === 0 || h === 0) return
          computeFrame(w, h)
        }, 100)
        return
      }

      computeFrame(displayW, displayH)
    })
  }, [computeFrame])

  const moveFrame = useCallback((clientX: number, clientY: number) => {
    if (!dragging.current) return

    const dx = clientX - dragStart.current.mouseX
    const dy = clientY - dragStart.current.mouseY
    const { minX, minY, maxX, maxY } = getFrameBounds()
    const newX = Math.max(minX, Math.min(maxX, dragStart.current.frameX + dx))
    const newY = Math.max(minY, Math.min(maxY, dragStart.current.frameY + dy))

    setFramePos({ x: newX, y: newY })
  }, [getFrameBounds])

  const startDrag = useCallback((clientX: number, clientY: number) => {
    dragging.current = true
    dragStart.current = {
      mouseX: clientX,
      mouseY: clientY,
      frameX: framePos.x,
      frameY: framePos.y,
    }
  }, [framePos])

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    startDrag(e.clientX, e.clientY)
  }

  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    startDrag(touch.clientX, touch.clientY)
  }

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => moveFrame(e.clientX, e.clientY)
    const onMouseUp = () => {
      dragging.current = false
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [moveFrame])

  useEffect(() => {
    const onTouchMove = (e: TouchEvent) => {
      if (!dragging.current) return
      e.preventDefault()
      const touch = e.touches[0]
      moveFrame(touch.clientX, touch.clientY)
    }
    const onTouchEnd = () => {
      dragging.current = false
    }

    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    return () => {
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
    }
  }, [moveFrame])

  useEffect(() => {
    const container = imgRef.current?.parentElement
    if (!container) return

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      setZoom(prev => {
        const delta = e.deltaY > 0 ? -0.05 : 0.05
        return Math.max(minZoom, Math.min(MAX_ZOOM, prev + delta))
      })
    }

    container.addEventListener('wheel', onWheel, { passive: false })
    return () => container.removeEventListener('wheel', onWheel)
  }, [loaded, minZoom])

  useEffect(() => {
    const img = imgRef.current
    if (!img || !loaded) return

    const baseW = img.offsetWidth
    const baseH = img.offsetHeight
    const displayW = baseW * zoom
    const displayH = baseH * zoom

    const offsetX = Math.max(0, (baseW - displayW) / 2)
    const offsetY = Math.max(0, (baseH - displayH) / 2)

    setFramePos(prev => ({
      x: Math.max(offsetX, Math.min(Math.max(offsetX, offsetX + displayW - frameSize.w), prev.x)),
      y: Math.max(offsetY, Math.min(Math.max(offsetY, offsetY + displayH - frameSize.h), prev.y)),
    }))
  }, [zoom, loaded, frameSize])

  const handleConfirm = useCallback(async () => {
    const img = imgRef.current
    if (!img || processing || !loaded) return
    setProcessing(true)

    const baseW = img.offsetWidth
    const baseH = img.offsetHeight
    const displayW = baseW * zoom
    const displayH = baseH * zoom
    const offsetX = (baseW - displayW) / 2
    const offsetY = (baseH - displayH) / 2
    const scaleX = img.naturalWidth / displayW
    const scaleY = img.naturalHeight / displayH
    const sourceX = Math.max(0, (framePos.x - offsetX) * scaleX)
    const sourceY = Math.max(0, (framePos.y - offsetY) * scaleY)
    const sourceW = Math.min(frameSize.w * scaleX, img.naturalWidth - sourceX)
    const sourceH = Math.min(frameSize.h * scaleY, img.naturalHeight - sourceY)
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    if (!ctx) {
      setProcessing(false)
      return
    }

    canvas.width = Math.round(sourceW)
    canvas.height = Math.round(sourceH)

    ctx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceW,
      sourceH,
      0,
      0,
      canvas.width,
      canvas.height
    )

    canvas.toBlob(async (blob) => {
      if (!blob) {
        setProcessing(false)
        return
      }

      try {
        const croppedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' })
        let finalFile = croppedFile

        if (croppedFile.size > 800 * 1024) {
          finalFile = await imageCompression(croppedFile, {
            maxSizeMB: 0.8,
            useWebWorker: true,
          })
        }

        onConfirm(finalFile)
      } finally {
        setProcessing(false)
      }
    }, 'image/jpeg', 0.9)
  }, [file.name, framePos, frameSize, loaded, onConfirm, processing, zoom])

  return (
    <div style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.8)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'20px'}}>
      <div style={{background:'white', borderRadius:'16px', padding:'20px', maxWidth:'640px', width:'100%', maxHeight:'90vh', display:'flex', flexDirection:'column', gap:'14px'}}>
        <div>
          <h2 style={{fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.05rem', color:'#111a14', marginBottom:'4px'}}>
            Recadrer la photo
          </h2>
          <p style={{fontSize:'0.75rem', color:'#6b7c6e'}}>
            Deplacez le cadre pour choisir la zone a afficher
          </p>
        </div>

        <div style={{borderRadius:'10px', overflow:'hidden', border:'1px solid #e8ede9', background:'#111', display:'flex', alignItems:'center', justifyContent:'center', maxHeight:'55vh'}}>
          <div style={{position:'relative', display:'inline-block', lineHeight:0, userSelect:'none'}}>
            {imgSrc && (
              <img
                ref={imgRef}
                src={imgSrc}
                alt="crop"
                onLoad={onImageLoad}
                style={{display:'block', maxWidth:'100%', maxHeight:'55vh', transform:`scale(${zoom})`, transformOrigin:'center center', transition:'transform 0.15s ease'}}
              />
            )}

            {loaded && (
              <div
                onMouseDown={onMouseDown}
                onTouchStart={onTouchStart}
                style={{position:'absolute', left:framePos.x, top:framePos.y, width:frameSize.w, height:frameSize.h, border:'2px solid #f5a623', boxShadow:'0 0 0 9999px rgba(0,0,0,0.5)', cursor:'move', boxSizing:'border-box', touchAction:'none'}}
              >
                {[
                  { top: -2, left: -2 },
                  { top: -2, right: -2 },
                  { bottom: -2, left: -2 },
                  { bottom: -2, right: -2 },
                ].map((pos, i) => (
                  <div key={i} style={{position:'absolute', width:'12px', height:'12px', background:'#f5a623', borderRadius:'2px', ...pos}} />
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{display:'flex', alignItems:'center', justifyContent:'center', gap:'12px'}}>
          <button
            onClick={() => setZoom(prev => Math.max(minZoom, prev - 0.05))}
            disabled={zoom <= minZoom}
            style={{width:'36px', height:'36px', background:'#f5f7f5', border:'1px solid #e8ede9', borderRadius:'50%', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.2rem', color: zoom <= minZoom ? '#ccc' : '#111a14', cursor: zoom <= minZoom ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}
          >
            {'\u2212'}
          </button>

          <div style={{fontSize:'0.78rem', color:'#6b7c6e', fontFamily:'DM Sans,sans-serif', fontWeight:600, minWidth:'40px', textAlign:'center'}}>
            {Math.round(zoom * 100)}%
          </div>

          <button
            onClick={() => setZoom(prev => Math.min(MAX_ZOOM, prev + 0.05))}
            disabled={zoom >= MAX_ZOOM}
            style={{width:'36px', height:'36px', background:'#f5f7f5', border:'1px solid #e8ede9', borderRadius:'50%', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'1.2rem', color: zoom >= MAX_ZOOM ? '#ccc' : '#111a14', cursor: zoom >= MAX_ZOOM ? 'not-allowed' : 'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}
          >
            +
          </button>

          <span style={{fontSize:'0.7rem', color:'#9ca3af', fontFamily:'DM Sans,sans-serif'}}>
            Molette pour zoomer
          </span>
        </div>

        <div style={{display:'flex', gap:'10px'}}>
          <button
            onClick={handleConfirm}
            disabled={processing || !loaded}
            style={{flex:1, padding:'12px', background: processing || !loaded ? '#ccc' : '#1a7a4a', border:'none', borderRadius:'10px', fontFamily:'Syne,sans-serif', fontWeight:800, fontSize:'0.92rem', color:'white', cursor: processing || !loaded ? 'not-allowed' : 'pointer'}}
          >
            {processing ? 'Traitement...' : 'Confirmer'}
          </button>
          <button
            onClick={onCancel}
            disabled={processing}
            style={{flex:1, padding:'12px', background:'#f5f7f5', border:'1px solid #e8ede9', borderRadius:'10px', fontFamily:'DM Sans,sans-serif', fontWeight:600, fontSize:'0.88rem', color:'#6b7c6e', cursor: processing ? 'not-allowed' : 'pointer'}}
          >
            Annuler
          </button>
        </div>
      </div>
    </div>
  )
}
