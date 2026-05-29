import { ListingGrid } from '@/components/listings/ListingGrid';
import { ListingCardSkeleton } from '@/components/listings/ListingCardSkeleton';

export default function ExplorerLoading() {
  return (
    <div className="explorer-page">
      <ListingGrid>
        <ListingCardSkeleton />
        <ListingCardSkeleton />
        <ListingCardSkeleton />
      </ListingGrid>
    </div>
  );
}
