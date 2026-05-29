import { ListingGrid } from '@/components/listings/ListingGrid';
import { ListingCard } from '@/components/listings/ListingCard';
import { Suspense } from 'react';

export default function ExplorerPage() {
  return (
    <div className="explorer-page">
      <Suspense fallback={<div>Chargement...</div>}>
        <ListingGrid>
          <ListingCard />
          <ListingCard />
          <ListingCard />
        </ListingGrid>
      </Suspense>
    </div>
  );
}
