import { ListingGrid } from '@/components/listings/ListingGrid';
import { ListingCard } from '@/components/listings/ListingCard';
import { EmptyState } from '@/components/ui/EmptyState';
import { Button } from '@/components/ui/Button';
import { getCurrentSession } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { adaptListingToCardViewModel } from '@/lib/listingAdapter';
import type { ListingCardViewModel } from '@/lib/listingAdapter';

export interface MyListingsPageProps {
  listings: ListingCardViewModel[];
}

export default async function MyListingsPage() {
  const { data: sessionData } = await getCurrentSession();

  if (!sessionData?.session?.user) {
    return <div>Connectez-vous pour voir vos annonces</div>;
  }

  const { user } = sessionData.session;

  const { data: listings } = await supabase
    .from('ads')
    .select('id, title, price, images, province, district, category, subcategory, created_at, is_active, is_sold, is_boosted, sold_at, deleted_at, user_id')
    .eq('user_id', user.id)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (!listings?.length) {
    return (
      <EmptyState
        title="Vous n'avez pas encore d'annonces"
        description="Commencez à publier votre première annonce sur SokoDeal."
      >
        <Button href="/publier">Publier une annonce</Button>
      </EmptyState>
    );
  }

  return (
    <div className="container">
      <h1>Mes annonces</h1>
      <p>Gérez vos annonces publiées sur SokoDeal.</p>
      <p>{listings.length} annonces</p>
      <ListingGrid>
        {listings.map(adaptListingToCardViewModel).map((listing) => (
          <ListingCard key={listing.id} {...listing} />
        ))}
      </ListingGrid>
    </div>
  );
}
