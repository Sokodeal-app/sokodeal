"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout";
import { ListingCard, ListingCardSkeleton, ListingGrid } from "@/components/listings";
import { Button, EmptyState, SectionHeader } from "@/components/ui";
import { useAuth } from "@/components/AuthProvider";
import { useFavorites } from "@/hooks/useFavorites";
import { supabase } from "@/lib/supabase";
import { generateSlug } from "@/lib/slug";

type FavoriteAd = {
  id: string;
  title: string;
  price?: number | null;
  images?: string[] | null;
  province?: string | null;
  district?: string | null;
  category?: string | null;
  subcategory?: string | null;
  created_at?: string | null;
  is_sold?: boolean | null;
};

const skeletonItems = Array.from({ length: 6 });

export default function FavorisPage() {
  const { user, loading: authLoading } = useAuth();
  const { favorites, isFavorite, toggleFavorite, loading: favoritesLoading, userId } = useFavorites();
  const [favoriteAds, setFavoriteAds] = useState<FavoriteAd[]>([]);
  const [adsLoading, setAdsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    if (!userId || favoritesLoading) return;

    let cancelled = false;

    const fetchFavoriteAds = async () => {
      if (favorites.length === 0) {
        setFavoriteAds([]);
        setAdsLoading(false);
        return;
      }

      setAdsLoading(true);
      setLoadError("");

      try {
        const { data, error } = await supabase
          .from("ads")
          .select("id, title, price, images, province, district, category, subcategory, created_at, is_sold")
          .in("id", favorites)
          .eq("is_active", true)
          .is("deleted_at", null)
          .order("created_at", { ascending: false });

        if (cancelled) return;

        if (error) {
          console.error("favorites ads fetch error:", error);
          setLoadError("Impossible de charger vos favoris pour le moment.");
          return;
        }

        setFavoriteAds(data || []);
      } catch (err) {
        if (cancelled) return;
        console.error("favorites ads fetch catch:", err);
        setLoadError("Impossible de charger vos favoris pour le moment.");
      } finally {
        if (!cancelled) setAdsLoading(false);
      }
    };

    fetchFavoriteAds();

    return () => {
      cancelled = true;
    };
  }, [favorites, favoritesLoading, userId]);

  const loading = authLoading || favoritesLoading || adsLoading;

  return (
    <AppShell maxWidth="desktop" withBottomNav>
      <div style={{ padding: "32px 0" }}>
        <SectionHeader
          title="Mes favoris"
          description="Retrouvez ici les annonces que vous souhaitez garder sous la main."
        />
      </div>

      {authLoading ? (
        <ListingGrid columns={3} gap="md">
          {skeletonItems.map((_, index) => (
            <ListingCardSkeleton key={index} variant="grid" />
          ))}
        </ListingGrid>
      ) : !user ? (
        <EmptyState
          title="Connectez-vous pour voir vos favoris"
          description="Gardez vos annonces préférées et retrouvez-les ici sur tous vos appareils."
        >
          <Button href="/auth?mode=login" variant="primary">
            Se connecter
          </Button>
        </EmptyState>
      ) : loading ? (
        <ListingGrid columns={3} gap="md">
          {skeletonItems.map((_, index) => (
            <ListingCardSkeleton key={index} variant="grid" />
          ))}
        </ListingGrid>
      ) : loadError ? (
        <EmptyState title="Favoris indisponibles" description={loadError}>
          <Button href="/" variant="soft">
            Retour aux annonces
          </Button>
        </EmptyState>
      ) : favoriteAds.length === 0 ? (
        <EmptyState
          title="Aucun favori pour le moment"
          description="Ajoutez des annonces à vos favoris pour les retrouver ici."
        >
          <Button href="/" variant="soft">
            Explorer les annonces
          </Button>
        </EmptyState>
      ) : (
        <ListingGrid columns={3} gap="md">
          {favoriteAds.map((ad) => (
            <ListingCard
              key={ad.id}
              id={ad.id}
              title={ad.title}
              price={ad.price}
              currency="RWF"
              city={ad.province}
              district={ad.district}
              category={ad.subcategory || ad.category}
              images={ad.images}
              createdAt={ad.created_at}
              isSold={!!ad.is_sold}
              isFavorited={isFavorite(ad.id)}
              onFavoriteToggle={toggleFavorite}
              href={`/annonce/${generateSlug({
                id: ad.id,
                title: ad.title,
                category: ad.category || undefined,
                province: ad.province || undefined,
              })}`}
              variant="grid"
            />
          ))}
        </ListingGrid>
      )}
    </AppShell>
  );
}
