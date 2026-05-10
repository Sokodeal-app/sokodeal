'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import FavoriteButton from '@/components/FavoriteButton'
import { supabase } from '@/lib/supabase'
import { getCurrentUser } from '@/lib/auth'
import { FEATURE_FLAGS } from '@/lib/feature-flags'
import { generateSlug } from '@/lib/slug'
import ImageCropModal from '@/components/ImageCropModal'

const catLabel: Record<string, string> = {
  'immo-vente': 'Immo',
  'immo-location': 'Location',
  'immo-terrain': 'Terrain',
  voiture: 'Voiture',
  moto: 'Moto',
  vehicule: 'Vehicule',
  electronique: 'Tech',
  tech: 'Tech',
  mode: 'Vetements',
  maison: 'Maison',
  emploi: 'Emploi',
  services: 'Service',
  'emploi-service': 'Service',
  animaux: 'Animaux',
  agriculture: 'Agriculture',
  materiaux: 'Materiaux',
  fourniture: 'Fourniture',
  sante: 'Sante',
  sport: 'Sport',
  education: 'Education',
  divers: 'Divers',
}

export default function PublicProfile() {
  const { username } = useParams()
  const router = useRouter()
  const [profile, setProfile] = useState<any>(null)
  const [ads, setAds] = useState<any[]>([])
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isOwner, setIsOwner] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editForm, setEditForm] = useState({ bio: '', location: '' })
  const [savingProfile, setSavingProfile] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const [bannerMsg, setBannerMsg] = useState('')
  const [pendingBannerFile, setPendingBannerFile] = useState<File | null>(null)
  const [bannerCropFile, setBannerCropFile] = useState<File | null>(null)
  const [pendingBannerUrl, setPendingBannerUrl] = useState('')
  const [editMsg, setEditMsg] = useState('')
  const [showReviewForm, setShowReviewForm] = useState(false)
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: '' })
  const [submittingReview, setSubmittingReview] = useState(false)
  const [reviewMsg, setReviewMsg] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState('')
  const [alreadyReviewed, setAlreadyReviewed] = useState(false)
  const [currentUserReview, setCurrentUserReview] = useState<any>(null)

  const loadSellerReviews = async (sellerId: string) => {
    const { data: rawReviews, error } = await supabase
      .from('reviews')
      .select('id, reviewer_id, seller_id, rating, comment, created_at')
      .eq('seller_id', sellerId)
      .order('created_at', { ascending: false })

    if (error || !rawReviews) return []

    const reviewerIds = Array.from(new Set(rawReviews.map((review: any) => review.reviewer_id).filter(Boolean)))
    if (reviewerIds.length === 0) return rawReviews

    const { data: reviewers } = await supabase
      .from('users')
      .select('id, username, full_name')
      .in('id', reviewerIds)

    const reviewersById = new Map((reviewers || []).map((reviewer: any) => [reviewer.id, reviewer]))
    return rawReviews.map((review: any) => ({
      ...review,
      reviewer: reviewersById.get(review.reviewer_id) || null,
    }))
  }

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { user } } = await getCurrentUser()
        setCurrentUser(user)

        const publicUserFields = 'id, username, full_name, is_verified, created_at, bio, banner_url, location'
        const usernameValue = String(username || '')
        const { data: usernameMatch } = await supabase
          .from('users')
          .select(publicUserFields)
          .eq('username', usernameValue)
          .single()
        const isUuidParam = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(usernameValue)
        const { data: idMatch } = !usernameMatch && isUuidParam
          ? await supabase
            .from('users')
            .select(publicUserFields)
            .eq('id', usernameValue)
            .single()
          : { data: null }
        const userData = usernameMatch || idMatch

        if (!userData) return

        setProfile(userData)
        setEditForm({ bio: userData.bio || '', location: userData.location || '' })
        setIsOwner(!!user && user.id === userData.id)
        const [{ data: adsData }, reviewsData] = await Promise.all([
          supabase
            .from('ads')
            .select('id, title, price, images, province, category, created_at, is_sold, is_boosted')
            .eq('user_id', userData.id)
            .eq('is_active', true)
            .order('created_at', { ascending: false }),
          loadSellerReviews(userData.id),
        ])

        if (adsData) setAds(adsData)
        if (reviewsData) {
          setReviews(reviewsData)
          const userReview = user ? reviewsData.find((r: any) => r.reviewer_id === user.id) : null
          setAlreadyReviewed(!!userReview)
          setCurrentUserReview(userReview || null)
        }
      } catch (err) {
        console.error('public profile init error:', err)
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [username])

  useEffect(() => {
    if (!loading) return
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 8000)
    return () => clearTimeout(timeout)
  }, [loading])

  const avgRating = useMemo(() => {
    if (reviews.length === 0) return null
    return (reviews.reduce((sum, r) => sum + Number(r.rating || 0), 0) / reviews.length).toFixed(1)
  }, [reviews])
  const avgRatingNumber = avgRating ? Number(avgRating) : 0
  const ratingStars = (rating: number) => '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating))

  const displayName = profile?.full_name || profile?.username || 'Utilisateur'
  const initial = (displayName || 'U').charAt(0).toUpperCase()
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
    : ''
  const activeAds = ads.filter((ad) => !ad.is_sold)
  const soldAds = ads.filter((ad) => ad.is_sold)
  const bestAds = ads.slice(0, 3)

  const handleBannerFileSelect = (e: any) => {
    const file = e.target.files?.[0]
    if (!file || !currentUser) return
    e.target.value = ''
    setBannerCropFile(file)
  }

  const handleBannerCropConfirm = (croppedFile: File) => {
    if (pendingBannerUrl) URL.revokeObjectURL(pendingBannerUrl)

    setPendingBannerFile(croppedFile)
    setPendingBannerUrl(URL.createObjectURL(croppedFile))
    setBannerMsg('')
    setBannerCropFile(null)
  }

  const confirmBannerUpload = async () => {
    if (!pendingBannerFile || !currentUser) return

    setUploadingBanner(true)
    setBannerMsg('Envoi de la banniere...')
    const ext = pendingBannerFile.name.split('.').pop()
    const fileName = `banners/${currentUser.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buckets = ['ads-images', 'annonces']
    let publicUrl = ''
    let uploadError = ''

    for (const bucket of buckets) {
      const { error } = await supabase.storage.from(bucket).upload(fileName, pendingBannerFile)
      if (!error) {
        const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(fileName)
        publicUrl = urlData.publicUrl
        break
      }
      uploadError = error.message
    }

    if (!publicUrl) {
      setBannerMsg(uploadError || 'Impossible d envoyer cette image.')
      setUploadingBanner(false)
      return
    }

    const { error: updateError } = await supabase
      .from('users')
      .update({ banner_url: publicUrl })
      .eq('id', currentUser.id)

    if (updateError) {
      setBannerMsg(updateError.message)
    } else {
      setProfile({ ...profile, banner_url: publicUrl })
      setBannerMsg('Banniere mise a jour')
      setPendingBannerFile(null)
      if (pendingBannerUrl) URL.revokeObjectURL(pendingBannerUrl)
      setPendingBannerUrl('')
      setTimeout(() => setBannerMsg(''), 3000)
    }

    setUploadingBanner(false)
  }

  const cancelBannerPreview = () => {
    if (pendingBannerUrl) URL.revokeObjectURL(pendingBannerUrl)
    setPendingBannerFile(null)
    setPendingBannerUrl('')
    setBannerMsg('')
  }

  const handleSaveProfile = async () => {
    if (!currentUser) return

    setSavingProfile(true)
    const { error } = await supabase
      .from('users')
      .update({ bio: editForm.bio, location: editForm.location })
      .eq('id', currentUser.id)
    setSavingProfile(false)

    if (error) {
      setEditMsg(error.message)
      return
    }

    setProfile({ ...profile, bio: editForm.bio, location: editForm.location })
    setEditMsg('Profil mis a jour')
    setEditMode(false)
    setTimeout(() => setEditMsg(''), 3000)
  }

  const handleSubmitReview = async () => {
    if (!currentUser) {
      sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
        url: window.location.pathname,
        state: {}
      }))
      router.push('/auth?mode=login')
      return
    }
    if (isOwner) {
      setReviewMsg('Vous ne pouvez pas laisser un avis sur votre propre profil.')
      return
    }
    if (!reviewForm.comment.trim()) {
      setReviewMsg('Ajoutez un commentaire')
      return
    }

    setSubmittingReview(true)
    setReviewMsg('')
    setReviewSuccess('')
    const reviewPayload = {
      rating: reviewForm.rating,
      comment: reviewForm.comment.trim(),
    }
    const reviewRequest = currentUserReview
      ? supabase
        .from('reviews')
        .update(reviewPayload)
        .eq('id', currentUserReview.id)
        .eq('reviewer_id', currentUser.id)
        .select('id, reviewer_id, seller_id, rating, comment, created_at')
        .single()
      : supabase.from('reviews').insert([{
        reviewer_id: currentUser.id,
        seller_id: profile.id,
        ...reviewPayload,
      }]).select('id, reviewer_id, seller_id, rating, comment, created_at').single()

    const { data: savedReview, error } = await reviewRequest
    setSubmittingReview(false)

    if (error) {
      setReviewMsg(error.message)
      return
    }

    const reviewsData = await loadSellerReviews(profile.id)

    if (reviewsData.length > 0) {
      setReviews(reviewsData)
      const userReview = reviewsData.find((r: any) => r.reviewer_id === currentUser.id)
      setCurrentUserReview(userReview || null)
    } else if (savedReview) {
      const hydratedReview = {
        ...savedReview,
        reviewer: {
          username: currentUser.user_metadata?.username || 'Utilisateur',
          full_name: currentUser.user_metadata?.full_name || '',
        },
      }
      setReviews((prev) => currentUserReview
        ? prev.map((review) => review.id === currentUserReview.id ? hydratedReview : review)
        : [hydratedReview, ...prev])
      setCurrentUserReview(hydratedReview)
    }
    setAlreadyReviewed(true)
    setShowReviewForm(false)
    setReviewForm({ rating: 5, comment: '' })
    setReviewMsg('')
    setReviewSuccess(currentUserReview ? 'Avis mis a jour avec succes' : 'Avis publie avec succes')
    setTimeout(() => setReviewSuccess(''), 3000)
  }

  const openReviewForm = () => {
    if (!currentUser) {
      sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
        url: window.location.pathname,
        state: {}
      }))
      router.push('/auth?mode=login')
      return
    }
    if (isOwner) {
      setReviewMsg('Vous ne pouvez pas laisser un avis sur votre propre profil.')
      return
    }
    setReviewMsg('')
    setReviewSuccess('')
    if (currentUserReview) {
      setReviewForm({
        rating: Number(currentUserReview.rating || 5),
        comment: currentUserReview.comment || '',
      })
    }
    setShowReviewForm(true)
  }

  if (loading) {
    return (
      <div className="profile-page center-page">
        <p className="loading-text">Chargement...</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="profile-page center-page">
        <div className="empty-card">
          <h2>Profil introuvable</h2>
          <p>@{username} n'existe pas sur SokoDeal.</p>
          <a href="/">Retour a l'accueil</a>
        </div>
      </div>
    )
  }

  return (
    <div className="profile-page">
      {bannerCropFile && (
        <ImageCropModal
          file={bannerCropFile}
          aspect={3 / 1}
          onConfirm={handleBannerCropConfirm}
          onCancel={() => setBannerCropFile(null)}
        />
      )}
      <style>{`
        .profile-page {
          min-height: 100vh;
          background: #f4f6f2;
          color: #111a14;
          font-family: 'DM Sans', sans-serif;
        }
        .center-page {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }
        .loading-text {
          color: #1a7a4a;
          font-family: 'Syne', sans-serif;
          font-weight: 800;
        }
        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          border-bottom: 1px solid #e5ebe6;
          background: rgba(255,255,255,0.94);
          backdrop-filter: blur(12px);
        }
        .topbar-inner {
          max-width: 1120px;
          margin: 0 auto;
          height: 60px;
          padding: 0 5%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #111a14;
          text-decoration: none;
          font-family: 'Syne', sans-serif;
          font-weight: 900;
          font-size: 1.15rem;
        }
        .brand-mark {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          background: #f5a623;
          display: grid;
          place-items: center;
          color: #111a14;
          font-size: 0.8rem;
          font-weight: 900;
        }
        .topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .btn {
          border: 1px solid transparent;
          border-radius: 9px;
          padding: 9px 15px;
          font-family: 'Syne', sans-serif;
          font-size: 0.82rem;
          font-weight: 800;
          cursor: pointer;
          text-decoration: none;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          white-space: nowrap;
        }
        .btn-primary {
          background: #1a7a4a;
          color: #fff;
        }
        .btn-gold {
          background: #f5a623;
          color: #111a14;
        }
        .btn-soft {
          background: #fff;
          color: #111a14;
          border-color: #e5ebe6;
        }
        .btn-danger {
          background: #fff1f0;
          border-color: #ffd6d6;
          color: #c0392b;
        }
        .hero {
          position: relative;
          height: 290px;
          min-height: 290px;
          max-height: 290px;
          overflow: hidden;
          background: #0f5233;
          touch-action: none;
          user-select: none;
        }
        .hero img,
        .hero-fallback {
          width: 100%;
          height: 100%;
          min-height: 290px;
          max-height: 290px;
          object-fit: cover;
          display: block;
        }
        .hero-fallback {
          background:
            radial-gradient(circle at 20% 20%, rgba(245,166,35,0.36), transparent 32%),
            linear-gradient(135deg, #0f5233 0%, #1a7a4a 54%, #f5a623 140%);
        }
        .hero::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.58));
        }
        .banner-edit {
          position: absolute;
          right: 5%;
          top: 18px;
          z-index: 2;
          opacity: 1;
          cursor: pointer;
          transition: transform 0.2s;
        }
        .banner-edit:hover {
          transform: translateY(-1px);
        }
        .banner-edit span {
          padding: 8px 12px;
          border-radius: 10px;
          color: #fff;
          border: 1px solid rgba(255,255,255,0.5);
          background: rgba(17,26,20,0.62);
          font-family: 'Syne', sans-serif;
          font-weight: 800;
          font-size: 0.78rem;
          box-shadow: 0 10px 28px rgba(0,0,0,0.18);
          backdrop-filter: blur(8px);
        }
        .banner-message {
          position: absolute;
          left: 5%;
          bottom: 24px;
          z-index: 2;
          max-width: 420px;
          border-radius: 10px;
          border: 1px solid rgba(255,255,255,0.34);
          background: rgba(17,26,20,0.62);
          color: #fff;
          padding: 10px 14px;
          font-size: 0.82rem;
          font-weight: 800;
          backdrop-filter: blur(8px);
        }
        .banner-confirm-bar {
          position: absolute;
          right: 5%;
          top: 62px;
          z-index: 2;
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          justify-content: flex-end;
          max-width: 420px;
        }
        .banner-confirm-btn {
          border: 1px solid rgba(255,255,255,0.42);
          border-radius: 999px;
          background: rgba(17,26,20,0.58);
          color: #fff;
          padding: 6px 9px;
          font-size: 0.7rem;
          font-weight: 900;
          cursor: pointer;
          backdrop-filter: blur(8px);
        }
        .banner-confirm-btn.primary {
          background: #f5a623;
          border-color: #f5a623;
          color: #111a14;
        }
        .shell {
          max-width: 1120px;
          margin: -96px auto 0;
          padding: 0 5% 48px;
          position: relative;
          z-index: 5;
        }
        .profile-card {
          background: #fff;
          border: 1px solid #e5ebe6;
          border-radius: 18px;
          box-shadow: 0 18px 50px rgba(17,26,20,0.12);
          padding: 24px;
        }
        .profile-head {
          display: grid;
          grid-template-columns: auto 1fr auto;
          align-items: center;
          gap: 18px;
        }
        .avatar {
          width: 104px;
          height: 104px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          border: 5px solid #fff;
          background: linear-gradient(145deg, #1a7a4a, #0f5233);
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-size: 2.2rem;
          font-weight: 900;
          box-shadow: 0 10px 30px rgba(17,26,20,0.22);
        }
        .profile-title h1 {
          margin: 0;
          font-family: 'Syne', sans-serif;
          font-size: 1.65rem;
          line-height: 1.05;
          font-weight: 900;
        }
        .username-row {
          margin-top: 5px;
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          color: #6b7c6e;
          font-size: 0.9rem;
          font-weight: 700;
        }
        .verified-badge {
          background: #e8f5ee;
          color: #1a7a4a;
          padding: 3px 8px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 900;
        }
        .profile-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex-wrap: wrap;
        }
        .stats {
          margin-top: 22px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          border: 1px solid #e5ebe6;
          border-radius: 14px;
          overflow: hidden;
          background: #fbfcfa;
        }
        .stat {
          padding: 16px 12px;
          text-align: center;
          border-right: 1px solid #e5ebe6;
        }
        .stat:last-child {
          border-right: 0;
        }
        .stat strong {
          display: block;
          font-family: 'Syne', sans-serif;
          font-size: 1.12rem;
          color: #111a14;
        }
        .stat span {
          display: block;
          margin-top: 3px;
          color: #6b7c6e;
          font-size: 0.76rem;
          font-weight: 700;
        }
        .bio {
          margin: 18px 0 0;
          color: #35433a;
          line-height: 1.58;
          max-width: 720px;
          font-size: 0.95rem;
        }
        .bio-edit {
          margin-top: 18px;
          max-width: 720px;
        }
        .bio-edit .textarea {
          min-height: 96px;
          background: #fff;
          border-color: #b7dfca;
          box-shadow: 0 0 0 3px rgba(26,122,74,0.08);
        }
        .bio-count {
          margin-top: 5px;
          color: #9aa49d;
          font-size: 0.72rem;
          font-weight: 700;
          text-align: right;
        }
        .location-label {
          margin-top: 12px;
        }
        .edit-msg {
          display: inline-block;
          margin: 12px 0 0;
        }
        .save-profile-btn {
          margin-top: 12px;
        }
        .edit-hint {
          margin: 0;
          color: #6b7c6e;
          font-size: 0.84rem;
          line-height: 1.5;
        }
        .meta-row {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 14px;
        }
        .chip {
          padding: 7px 10px;
          border-radius: 999px;
          background: #f4f6f2;
          border: 1px solid #e5ebe6;
          color: #526156;
          font-size: 0.78rem;
          font-weight: 700;
        }
        .edit-box {
          margin-top: 20px;
          padding-top: 20px;
          border-top: 1px solid #e5ebe6;
        }
        .field-label {
          display: block;
          margin-bottom: 6px;
          color: #6b7c6e;
          text-transform: uppercase;
          font-size: 0.72rem;
          font-weight: 900;
        }
        .input,
        .textarea {
          width: 100%;
          box-sizing: border-box;
          border: 1px solid #e5ebe6;
          border-radius: 10px;
          background: #fbfcfa;
          color: #111a14;
          padding: 11px 12px;
          outline: none;
          font: inherit;
        }
        .textarea {
          resize: vertical;
          min-height: 86px;
        }
        .form-grid {
          display: grid;
          gap: 12px;
        }
        .section-head {
          margin: 28px 0 14px;
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: 16px;
        }
        .section-head h2 {
          margin: 0;
          font-family: 'Syne', sans-serif;
          font-weight: 900;
          font-size: 1.12rem;
        }
        .section-head p {
          margin: 4px 0 0;
          color: #6b7c6e;
          font-size: 0.86rem;
        }
        .feature-strip {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-top: 18px;
        }
        .feature-card {
          position: relative;
          overflow: hidden;
          min-height: 138px;
          border-radius: 14px;
          background: #111a14;
          color: #fff;
          cursor: pointer;
        }
        .feature-card img {
          width: 100%;
          height: 100%;
          min-height: 138px;
          object-fit: cover;
          opacity: 0.82;
          transition: transform 0.22s;
        }
        .feature-card:hover img {
          transform: scale(1.04);
        }
        .feature-card-info {
          position: absolute;
          inset: auto 0 0 0;
          padding: 34px 12px 12px;
          background: linear-gradient(180deg, transparent, rgba(0,0,0,0.76));
        }
        .feature-card-info strong {
          display: block;
          font-family: 'Syne', sans-serif;
          font-size: 0.9rem;
          line-height: 1.15;
        }
        .feature-card-info span {
          display: block;
          margin-top: 3px;
          font-size: 0.76rem;
          font-weight: 800;
          color: #f5a623;
        }
        .ads-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }
        .ad-card {
          overflow: hidden;
          border: 1px solid #e5ebe6;
          border-radius: 14px;
          background: #fff;
          cursor: pointer;
          box-shadow: 0 1px 5px rgba(17,26,20,0.05);
          transition: transform 0.18s, box-shadow 0.18s;
        }
        .ad-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 28px rgba(17,26,20,0.1);
        }
        .ad-media {
          position: relative;
          aspect-ratio: 1 / 1;
          background: #eef3ee;
          overflow: hidden;
        }
        .ad-media img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          display: block;
        }
        .ad-placeholder {
          height: 100%;
          display: grid;
          place-items: center;
          color: #6b7c6e;
          font-family: 'Syne', sans-serif;
          font-size: 0.9rem;
          font-weight: 900;
          text-transform: uppercase;
        }
        .favorite-wrap {
          position: absolute;
          top: 9px;
          right: 9px;
        }
        .boost-badge {
          position: absolute;
          left: 9px;
          top: 9px;
          padding: 4px 8px;
          border-radius: 8px;
          background: #f5a623;
          color: #111a14;
          font-size: 0.66rem;
          font-weight: 900;
        }
        .ad-body {
          padding: 12px;
        }
        .ad-category {
          color: #1a7a4a;
          font-size: 0.68rem;
          font-weight: 900;
          text-transform: uppercase;
        }
        .ad-title {
          margin-top: 5px;
          color: #111a14;
          font-family: 'Syne', sans-serif;
          font-size: 0.9rem;
          font-weight: 800;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .ad-price {
          margin-top: 6px;
          color: #0f5233;
          font-family: 'Syne', sans-serif;
          font-size: 1rem;
          font-weight: 900;
        }
        .ad-city {
          margin-top: 5px;
          color: #6b7c6e;
          font-size: 0.74rem;
          font-weight: 700;
        }
        .reviews-list {
          display: grid;
          gap: 10px;
        }
        .review-summary {
          display: flex;
          align-items: center;
          gap: 14px;
          flex-wrap: wrap;
          margin-bottom: 14px;
          padding: 16px 18px;
          border: 1px solid #e5ebe6;
          border-radius: 14px;
          background: #fff;
        }
        .review-summary-score {
          font-family: 'Syne', sans-serif;
          font-size: 1.6rem;
          font-weight: 900;
          color: #111a14;
        }
        .review-stars {
          color: #f5a623;
          font-size: 1.1rem;
          letter-spacing: 1px;
          line-height: 1;
        }
        .review-stars.muted {
          color: #cfd6d0;
        }
        .review-summary-copy {
          color: #6b7c6e;
          font-size: 0.86rem;
          font-weight: 700;
        }
        .review-empty {
          background: #fff;
          border: 1px solid #e5ebe6;
          border-radius: 14px;
          padding: 34px 20px;
          text-align: center;
        }
        .review-empty h3 {
          margin: 10px 0 6px;
          font-family: 'Syne', sans-serif;
          font-weight: 900;
          color: #111a14;
        }
        .review-empty p {
          margin: 0 auto 18px;
          max-width: 420px;
          color: #6b7c6e;
          line-height: 1.55;
          font-size: 0.9rem;
        }
        .review-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 120;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          background: rgba(17,26,20,0.5);
          backdrop-filter: blur(6px);
        }
        .review-modal {
          width: min(100%, 520px);
          border-radius: 18px;
          border: 1px solid #e5ebe6;
          background: #fff;
          box-shadow: 0 24px 80px rgba(17,26,20,0.22);
          padding: 22px;
        }
        .review-modal-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 18px;
        }
        .review-modal-head h3 {
          margin: 0;
          font-family: 'Syne', sans-serif;
          font-weight: 900;
          color: #111a14;
        }
        .review-modal-head p {
          margin: 4px 0 0;
          color: #6b7c6e;
          font-size: 0.86rem;
        }
        .review-close {
          width: 34px;
          height: 34px;
          border: 1px solid #e5ebe6;
          border-radius: 10px;
          background: #f4f6f2;
          color: #111a14;
          font-weight: 900;
          cursor: pointer;
        }
        .star-picker {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }
        .star-picker button {
          border: none;
          background: transparent;
          color: #cfd6d0;
          font-size: 2rem;
          line-height: 1;
          cursor: pointer;
          transition: transform 0.12s, color 0.12s;
        }
        .star-picker button.active,
        .star-picker button:hover {
          color: #f5a623;
          transform: translateY(-1px);
        }
        .review-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 14px;
        }
        .review-card,
        .empty-card {
          border: 1px solid #e5ebe6;
          border-radius: 14px;
          background: #fff;
          padding: 18px;
        }
        .review-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 10px;
        }
        .review-author {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .mini-avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          display: grid;
          place-items: center;
          background: #1a7a4a;
          color: #fff;
          font-family: 'Syne', sans-serif;
          font-weight: 900;
        }
        .review-card p,
        .empty-card p {
          margin: 0;
          color: #526156;
          line-height: 1.55;
          font-size: 0.9rem;
        }
        .empty-card {
          text-align: center;
          padding: 38px 20px;
        }
        .empty-card h2,
        .empty-card h3 {
          margin: 0 0 8px;
          font-family: 'Syne', sans-serif;
          font-weight: 900;
        }
        .empty-card a {
          display: inline-block;
          margin-top: 14px;
          color: #1a7a4a;
          font-weight: 900;
          text-decoration: none;
        }
        @media (max-width: 820px) {
          .hero,
          .hero img,
          .hero-fallback {
            height: 230px;
            min-height: 230px;
            max-height: 230px;
          }
          .shell {
            margin-top: -74px;
          }
          .profile-card {
            padding: 18px;
            border-radius: 15px;
          }
          .profile-head {
            grid-template-columns: auto 1fr;
            align-items: start;
          }
          .profile-actions {
            grid-column: 1 / -1;
            justify-content: stretch;
          }
          .profile-actions .btn {
            flex: 1;
          }
          .avatar {
            width: 86px;
            height: 86px;
            font-size: 1.8rem;
          }
          .profile-title h1 {
            font-size: 1.25rem;
          }
          .banner-edit,
          .banner-message {
            right: 4%;
            left: 4%;
            top: 12px;
          }
          .banner-edit {
            left: auto;
          }
          .banner-edit span {
            padding: 8px 10px;
            font-size: 0.74rem;
          }
          .banner-message {
            top: 52px;
            bottom: auto;
            max-width: none;
          }
          .banner-confirm-bar {
            top: 94px;
            right: 4%;
            left: 4%;
            max-width: none;
            justify-content: flex-end;
          }
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }
          .stat:nth-child(2) {
            border-right: 0;
          }
          .stat:nth-child(1),
          .stat:nth-child(2) {
            border-bottom: 1px solid #e5ebe6;
          }
          .feature-strip {
            grid-template-columns: 1fr;
          }
          .ads-grid {
            grid-template-columns: repeat(2, 1fr);
            gap: 8px;
          }
          .review-modal {
            padding: 18px;
          }
          .review-summary {
            align-items: flex-start;
          }
          .topbar-inner {
            padding: 0 4%;
          }
          .btn {
            padding: 8px 11px;
          }
        }
        @media (max-width: 430px) {
          .topbar-actions .btn-soft {
            display: none;
          }
          .shell {
            padding: 0 4% 36px;
          }
          .ad-body {
            padding: 9px;
          }
          .ad-title {
            font-size: 0.82rem;
          }
          .ad-price {
            font-size: 0.88rem;
          }
        }
      `}</style>

      <header className="topbar">
        <div className="topbar-inner">
          <Link href="/" className="brand">
            <span className="brand-mark">SD</span>
            Soko<span style={{ color: '#1a7a4a' }}>Deal</span>
          </Link>
          <div className="topbar-actions">
            {currentUser ? (
              <button className="btn btn-soft" onClick={() => router.push('/profil')}>Mon compte</button>
            ) : (
              <button className="btn btn-soft" onClick={() => router.push('/auth?mode=login')}>Connexion</button>
            )}
            <button className="btn btn-gold" onClick={() => router.push('/publier')}>Deposer</button>
          </div>
        </div>
      </header>

      <section className="hero"> 
        {pendingBannerUrl || profile.banner_url ? (
          <img src={pendingBannerUrl || profile.banner_url} alt="Banniere du profil" decoding="async" />
        ) : (
          <div className="hero-fallback" />
        )}

        {isOwner && (
          <label className="banner-edit">
            <span>{pendingBannerFile ? 'Choisir une autre photo' : 'Changer la banniere'}</span>
            <input type="file" accept="image/*" onChange={handleBannerFileSelect} disabled={uploadingBanner} style={{ display: 'none' }} />
          </label>
        )}
        {isOwner && pendingBannerFile && (
          <div className="banner-confirm-bar">
            <>
              <button
                type="button"
                className="banner-confirm-btn primary"
                onClick={confirmBannerUpload}
                disabled={uploadingBanner}
              >
                {uploadingBanner ? 'Envoi...' : 'Confirmer'}
              </button>
              <button
                type="button"
                className="banner-confirm-btn"
                onClick={cancelBannerPreview}
                disabled={uploadingBanner}
              >
                Annuler
              </button>
            </>
          </div>
        )}
        {isOwner && bannerMsg && <div className="banner-message">{bannerMsg}</div>}
      </section>

      <main className="shell">
        <section className="profile-card">
          <div className="profile-head">
            <div className="avatar">{initial}</div>

            <div className="profile-title">
              <h1>{displayName}</h1>
              <div className="username-row">
                <span>@{profile.username}</span>
                {profile.is_verified && <span className="verified-badge">Verifie</span>}
                <span>{avgRating ? `${avgRating}/5` : 'Pas encore note'} avec {reviews.length} avis</span>
              </div>
            </div>

            <div className="profile-actions">
              {isOwner ? (
                <>
                  <button className="btn btn-primary" onClick={() => setEditMode(!editMode)}>
                    {editMode ? 'Fermer' : 'Modifier'}
                  </button>
                  <button className="btn btn-soft" onClick={() => router.push('/profil')}>
                    Tableau de bord
                  </button>
                </>
              ) : (
                <>
                  <button className="btn btn-primary" onClick={() => {
                    if (!currentUser) {
                      sessionStorage.setItem('sokodeal:redirect', JSON.stringify({
                        url: window.location.pathname,
                        state: {}
                      }))
                      router.push('/auth?mode=login')
                      return
                    }
                    router.push('/messages?user=' + profile.id)
                  }}>
                    Contacter
                  </button>
                  <button className="btn btn-soft" onClick={openReviewForm}>
                    {alreadyReviewed ? 'Modifier mon avis' : 'Laisser un avis'}
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="stats">
            <div className="stat">
              <strong>{activeAds.length}</strong>
              <span>Annonces</span>
            </div>
            <div className="stat">
              <strong>{soldAds.length}</strong>
              <span>Vendus</span>
            </div>
            <div className="stat">
              <strong>{reviews.length}</strong>
              <span>Avis</span>
            </div>
            <div className="stat">
              <strong>{avgRating || '-'}</strong>
              <span>Note</span>
            </div>
          </div>

          {editMode && isOwner ? (
            <div className="bio-edit">
              <label className="field-label">Bio</label>
              <textarea
                className="textarea"
                value={editForm.bio}
                maxLength={200}
                onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                placeholder="Ajoutez une bio courte pour rassurer les acheteurs et presenter votre style..."
              />
              <div className="bio-count">{editForm.bio.length}/200</div>
              <label className="field-label location-label">Localisation</label>
              <input
                className="input"
                value={editForm.location}
                onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                placeholder="Ex: Kigali, Kimironko"
              />
              {editMsg && <p className="chip edit-msg">{editMsg}</p>}
              <button className="btn btn-primary save-profile-btn" onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile ? 'Sauvegarde...' : 'Sauvegarder les modifications'}
              </button>
            </div>
          ) : (
            <p className="bio">
              {profile.bio || (isOwner
                ? 'Ajoutez une bio courte pour rassurer les acheteurs et presenter votre style.'
                : "Ce vendeur n'a pas encore ajoute de bio.")}
            </p>
          )}

          <div className="meta-row">
            {profile.location && <span className="chip">{profile.location}</span>}
            {memberSince && <span className="chip">Membre depuis {memberSince}</span>}
            <span className="chip">{ads.length} annonce(s) publiee(s)</span>
          </div>

          {bestAds.length > 0 && (
            <div className="feature-strip">
              {bestAds.map((ad: any) => (
                <Link key={ad.id} href={`/annonce/${generateSlug(ad)}`} className="feature-card" style={{textDecoration:'none', color:'inherit', display:'block'}}>
                  {ad.images?.[0] ? (
                    <img src={ad.images[0]} alt={ad.title} width={320} height={190} loading="lazy" decoding="async" />
                  ) : (
                    <div className="ad-placeholder">{catLabel[ad.category] || 'Annonce'}</div>
                  )}
                  <div className="feature-card-info">
                    <strong style={{fontFamily:'Syne,sans-serif', fontWeight:700, color:'white'}}>{ad.title}</strong>
                    <span style={{fontFamily:'DM Sans,sans-serif', fontWeight:800, color:'white'}}>{Number(ad.price || 0).toLocaleString()} RWF</span>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {editMode && isOwner && (
            <div className="edit-box">
              <p className="edit-hint">
                D'autres options de personnalisation pourront etre ajoutees ici plus tard.
              </p>
            </div>
          )}

        </section>

        <section>
          <div className="section-head">
            <div>
              <h2>Annonces de @{profile.username}</h2>
              <p>Une grille simple pour parcourir sa vitrine.</p>
            </div>
            <span className="chip">{ads.length} annonce(s)</span>
          </div>

          {ads.length === 0 ? (
            <div className="empty-card">
              <h3>Aucune annonce</h3>
              <p>Cet utilisateur n'a pas encore publie d'annonce.</p>
            </div>
          ) : (
            <div className="ads-grid">
              {ads.map((ad: any) => (
                <Link key={ad.id} href={`/annonce/${generateSlug(ad)}`} className="ad-card" style={{textDecoration:'none', color:'inherit', display:'block'}}>
                  <div className="ad-media">
                    {ad.images?.[0] ? (
                      <img src={ad.images[0]} alt={ad.title} width={320} height={190} loading="lazy" decoding="async" />
                    ) : (
                      <div className="ad-placeholder">{catLabel[ad.category] || 'Annonce'}</div>
                    )}
                    {FEATURE_FLAGS.boostedListings && ad.is_boosted && <span className="boost-badge">Mis en avant</span>}
                    <div className="favorite-wrap" onClick={(e) => e.stopPropagation()}>
                      <FavoriteButton adId={ad.id} onLogin={() => router.push('/auth?mode=login')} />
                    </div>
                  </div>
                  <div className="ad-body">
                    <div className="ad-category">{catLabel[ad.category] || ad.category}</div>
                    <div className="ad-title" style={{fontFamily:'Syne,sans-serif', fontWeight:700, fontSize:'0.85rem', color:'#111a14'}}>{ad.title}</div>
                    <div className="ad-price" style={{fontFamily:'DM Sans,sans-serif', fontWeight:800, fontSize:'0.95rem', color:'#1a7a4a'}}>{Number(ad.price || 0).toLocaleString()} RWF</div>
                    {ad.province && <div className="ad-city" style={{fontSize:'0.7rem', color:'#6b7c6e'}}>{ad.province}</div>}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="section-head">
            <div>
              <h2>Avis</h2>
              <p>{avgRating ? `${avgRating}/5 sur ${reviews.length} avis` : `0/5 sur ${reviews.length} avis`}</p>
            </div>
            {!isOwner && (
              <button className="btn btn-soft" onClick={openReviewForm}>
                {alreadyReviewed ? 'Modifier mon avis' : 'Laisser un avis'}
              </button>
            )}
          </div>

          {reviewSuccess && <p className="chip" style={{ display: 'inline-block', margin: '0 0 12px', color: '#1a7a4a' }}>{reviewSuccess}</p>}

          <div className="review-summary">
            <div className="review-summary-score">{avgRating || '0'}</div>
            <div>
              <div className={'review-stars' + (!avgRating ? ' muted' : '')}>
                {avgRating ? ratingStars(avgRatingNumber) : '☆☆☆☆☆'}
              </div>
              <div className="review-summary-copy">
                {reviews.length > 0
                  ? `${reviews.length} avis publie${reviews.length > 1 ? 's' : ''} par la communaute`
                  : 'Aucun avis pour le moment'}
              </div>
            </div>
          </div>

          {reviews.length === 0 ? (
            <div className="review-empty">
              <div className="review-stars muted">☆☆☆☆☆</div>
              <h3>Soyez le premier a donner votre avis</h3>
              <p>Votre retour aide les autres acheteurs a savoir si ce vendeur est fiable et serieux.</p>
              {!isOwner && (
                <button className="btn btn-primary" onClick={openReviewForm}>
                  {alreadyReviewed ? 'Modifier mon avis' : 'Laisser le premier avis'}
                </button>
              )}
            </div>
          ) : (
            <div className="reviews-list">
              {reviews.map((review: any) => {
                const reviewer = review.reviewer?.username || review.reviewer?.full_name || 'Utilisateur'
                return (
                  <article key={review.id || review.created_at} className="review-card">
                    <div className="review-top">
                      <div className="review-author">
                        <div className="mini-avatar">{reviewer.charAt(0).toUpperCase()}</div>
                        <div>
                          <strong>@{reviewer}</strong>
                          <div style={{ color: '#9aa49d', fontSize: '0.76rem', marginTop: 2 }}>
                            {new Date(review.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <span className="chip">
                        {review.rating}/5 <span style={{ color: '#f5a623', marginLeft: 4 }}>{ratingStars(Number(review.rating || 0))}</span>
                      </span>
                    </div>
                    <p>{review.comment}</p>
                  </article>
                )
              })}
            </div>
          )}
        </section>
      </main>

      {showReviewForm && !isOwner && (
        <div className="review-modal-backdrop" onClick={() => !submittingReview && setShowReviewForm(false)}>
          <div className="review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="review-modal-head">
              <div>
                <h3>{currentUserReview ? 'Modifier mon avis' : 'Laisser un avis'}</h3>
                <p>{currentUserReview ? 'Changez votre note ou votre commentaire' : `Notez votre experience avec @${profile.username}`}</p>
              </div>
              <button className="review-close" onClick={() => setShowReviewForm(false)} disabled={submittingReview}>×</button>
            </div>

            <div className="form-grid">
              <div>
                <label className="field-label">Votre note</label>
                <div className="star-picker">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      className={rating <= reviewForm.rating ? 'active' : ''}
                      onClick={() => setReviewForm({ ...reviewForm, rating })}
                      aria-label={`Mettre ${rating} sur 5`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="field-label">Votre commentaire</label>
                <textarea
                  className="textarea"
                  value={reviewForm.comment}
                  maxLength={300}
                  onChange={(e) => {
                    setReviewForm({ ...reviewForm, comment: e.target.value })
                    if (reviewMsg) setReviewMsg('')
                  }}
                  placeholder="Decrivez votre experience avec ce vendeur..."
                />
                <div className="bio-count">{reviewForm.comment.length}/300</div>
              </div>

              {reviewMsg && <p className="chip" style={{ display: 'inline-block', margin: 0, color: '#c0392b' }}>{reviewMsg}</p>}

              <div className="review-actions">
                <button className="btn btn-primary" onClick={handleSubmitReview} disabled={submittingReview}>
                  {submittingReview ? 'Publication...' : (currentUserReview ? 'Mettre a jour mon avis' : 'Publier l avis')}
                </button>
                <button className="btn btn-soft" onClick={() => setShowReviewForm(false)} disabled={submittingReview}>
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
