import { MapPin } from 'lucide-react';

/**
 * A live-tracking visual for an in-progress Mission. Honestly scoped: this
 * is NOT real GPS tracking (that needs real maps/geolocation — see the
 * README roadmap, a separate unbuilt item) — it's a styled placeholder
 * showing a Scout's mock position, same spirit as MapPlaceholder.tsx. The
 * "Live" badge and pulse animation are real UI, just not backed by a real
 * location feed yet. Position is a simple deterministic fraction (0-1)
 * derived from the mission's own progress, not simulated coordinates.
 */
export function ScoutTrackingVisual({ progress }: { progress: number }) {
  const clamped = Math.min(1, Math.max(0, progress));

  return (
    <div className="relative h-32 w-full overflow-hidden rounded-card border border-line bg-[radial-gradient(circle_at_30%_20%,rgba(52,84,209,0.08),transparent_55%),radial-gradient(circle_at_75%_70%,rgba(124,92,252,0.08),transparent_55%)] bg-surface">
      <div className="absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(20,20,26,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(20,20,26,0.06)_1px,transparent_1px)] [background-size:24px_24px]" />

      <span className="absolute left-2 top-2 rounded-pill bg-accent-emerald-soft px-2 py-0.5 text-[10px] font-semibold text-accent-emerald">
        Live
      </span>

      {/* Destination pin, fixed on the right */}
      <MapPin size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-ink-soft" />

      {/* Scout marker — position along the route is a simple left-to-right
          interpolation driven by `progress`, not real coordinates. */}
      <div
        className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2 transition-[left] duration-700"
        style={{ left: `${8 + clamped * 76}%` }}
      >
        <span className="absolute inset-0 animate-ping rounded-full bg-accent-blue opacity-50" />
        <span className="relative block h-3 w-3 rounded-full bg-accent-blue ring-2 ring-surface" />
      </div>
    </div>
  );
}
