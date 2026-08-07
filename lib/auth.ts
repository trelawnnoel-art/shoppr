import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';
import type { User } from '@/app/generated/prisma/client';

const KEY_LENGTH = 64;

/** salt:hash, both hex — scrypt (Node's built-in, no extra dependency like
 * bcrypt needed) with a random salt per password. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, KEY_LENGTH).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;

  const hashBuffer = Buffer.from(hash, 'hex');
  const suppliedBuffer = scryptSync(password, salt, KEY_LENGTH);
  // Different-length buffers would make timingSafeEqual throw rather than
  // return false — check length first so a malformed stored hash 400s
  // instead of 500ing.
  if (hashBuffer.length !== suppliedBuffer.length) return false;
  return timingSafeEqual(hashBuffer, suppliedBuffer);
}

/** Shapes a DB user into exactly data/types.ts's UserProfile — never leaks
 * email/passwordHash to a response. */
export function toUserProfile(user: User) {
  return {
    initials: user.initials,
    firstName: user.firstName,
    savedSizesCount: user.savedSizesCount,
    favoriteStoresCount: user.favoriteStoresCount,
    savedItemsCount: user.savedItemsCount,
  };
}
