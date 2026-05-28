'use client'
import { useState } from 'react'
import { useFavorites } from '../hooks/useFavorites'

export default function FavoriteButton({ adId, onLogin = () => {}, size = 'md' }) {
  const { isFavorite, toggleFavorite, userId } = useFavorites()
  const [pending, setPending] = useState(false)

  const active = isFavorite(adId)

  const sizeMap = {
    sm: { width: '28px', height: '28px' },
    md: { width: '36px', height: '36px' },
    lg: { width: '44px', height: '44px' },
  }
  const s = sizeMap[size] || sizeMap.md

  const handleClick = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!userId) {
      sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
        url: window.location.pathname,
        state: {}
      }))
      onLogin?.()
      return
    }
    setPending(true)
    await toggleFavorite(adId)
    setPending(false)
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: s.width,
        height: s.height,
        border: 'none',
        borderRadius: '50%',
        background: active ? '#fff1f2' : 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(6px)',
        cursor: pending ? 'default' : 'pointer',
        boxShadow: '0 1px 6px rgba(0,0,0,0.12)',
        color: active ? '#ef4444' : '#9ca3af',
        opacity: pending ? 0.6 : 1,
        flexShrink: 0,
        transition: 'transform 0.15s ease, background 0.2s ease',
      }}
    >
      <svg
        viewBox="0 0 24 24"
        fill={active ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ width: '55%', height: '55%' }}
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </svg>
    </button>
  )
}
