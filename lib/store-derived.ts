import type { Store } from '@/app/generated/prisma/client';
import {
  PLACEHOLDER_USER_LOCATION,
  estimateEtaMinutes,
  haversineMiles,
  isOpenNow,
  type StoreHours,
} from './geo';

// Deterministic placeholder for Scout availability — NOT real data, and not
// store data at all (it belongs to the Scout/gig-worker system, out of
// scope for this backend pass). Derived from the store id so it's stable
// across requests instead of random noise on every load; swap for a real
// query against Scout locations once that system exists.
function placeholderScoutAvailability(storeId: string) {
  let hash = 0;
  for (let i = 0; i < storeId.length; i++) {
    hash = (hash * 31 + storeId.charCodeAt(i)) >>> 0;
  }
  const scoutsAvailable = hash % 6; // 0-5
  const availabilityConfidence: 'high' | 'medium' | 'low' =
    scoutsAvailable >= 3 ? 'high' : scoutsAvailable >= 1 ? 'medium' : 'low';
  return { scoutsAvailable, availabilityConfidence };
}

/** Store fields as the frontend expects them: stored facts + everything
 * that only makes sense computed per-request (distance, ETA, open-now). */
export function withDerivedStoreFields(store: Store) {
  const distanceMiles = haversineMiles(PLACEHOLDER_USER_LOCATION, store);
  const etaMinutes = estimateEtaMinutes(distanceMiles);
  const isOpen = isOpenNow(store.hours as StoreHours);
  const { scoutsAvailable, availabilityConfidence } = placeholderScoutAvailability(store.id);

  return {
    id: store.id,
    name: store.name,
    category: store.category,
    address: store.address,
    imageUrl: store.imageUrl,
    distanceMiles: Math.round(distanceMiles * 10) / 10,
    etaMinutes,
    isOpen,
    scoutsAvailable,
    availabilityConfidence,
  };
}
