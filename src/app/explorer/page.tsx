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
    <div className="explorer-page" style={{ padding: '20px', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1120px', margin: '0 auto' }}>
        <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
            <div style={{ flex: '1 1 240px' }}>
              <label htmlFor="explorer-search" style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                Rechercher
              </label>
              <input
                id="explorer-search"
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Titre, catégorie, sous-catégorie"
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #d8d3c4', fontSize: '0.95rem' }}
              />
            </div>

            <div style={{ minWidth: '200px', flex: '1 1 200px' }}>
              <label htmlFor="explorer-category" style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                Catégorie
              </label>
              <select
                id="explorer-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #d8d3c4', fontSize: '0.95rem' }}
              >
                <option value="">Toutes les catégories</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ minWidth: '180px', flex: '1 1 180px' }}>
              <label htmlFor="explorer-sort" style={{ display: 'block', marginBottom: '6px', fontWeight: 700 }}>
                Trier
              </label>
              <select
                id="explorer-sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as ExplorerSortOption)}
                style={{ width: '100%', padding: '12px 14px', borderRadius: '12px', border: '1px solid #d8d3c4', fontSize: '0.95rem' }}
              >
                <option value="recent">Plus récent</option>
                <option value="moins-cher">Moins cher</option>
                <option value="plus-cher">Plus cher</option>
              </select>
            </div>
          </div>

          <div style={{ color: '#6f6b63', fontSize: '0.95rem' }}>
            {loading
              ? 'Chargement des annonces...'
              : error
              ? 'Erreur de chargement'
              : `${filteredAds.length} annonce${filteredAds.length > 1 ? 's' : ''} trouvée${filteredAds.length > 1 ? 's' : ''}`}
          </div>
        </div>

        {error ? (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #fde3e3', color: '#7f1d1d', padding: '24px' }}>
            <strong>Impossible de charger les annonces.</strong>
            <div>Veuillez réessayer plus tard ou vérifier votre connexion.</div>
          </div>
        ) : loading ? (
          <ListingGrid columns={3} gap="md">
            {Array.from({ length: 6 }).map((_, index) => (
              <ListingCardSkeleton key={index} variant="grid" />
            ))}
          </ListingGrid>
        ) : filteredAds.length === 0 ? (
          <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e8e4de', padding: '34px', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '10px' }}>Aucune annonce</div>
            <p style={{ color: '#6f6b63', marginBottom: '16px' }}>
              Aucun résultat ne correspond à votre recherche. Essayez un autre mot-clé ou catégorie.
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
