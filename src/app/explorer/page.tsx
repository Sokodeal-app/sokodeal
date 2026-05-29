"use client";

import { useEffect, useMemo, useState } from 'react';
import { ListingCard, ListingCardSkeleton, ListingGrid } from '@/components/listings';
import { supabasePublic } from '@/lib/supabase-public';
import { adaptListingToCardViewModel } from '@/lib/listingAdapter';
import { generateSlug } from '@/lib/slug';

type ExplorerAd = {
  id: string;
  title: string;
  description?: string | null;
  price: number;
  images?: string[] | null;
  province?: string | null;
  district?: string | null;
  category: string;
  subcategory?: string | null;
  created_at: string;
  is_active?: boolean | null;
  is_sold?: boolean | null;
  is_boosted?: boolean | null;
  sold_at?: string | null;
  deleted_at?: string | null;
  surface?: number | null;
  chambres?: number | string | null;
  salles_de_bain?: number | string | null;
  immo_type?: string | null;
  user_id?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type ExplorerSortOption = 'recent' | 'moins-cher' | 'plus-cher';

function adaptExplorerAdToCardViewModel(ad: ExplorerAd) {
  return adaptListingToCardViewModel({
    ...ad,
    category: ad.subcategory || ad.category,
    isFavorite: false,
  });
}

function getExplorerAdHref(ad: ExplorerAd) {
  return (
    '/annonce/' +
    generateSlug({
      id: ad.id,
      title: ad.title,
      category: ad.category || undefined,
      province: ad.province || undefined,
    })
  );
}

export default function ExplorerPage() {
  const [ads, setAds] = useState<ExplorerAd[]>([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [sortBy, setSortBy] = useState<ExplorerSortOption>('recent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAds = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabasePublic
        .from('ads')
        .select(
          'id, title, price, images, province, district, category, subcategory, created_at, is_active, is_sold, is_boosted, sold_at, deleted_at, surface, chambres, salles_de_bain, immo_type, user_id, latitude, longitude'
        )
        .eq('is_active', true)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (fetchError) {
        setError('Impossible de charger les annonces. Réessayez plus tard.');
        setAds([]);
      } else {
        setAds((data as ExplorerAd[]) || []);
      }

      setLoading(false);
    };

    void fetchAds();
  }, []);

  const categoryOptions = useMemo(() => {
    const values = new Set<string>();
    ads.forEach((ad) => {
      if (ad.subcategory) values.add(ad.subcategory);
      if (ad.category) values.add(ad.category);
    });
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'));
  }, [ads]);

  const filteredAds = useMemo(() => {
    const query = search.trim().toLowerCase();

    return ads
      .filter((ad) => {
        if (query) {
          return (
            ad.title.toLowerCase().includes(query) ||
            ad.category.toLowerCase().includes(query) ||
            (ad.subcategory || '').toLowerCase().includes(query)
          );
        }

        if (category) {
          return ad.category === category || ad.subcategory === category;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'moins-cher') {
          return a.price - b.price;
        }
        if (sortBy === 'plus-cher') {
          return b.price - a.price;
        }
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [ads, category, search, sortBy]);

  return (
    <div
      className="explorer-page"
      style={{
        padding: '16px',
        minHeight: '100vh',
        background: 'var(--sd-bg)',
        color: 'var(--sd-text)',
      }}
    >
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        <header
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '18px',
            marginBottom: '22px',
          }}
        >
          <div
            style={{
              background: 'var(--sd-surface)',
              border: '1px solid var(--sd-border)',
              borderRadius: '20px',
              padding: '22px 20px',
              boxShadow: 'var(--sd-shadow-sm)',
            }}
          >
            <p
              style={{
                margin: 0,
                color: 'var(--sd-muted)',
                fontSize: '0.88rem',
                textTransform: 'uppercase',
                letterSpacing: '0.07em',
              }}
            >
              Explorer
            </p>
            <h1
              style={{
                margin: '10px 0 0',
                fontFamily: 'Syne, sans-serif',
                fontSize: '2rem',
                lineHeight: 1.05,
                maxWidth: '540px',
              }}
            >
              Explorez les annonces à Kigali
            </h1>
            <p
              style={{
                margin: '12px 0 0',
                maxWidth: '540px',
                color: 'var(--sd-muted)',
                fontSize: '0.98rem',
                lineHeight: 1.6,
              }}
            >
              Trouvez rapidement ce que vous cherchez.
            </p>
          </div>

          <div
            style={{
              background: 'var(--sd-surface)',
              border: '1px solid var(--sd-border)',
              borderRadius: '20px',
              padding: '20px',
              boxShadow: 'var(--sd-shadow-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: '18px',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <label
                htmlFor="explorer-search"
                style={{
                  fontWeight: 700,
                  color: 'var(--sd-text)',
                  fontSize: '0.95rem',
                }}
              >
                Recherche
              </label>
              <input
                id="explorer-search"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Titre, catégorie ou sous-catégorie"
                style={{
                  width: '100%',
                  minHeight: '52px',
                  padding: '0 18px',
                  borderRadius: '999px',
                  border: '1px solid var(--sd-border)',
                  background: 'var(--sd-surface)',
                  color: 'var(--sd-text)',
                  fontSize: '1rem',
                  outline: 'none',
                }}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setCategory('')}
                    style={{
                      borderRadius: '999px',
                      border: category === '' ? '1px solid var(--sd-primary)' : '1px solid var(--sd-border)',
                      background: category === '' ? 'var(--sd-primary-soft)' : 'var(--sd-surface)',
                      color: category === '' ? 'var(--sd-primary-dark)' : 'var(--sd-text)',
                      padding: '10px 14px',
                      cursor: 'pointer',
                      minWidth: '110px',
                      fontSize: '0.92rem',
                      fontWeight: 600,
                    }}
                  >
                    Toutes
                  </button>
                  {categoryOptions.slice(0, 8).map((option) => (
                    <button
                      type="button"
                      key={option}
                      onClick={() => setCategory(option)}
                      style={{
                        borderRadius: '999px',
                        border: category === option ? '1px solid var(--sd-primary)' : '1px solid var(--sd-border)',
                        background: category === option ? 'var(--sd-primary-soft)' : 'var(--sd-surface)',
                        color: category === option ? 'var(--sd-primary-dark)' : 'var(--sd-text)',
                        padding: '10px 14px',
                        cursor: 'pointer',
                        minWidth: '110px',
                        fontSize: '0.92rem',
                        fontWeight: 600,
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <label htmlFor="explorer-sort" style={{ fontWeight: 700, color: 'var(--sd-text)', fontSize: '0.95rem' }}>
                    Trier
                  </label>
                  <select
                    id="explorer-sort"
                    value={sortBy}
                    onChange={(event) => setSortBy(event.target.value as ExplorerSortOption)}
                    style={{
                      minWidth: '160px',
                      padding: '11px 14px',
                      borderRadius: '999px',
                      border: '1px solid var(--sd-border)',
                      background: 'var(--sd-surface)',
                      color: 'var(--sd-text)',
                      fontSize: '0.95rem',
                      outline: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    <option value="recent">Plus récent</option>
                    <option value="moins-cher">Moins cher</option>
                    <option value="plus-cher">Plus cher</option>
                  </select>
                </div>
              </div>
              <div style={{ color: 'var(--sd-muted)', fontSize: '0.95rem' }}>
                {loading
                  ? 'Chargement des annonces...'
                  : error
                  ? 'Erreur de chargement'
                  : `${filteredAds.length} annonce${filteredAds.length > 1 ? 's' : ''} trouvée${filteredAds.length > 1 ? 's' : ''}`}
              </div>
            </div>
          </div>
        </header>

        {error ? (
          <div
            style={{
              background: 'var(--sd-surface)',
              border: '1px solid rgba(185, 28, 28, 0.12)',
              borderRadius: '18px',
              padding: '28px 24px',
              color: 'var(--sd-text)',
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: '8px', color: 'var(--sd-error)' }}>
              Impossible de charger les annonces.
            </div>
            <div style={{ color: 'var(--sd-muted)' }}>
              Veuillez réessayer plus tard ou vérifier votre connexion.
            </div>
          </div>
        ) : loading ? (
          <ListingGrid columns={3} gap="md">
            {Array.from({ length: 6 }).map((_, index) => (
              <ListingCardSkeleton key={index} variant="grid" />
            ))}
          </ListingGrid>
        ) : filteredAds.length === 0 ? (
          <div
            style={{
              background: 'var(--sd-surface)',
              border: '1px solid var(--sd-border)',
              borderRadius: '18px',
              padding: '40px 24px',
              textAlign: 'center',
              color: 'var(--sd-text)',
            }}
          >
            <div style={{ fontSize: '1.6rem', fontWeight: 700, marginBottom: '12px' }}>Aucune annonce</div>
            <p style={{ color: 'var(--sd-muted)', marginBottom: '4px', fontSize: '0.96rem' }}>
              Aucun résultat ne correspond à votre recherche.
            </p>
            <p style={{ color: 'var(--sd-muted)', fontSize: '0.96rem' }}>
              Essayez un autre mot-clé ou catégorie.
            </p>
          </div>
        ) : (
          <ListingGrid columns={3} gap="md">
            {filteredAds.map((ad) => (
              <ListingCard
                key={ad.id}
                viewModel={adaptExplorerAdToCardViewModel(ad)}
                isFavorited={false}
                href={getExplorerAdHref(ad)}
                variant="grid"
              />
            ))}
          </ListingGrid>
        )}
      </div>
    </div>
  );
}
