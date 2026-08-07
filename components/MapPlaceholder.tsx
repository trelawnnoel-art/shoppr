import { MapPin } from 'lucide-react';

/**
 * Static, styled placeholder for a future map integration (e.g. Google
 * Maps). Keeps the same footprint/props shape so it can be swapped in
 * later without touching the surrounding layout.
 */
export function MapPlaceholder({ label = 'Stores near you' }: { label?: string }) {
  return (
    <div className="relative h-40 w-full overflow-hidden rounded-card border border-line bg-[radial-gradient(circle_at_30%_20%,rgba(52,84,209,0.08),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(124,92,252,0.08),transparent_55%)] bg-surface">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(20,20,26,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,26,0.06)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted">
        <MapPin size={20} />
        <span className="text-xs font-medium">{label}</span>
      </div>
    </div>
  );
}
