import { useCallback, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'

export function useUnreadCount() {
  const [unreadCount, setUnreadCount] = useState(0)

  const loadCount = useCallback(async (uid: string) => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('receiver_id', uid)
      .eq('is_read', false)

    setUnreadCount(count || 0)
  }, [])

  useEffect(() => {
    let cancelled = false
    let userId: string | null = null
    let channel: ReturnType<typeof supabase.channel> | null = null
    let broadcastChannel: ReturnType<typeof supabase.channel> | null = null
    let interval: ReturnType<typeof setInterval> | null = null

    const refreshUnreadCount = () => {
      setUnreadCount(0)
      if (userId) setTimeout(() => loadCount(userId!), 300)
    }

    const init = async () => {
      const { data: { user } } = await getCurrentUser()
      if (!user || cancelled) return

      userId = user.id
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

      window.addEventListener('sokodeal:messages-read', refreshUnreadCount)

      interval = setInterval(() => {
        if (userId) loadCount(userId)
      }, 10000)
    }

    init()

    return () => {
      cancelled = true
      if (channel) supabase.removeChannel(channel)
      if (broadcastChannel) supabase.removeChannel(broadcastChannel)
      if (interval) clearInterval(interval)
      window.removeEventListener('sokodeal:messages-read', refreshUnreadCount)
    }
  }, [loadCount])

  return { unreadCount, resetCount: () => setUnreadCount(0) }
}
