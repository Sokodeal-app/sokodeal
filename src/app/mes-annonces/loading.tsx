import { ListingGrid } from '@/components/listings/ListingGrid';
import { ListingCardSkeleton } from '@/components/listings/ListingCardSkeleton';

export default function Loading() {
  return (
    <div className="container">
      <div className="h-8 w-48 mb-4 bg-gray-200 rounded animate-pulse" />
      <div className="h-4 w-64 mb-8 bg-gray-200 rounded animate-pulse" />
      <ListingGrid>
        {Array.from({ length: 6 }).map((_, i) => (
          <ListingCardSkeleton key={i} />
        ))}
      </ListingGrid>
    </div>
  );
}
