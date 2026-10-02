import { Star } from 'lucide-react';
import type { Scout } from '@/data/types';

/** Initials fallback (same visual pattern as the header/profile-panel
 * avatar) for Scouts without a photoUrl — none of the seeded demo Scouts
 * have one set yet, so this is the common case, not an edge case. */
function initialsOf(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export function ScoutProfile({ scout }: { scout: Scout }) {
  return (
    <div className="flex items-center gap-3">
      {scout.photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={scout.photoUrl}
          alt={scout.name}
          className="h-11 w-11 shrink-0 rounded-full object-cover"
        />
      ) : (
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">
          {initialsOf(scout.name)}
        </span>
      )}
      <div>
        <p className="text-sm font-semibold text-ink">{scout.name}</p>
        <div className="flex items-center gap-1">
          <Star size={12} className="fill-accent-blue text-accent-blue" />
          <span className="text-xs text-muted">{scout.rating.toFixed(2)}</span>
        </div>
      </div>
    </div>
  );
}
