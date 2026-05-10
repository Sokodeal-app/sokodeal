import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0)
  const { user, loading: authLoading } = useAuth()

  const loadCount = useCallback(async (uid: string) => {
    const { count, error } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', uid)
      .eq('is_read', false)

    if (error) {
      console.error('useUnreadCount error:', error)
      return
    }

    setUnreadCount(count || 0)
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setUnreadCount(0)
      return
    }

    let cancelled = false
    let channel: ReturnType<typeof supabase.channel> | null = null
    let broadcastChannel: ReturnType<typeof supabase.channel> | null = null

    const refreshUnreadCount = () => {
      loadCount(user.id)
    }

    const init = async () => {
      await loadCount(user.id)
      if (cancelled) return

      const suffix = `${user.id.slice(0, 8)}-${Date.now()}-${Math.random().toString(36).slice(2)}`

      channel = supabase
        .channel('unread-' + suffix)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: 'receiver_id=eq.' + user.id,
        }, () => {
          setUnreadCount((count) => count + 1)
        })
      channel.subscribe()

      broadcastChannel = supabase
        .channel('unread-realtime-' + suffix)
        .on('broadcast', { event: 'messages_read' }, () => {
          refreshUnreadCount()
        })
      broadcastChannel.subscribe()
    }

    init()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
      if (broadcastChannel) supabase.removeChannel(broadcastChannel)
    }
  }, [authLoading, loadCount, user])

  return { unreadCount, resetCount: () => setUnreadCount(0) }
}
