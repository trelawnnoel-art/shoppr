// Geo/time helpers for deriving per-request store fields (distance, ETA,
// open-now) from stored facts (coordinates, hours) — see the comment at the
// top of prisma/schema.prisma for why these aren't database columns.

// Placeholder for "the customer's current location" until there's a real
// geolocation/address system. Coordinates are an approximate, unremarkable
// point in downtown Chicago — not tied to any real customer or address —
// just a stable point to compute demo distances from.
export const PLACEHOLDER_USER_LOCATION = { latitude: 41.8781, longitude: -87.6298 };

const EARTH_RADIUS_MILES = 3958.8;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

/** Great-circle distance between two lat/lng points, in miles. */
export function haversineMiles(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number }
) {
  const dLat = toRadians(b.latitude - a.latitude);
  const dLon = toRadians(b.longitude - a.longitude);
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return EARTH_RADIUS_MILES * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}

// Rough placeholder for a Scout's round-trip errand time: average urban
// travel speed plus a fixed in-store shopping overhead. Not real routing
// (no traffic, no road network) — stands in until the Scout-logistics
// system estimates this for real.
const ASSUMED_TRAVEL_SPEED_MPH = 18;
const SHOPPING_OVERHEAD_MINUTES = 15;

export function estimateEtaMinutes(distanceMiles: number) {
  const driveMinutes = (distanceMiles / ASSUMED_TRAVEL_SPEED_MPH) * 60;
  return Math.round(driveMinutes + SHOPPING_OVERHEAD_MINUTES);
}

export type StoreHours = Partial<
  Record<'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun', [string, string] | null>
>;

const DAY_KEYS: Array<keyof StoreHours> = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/** Whether a store is open right now, given its stored weekly hours. */
export function isOpenNow(hours: StoreHours, now: Date = new Date()) {
  const dayKey = DAY_KEYS[now.getDay()];
  const today = hours[dayKey];
  if (!today) return false;

  const [openStr, closeStr] = today;
  const minutesNow = now.getHours() * 60 + now.getMinutes();
  const [openH, openM] = openStr.split(':').map(Number);
  const [closeH, closeM] = closeStr.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  return minutesNow >= openMinutes && minutesNow < closeMinutes;
}
