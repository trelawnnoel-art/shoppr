import type { Product } from '@/data/types';

export function ProductCard({ product }: { product: Product }) {
  return (
    <div className="min-w-[200px] shrink-0 rounded-card border border-line bg-surface p-4 shadow-card">
      <div className="mb-3 aspect-square rounded-[14px] bg-gradient-to-br from-accent-blue-soft to-paper" />
      <h3 className="text-sm font-semibold text-ink">{product.name}</h3>
      <p className="text-xs text-muted">{product.storeName}</p>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-sm font-semibold text-ink">${product.price}</span>
        <span className="text-[11px] text-muted">{product.etaMinutes} min</span>
      </div>
    </div>
  );
}
