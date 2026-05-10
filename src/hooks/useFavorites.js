// hooks/useFavorites.js
import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/components/AuthProvider'

/**
 * Hook pour gérer les favoris de l'utilisateur connecté.
 * 
 * Usage:
 *   const { favorites, isFavorite, toggleFavorite, loading } = useFavorites()
 */
export function useFavorites() {
  const [favorites, setFavorites] = useState([]) // liste des ad_id favoris
  const [loading, setLoading] = useState(true)
  const { user, loading: authLoading } = useAuth()
  const userId = user?.id ?? null

  // Récupérer l'utilisateur connecté
  // Charger les favoris quand l'utilisateur est connu
  useEffect(() => {
    if (authLoading) return

    if (!userId) {
      setFavorites([])
      setLoading(false)
      return
    }

    const fetchFavorites = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('favorites')
        .select('ad_id')
        .eq('user_id', userId)

      if (!error && data) {
        setFavorites(data.map((f) => f.ad_id))
      }
      setLoading(false)
    }

    fetchFavorites()
  }, [authLoading, userId])

  // Vérifier si une annonce est en favori
  const isFavorite = useCallback(
    (adId) => favorites.includes(adId),
    [favorites]
  )

  // Ajouter ou retirer un favori
  const toggleFavorite = useCallback(
    async (adId) => {
      if (!userId) {
        // L'utilisateur n'est pas connecté — à gérer dans l'UI (ex: ouvrir modal login)
        return { error: 'not_authenticated' }
      }

      const already = favorites.includes(adId)

      // Optimistic update immédiat
      setFavorites((prev) =>
        already ? prev.filter((id) => id !== adId) : [...prev, adId]
      )

      if (already) {
        // Supprimer le favori
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', userId)
          .eq('ad_id', adId)

        if (error) {
          // Rollback si erreur
          setFavorites((prev) => [...prev, adId])
          return { error }
        }
      } else {
        // Ajouter le favori
        const { error } = await supabase
          .from('favorites')
          .insert({ user_id: userId, ad_id: adId })

        if (error) {
          // Rollback si erreur
          setFavorites((prev) => prev.filter((id) => id !== adId))
          return { error }
        }
      }

      return { error: null }
    },
    [userId, favorites]
  )

  return { favorites, isFavorite, toggleFavorite, loading, userId }
}
