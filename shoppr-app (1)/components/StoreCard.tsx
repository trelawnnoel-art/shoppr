import { Clock, MapPin, Users } from 'lucide-react';
import type { Store } from '@/data/types';

const CONFIDENCE_LABEL: Record<Store['availabilityConfidence'], string> = {
  high: 'Likely in stock',
  medium: 'Usually available',
  low: 'Limited availability',
};

export function StoreCard({ store }: { store: Store }) {
  return (
    <div className="min-w-[240px] shrink-0 rounded-card border border-line bg-surface p-5 shadow-card">
      <div className="mb-3 flex items-start justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-ink">{store.name}</h3>
          <p className="text-xs text-muted">{store.category}</p>
        </div>
        <span
          className={`rounded-pill px-2.5 py-1 text-[11px] font-semibold ${
            store.isOpen
              ? 'bg-accent-emerald-soft text-accent-emerald'
              : 'bg-line text-muted'
          }`}
        >
          {store.isOpen ? 'Open' : 'Closed'}
        </span>
      </div>

      <div className="flex flex-col gap-2 text-sm text-ink-soft">
        <div className="flex items-center gap-2">
          <MapPin size={14} className="text-muted" />
          <span>{store.distanceMiles} mi away</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-muted" />
          <span>~{store.etaMinutes} min delivery</span>
        </div>
        <div className="flex items-center gap-2">
          <Users size={14} className="text-muted" />
          <span>
            {store.scoutsAvailable} Scout{store.scoutsAvailable === 1 ? '' : 's'} nearby
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs font-medium text-accent-blue">
        {CONFIDENCE_LABEL[store.availabilityConfidence]}
      </p>
    </div>
  );
}
