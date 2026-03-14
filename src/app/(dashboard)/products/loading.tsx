import { ProductCardSkeleton } from "@/components/products/ProductCard";

export default function ProductsLoading() {
  return (
    <div className="flex h-full flex-col">
      {/* Fake toolbar */}
      <div className="border-b border-border/60 px-6 py-3">
        <div className="flex gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-7 w-24 animate-pulse rounded-full bg-surface-2" />
          ))}
        </div>
      </div>
      <div className="grid gap-4 p-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {Array.from({ length: 12 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
