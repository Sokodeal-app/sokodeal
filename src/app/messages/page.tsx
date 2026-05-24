'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'
import Header from '@/components/Header'
import { AppShell } from '@/components/layout'

export default function MessagesPage() {
  const { user: authUser, session, loading: authLoading } = useAuth()
  const [user, setUser] = useState<any>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [activeConv, setActiveConv] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const bottomRef = useRef<any>(null)
  const readConvsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    const init = async () => {
      try {
        setLoadError('')
        setUser(authUser)

      const convList = await loadConversations(authUser) || []

      // ✅ Ouvrir direct une conversation si ?user= dans l'URL
      const params = new URLSearchParams(window.location.search)
      const targetUserId = params.get('user')
      if (targetUserId) {
        const existingConv = convList.find((c: any) => c.other_id === targetUserId)
        if (existingConv) {
          await openConversation(existingConv)
        } else {
          // Nouvelle conversation sans historique
          const { data: targetUser } = await supabase
            .from('users')
            .select('id, username, full_name, email')
            .eq('id', targetUserId)
            .single()
          if (targetUser) {
            setActiveConv({
              other_id: targetUser.id,
              other_email: targetUser.email || '',
              other_user: targetUser,
              ad_id: null,
              ad: null,
              unread: 0,
              last_message: '',
              last_date: new Date().toISOString(),
            })
            setMessages([])
          }
        }
      }

      } catch (err) {
        console.error('messages init error:', err)
        setLoadError('Impossible de charger les messages pour le moment.')
        setConversations([])
        setMessages([])
      } finally {
        setLoading(false)
      }
    }

    if (authLoading) {
      setLoading(true)
      return
    }

    if (!authUser) {
      sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
        url: window.location.pathname + window.location.search,
        state: {}
      }))
      setLoading(false)
      window.location.href = '/auth?mode=login'
      return
    }

    init()
  }, [authLoading, authUser])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!user || !activeConv) return
    const ch = supabase.channel('msgs-' + activeConv.other_id + '-' + activeConv.ad_id)
    ch.on('postgres_changes', {
      event: 'INSERT', schema: 'public', table: 'messages'
    }, (payload) => {
      const m = payload.new as any
      const inConv = (
        (m.sender_id === user.id && m.receiver_id === activeConv.other_id) ||
        (m.receiver_id === user.id && m.sender_id === activeConv.other_id)
      ) && (m.ad_id || null) === (activeConv.ad_id || null)
      if (inConv) {
        if (m.receiver_id === user.id) {
          markConversationAsRead([m])
          setMessages(prev => [...prev, { ...m, is_read: true }])
        } else {
          setMessages(prev => [...prev, m])
        }
      }
    }).on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'messages',
      filter: `sender_id=eq.${user.id}`
    }, (payload) => {
      setMessages(prev => prev.map((m: any) =>
        m.id === payload.new.id
          ? { ...m, is_read: payload.new.is_read, read_at: payload.new.read_at }
          : m
      ))
    }).subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [user, activeConv])

  const loadConversations = async (u: any) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${u.id},receiver_id.eq.${u.id}`)
      .order('created_at', { ascending: false })

    if (!data) return []

    const convMap = new Map()
    for (const msg of data) {
      const otherId = msg.sender_id === u.id ? msg.receiver_id : msg.sender_id
      const key = `${msg.ad_id}__${otherId}`

      if (!convMap.has(key)) {
        convMap.set(key, {
          ad_id: msg.ad_id,
          other_id: otherId,
          other_email: msg.sender_id === u.id ? msg.receiver_email : msg.sender_email,
          last_message: msg.content,
          last_date: msg.created_at,
          unread: msg.receiver_id === u.id && !msg.is_read ? 1 : 0,
        })
      } else {
        const conv = convMap.get(key)
        if (msg.receiver_id === u.id && !msg.is_read) conv.unread++
      }
    }

    const convList = Array.from(convMap.values())

    // Charger les infos des autres utilisateurs
    const otherIds = [...new Set(convList.map((c: any) => c.other_id).filter(Boolean))]
    if (otherIds.length > 0) {
      const { data: usersData } = await supabase
        .from('users')
        .select('id, username, full_name')
        .in('id', otherIds)
      const usersMap = new Map((usersData || []).map((u: any) => [u.id, u]))
      convList.forEach((c: any) => { c.other_user = usersMap.get(c.other_id) || null })
    }

    // Charger les titres des annonces
    const adIds = [...new Set(convList.map((c: any) => c.ad_id).filter(Boolean))]
    if (adIds.length > 0) {
      const { data: adsData } = await supabase
        .from('ads')
        .select('id, title, images, category')
        .in('id', adIds)
      const adsMap = new Map((adsData || []).map((a: any) => [a.id, a]))
      convList.forEach((c: any) => { c.ad = adsMap.get(c.ad_id) || null })
    }

    // ✅ FIX : appliquer les convs déjà lues
    convList.forEach((c: any) => {
      const key = `${c.ad_id}__${c.other_id}`
      if (readConvsRef.current.has(key)) c.unread = 0
    })

    setConversations(convList)
    return convList
  }

  const openConversation = async (conv: any) => {
    const currentUser = user
    if (!currentUser) {
      sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
        url: window.location.pathname + window.location.search,
        state: {}
      }))
      window.location.href = '/auth?mode=login'
      return
    }

    setActiveConv(conv)

    const key = `${conv.ad_id}__${conv.other_id}`
    readConvsRef.current.add(key)

    // Charger les messages
    let query = supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${currentUser.id},receiver_id.eq.${conv.other_id}),` +
        `and(sender_id.eq.${conv.other_id},receiver_id.eq.${currentUser.id})`
      )
      .order('created_at', { ascending: true })

    query = conv.ad_id ? query.eq('ad_id', conv.ad_id) : query.is('ad_id', null)

    const { data: updatedData } = await query
    const loadedMessages = updatedData || []
    await markConversationAsRead(loadedMessages)
    setMessages(loadedMessages.map((m: any) =>
      m.receiver_id === currentUser.id ? { ...m, is_read: true } : m
    ))

    // ✅ Reset badge local
    setConversations(prev => prev.map(c =>
      sameConversation(c, conv) ? { ...c, unread: 0 } : c
    ))
  }

  const markAsRead = async (userId: string) => {
    if (!activeConv) return
    await markConversationAsRead(messages)
    setMessages(prev => prev.map((m: any) =>
      m.receiver_id === userId ? { ...m, is_read: true, read_at: m.read_at || new Date().toISOString() } : m
    ))
    setConversations(prev => prev.map(c =>
      sameConversation(c, activeConv) ? { ...c, unread: 0 } : c
    ))
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConv || !user) return
    setSending(true)
    const msg = {
      ad_id: activeConv.ad_id || null,
      sender_id: user.id,
      receiver_id: activeConv.other_id,
      sender_email: user.email,
      receiver_email: activeConv.other_email || '',
      content: newMessage.trim(),
      is_read: false,
    }
    const { data } = await supabase.from('messages').insert([msg]).select().single()
    if (data) setMessages(prev => [...prev, data])
    setNewMessage('')
    setSending(false)
    await loadConversations(user)
  }

  const handleKeyDown = (e: any) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    if (diff < 60000) return 'À l instant'
    if (diff < 3600000) return Math.floor(diff / 60000) + ' min'
    if (diff < 86400000) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })
  }

  const extractLink = (text: string) => {
    return text.split(/(https:\/\/sokodeal\.app\/annonce\/[a-zA-Z0-9-]+)/)
  }

  const getDisplayName = (conv: any) => {
    if (conv.other_user?.username) return '@' + conv.other_user.username
    if (conv.other_user?.full_name) return conv.other_user.full_name
    return conv.other_email || 'Utilisateur'
  }

  function sameConversation(a: any, b: any) {
    return a?.other_id === b?.other_id && (a?.ad_id || null) === (b?.ad_id || null)
  }

  function notifyMessagesRead() {
    window.dispatchEvent(new Event('sokodeal:messages-read'))
  }

  function getLastReadOwnMessageId() {
    const lastReadOwnMessage = [...messages]
      .reverse()
      .find((m: any) => m.sender_id === user?.id && m.read_at)
    return lastReadOwnMessage?.id || null
  }

  async function markConversationAsRead(conversationMessages: any[]) {
    if (!session) return false

    const messageIds = conversationMessages
      .filter((m: any) => m.receiver_id === session.user.id && !m.is_read)
      .map((m: any) => m.id)

    if (messageIds.length === 0) {
      notifyMessagesRead()
      return true
    }

    const res = await fetch('/api/messages/read', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ message_ids: messageIds }),
    })

    if (res.ok) notifyMessagesRead()
    else console.error('Erreur marquage messages lus', await res.text())
    return res.ok
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--sd-bg)' }}>
      <p style={{ fontFamily: 'Syne,sans-serif', color: '#1a7a4a', fontWeight: 700 }}>⏳ Chargement...</p>
    </div>
  )

  if (loadError) return (
    <div className="messages-page" style={{ minHeight: '100vh', background: 'var(--sd-bg)', display: 'flex', flexDirection: 'column' }}>
      <style>{`.messages-page .sd-header__icon-button, .messages-page .sd-header__logout-button { display: none; }`}</style>
      <Header />
      <div className="sd-page" style={{ maxWidth: '520px', width: '100%', margin: '80px auto', textAlign: 'center' }}>
        <p style={{ fontFamily: 'Syne,sans-serif', color: '#1a7a4a', fontWeight: 700 }}>{loadError}</p>
      </div>
    </div>
  )

  return (
    <div className="messages-page" style={{ minHeight: '100vh', background: 'var(--sd-bg)', display: 'flex', flexDirection: 'column' }}>
      <style>{`
        .messages-page .sd-header__icon-button { display: none; }
        .messages-page .sd-header__logout-button { display: none; }
        .messages-shell { display: flex; flex-direction: column; min-height: calc(100dvh - var(--sd-header-height)); }
        @media (max-width: 768px) {
          .msg-layout { grid-template-columns: 1fr !important; }
          .conv-panel { display: ${activeConv ? 'none' : 'flex'} !important; }
          .chat-panel { display: ${activeConv ? 'flex' : 'none'} !important; }
          .messages-shell { min-height: 0; }
        }
        .conv-item:hover { background: #f0f4f1 !important; }
        textarea:focus { border-color: #1a7a4a !important; outline: none; }
      `}</style>

      <Header />

      <AppShell maxWidth="desktop" withBottomNav className="messages-shell">
        <h1 style={{ fontFamily: 'Syne,sans-serif', fontWeight: 800, fontSize: '1.3rem', marginBottom: '16px', color: '#111a14' }}>
          Messages
        </h1>

        <div className="msg-layout" style={{ display: 'grid', gridTemplateColumns: '300px 1fr', gap: '16px', flex: 1, minHeight: '600px' }}>

          {/* LISTE CONVERSATIONS */}
          <div className="conv-panel" style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8ede9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f4f1' }}>
              <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.88rem', color: '#111a14' }}>
                Conversations {conversations.length > 0 && <span style={{ background: '#f5f7f5', padding: '1px 8px', borderRadius: '10px', fontSize: '0.75rem', color: '#6b7c6e' }}>{conversations.length}</span>}
              </p>
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {conversations.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7c6e' }}>
                  <div style={{ fontSize: '2rem', marginBottom: '8px' }}>💬</div>
                  <p style={{ fontSize: '0.85rem' }}>Aucune conversation</p>
                </div>
              ) : conversations.map((conv, i) => (
                <div key={i} className="conv-item" onClick={() => openConversation(conv)}
                  style={{ padding: '14px 16px', cursor: 'pointer', borderBottom: '1px solid #f0f4f1', background: activeConv?.other_id === conv.other_id && activeConv?.ad_id === conv.ad_id ? '#f0f4f1' : 'white', transition: 'background 0.15s' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {conv.other_user?.username ? (
                    <Link href={`/u/${conv.other_user.username}`} onClick={e => e.stopPropagation()} style={{textDecoration:'none', flexShrink:0}}>
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#1a7a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: 'white', fontFamily: 'Syne,sans-serif', flexShrink: 0 }}>
                      {(conv.other_user?.username || conv.other_user?.full_name || conv.other_email || 'U')[0].toUpperCase()}
                    </div>
                    </Link>
                    ) : (
                    <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: '#1a7a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: 'white', fontFamily: 'Syne,sans-serif', flexShrink: 0 }}>
                      {(conv.other_user?.username || conv.other_user?.full_name || conv.other_email || 'U')[0].toUpperCase()}
                    </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                        {conv.other_user?.username ? (
                        <Link href={`/u/${conv.other_user.username}`} onClick={e => e.stopPropagation()} style={{ fontFamily: 'Syne,sans-serif', fontWeight: conv.unread > 0 ? 800 : 700, fontSize: '0.85rem', color: '#111a14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', textDecoration:'none' }}>
                          {getDisplayName(conv)}
                        </Link>
                        ) : (
                        <span style={{ fontFamily: 'Syne,sans-serif', fontWeight: conv.unread > 0 ? 800 : 700, fontSize: '0.85rem', color: '#111a14', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                          {getDisplayName(conv)}
                        </span>
                        )}
                        <span style={{ fontSize: '0.68rem', color: '#9ca3af', flexShrink: 0 }}>{formatTime(conv.last_date)}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.73rem', color: '#6b7c6e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px' }}>
                          {conv.ad?.title ? '📦 ' + conv.ad.title : '💬 Message direct'}
                        </span>
                        {conv.unread > 0 && (
                          <span style={{ background: '#e63946', color: 'white', borderRadius: '50%', width: '18px', height: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 800, flexShrink: 0 }}>
                            {conv.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CHAT */}
          <div className="chat-panel" style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8ede9', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {!activeConv ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7c6e', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '3rem' }}>💬</div>
                <p style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.95rem' }}>Sélectionne une conversation</p>
              </div>
            ) : (
              <>
                <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f4f1', display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#1a7a4a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem', fontWeight: 800, color: 'white', fontFamily: 'Syne,sans-serif', flexShrink: 0 }}>
                    {(activeConv.other_user?.username || activeConv.other_user?.full_name || activeConv.other_email || 'U')[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.92rem', color: '#111a14' }}>
                      {getDisplayName(activeConv)}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#6b7c6e', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {activeConv.ad?.title ? '📦 ' + activeConv.ad.title : '💬 Message direct'}
                    </div>
                  </div>
                  {activeConv.ad_id && (
                    <a href={'/annonce/' + activeConv.ad_id} style={{ padding: '5px 10px', background: '#f5f7f5', border: '1px solid #e8ede9', borderRadius: '7px', fontSize: '0.72rem', fontWeight: 600, color: '#1a7a4a', textDecoration: 'none', flexShrink: 0 }}>
                      Voir l'annonce →
                    </a>
                  )}
                </div>

                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {messages.length === 0 && (
                    <div style={{ textAlign: 'center', color: '#9ca3af', fontSize: '0.82rem', marginTop: '40px' }}>
                      Commencez la conversation !
                    </div>
                  )}
                  {messages.map((msg, i) => {
                    const isMe = msg.sender_id === user.id
                    const showSeen = isMe && msg.id === getLastReadOwnMessageId()
                    const parts = extractLink(msg.content)
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start' }}>
                        <div style={{
                          maxWidth: '72%', padding: '10px 14px',
                          borderRadius: isMe ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                          background: isMe ? '#1a7a4a' : '#f5f7f5',
                          color: isMe ? 'white' : '#111a14',
                          fontSize: '0.88rem', lineHeight: 1.5,
                          border: isMe ? 'none' : '1px solid #e8ede9'
                        }}>
                          {parts.map((part, j) =>
                            part.startsWith('https://sokodeal.app/annonce/') ? (
                              <a key={j} href={part} style={{ color: isMe ? '#a7f3d0' : '#1a7a4a', fontWeight: 600, display: 'block', marginTop: '4px', fontSize: '0.8rem' }}>
                                🔗 Voir l'annonce →
                              </a>
                            ) : (
                              <span key={j}>{part}</span>
                            )
                          )}
                          <div style={{ fontSize: '0.65rem', marginTop: '4px', opacity: 0.6, textAlign: 'right' }}>
                            {formatTime(msg.created_at)} {isMe && (msg.is_read ? '✓✓' : '✓')}
                          </div>
                        </div>
                        {showSeen && (
                          <div style={{fontSize:'0.65rem', color:'#9ca3af', textAlign:'right', marginTop:'2px', paddingRight:'4px'}}>
                            Vu à {new Date(msg.read_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div ref={bottomRef} />
                </div>

                <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f4f1', display: 'flex', gap: '10px', alignItems: 'flex-end' }}>
                  <textarea
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Écrire un message... (Entrée pour envoyer)"
                    rows={1}
                    style={{ flex: 1, padding: '10px 13px', border: '1px solid #e8ede9', borderRadius: '10px', fontFamily: 'DM Sans,sans-serif', fontSize: '0.88rem', resize: 'none', background: '#fafaf9', color: '#111a14', transition: 'border-color 0.2s' }}
                  />
                  <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
                    style={{ padding: '10px 18px', background: sending || !newMessage.trim() ? '#e8ede9' : '#1a7a4a', border: 'none', borderRadius: '10px', color: sending || !newMessage.trim() ? '#6b7c6e' : 'white', fontFamily: 'Syne,sans-serif', fontWeight: 700, fontSize: '0.88rem', cursor: sending || !newMessage.trim() ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                    {sending ? '⏳' : 'Envoyer'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </AppShell>
    </div>
  )
}
