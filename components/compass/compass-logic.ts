// SHOPPR Compass — state model and pure distance/activation logic.
//
// Kept free of React/DOM so it stays easy to test and reason about.
// Angles use standard screen convention: 0deg = east, 90deg = south,
// 180/-180deg = west, -90deg = north (matches Math.atan2(dy, dx)).

export type Direction = 'north' | 'west' | 'east' | 'south';

export interface CompassNode {
  direction: Direction;
  label: string;
  /** Angle in degrees, screen convention (see file header). */
  angle: number;
}

// Authoritative orientation — do not change without updating this comment:
//   North (top)    = Discover
//   West  (left)   = Nearby Stores
//   East  (right)  = SHOPPR AI
//   South (bottom) = Delivery
//   Center         = Profile / AI guide activation
export const COMPASS_NODES: CompassNode[] = [
  { direction: 'north', label: 'Discover', angle: -90 },
  { direction: 'west', label: 'Nearby Stores', angle: 180 },
  { direction: 'east', label: 'SHOPPR AI', angle: 0 },
  { direction: 'south', label: 'Delivery', angle: 90 },
];

/**
 * Full compass interaction state. Owned by CompassNavigation and read by
 * the presentational pieces underneath it.
 */
export interface CompassState {
  /** Destination currently shown in the content area below the compass. */
  activeDestination: Direction | null;
  /** Whether the user is currently dragging the center profile control. */
  isDragging: boolean;
  /** Current drag offset from center, in pixels. */
  dragPosition: { x: number; y: number };
  /** Closest direction to the current drag position, if any. */
  closestDirection: Direction | null;
  /** 0-1 progress from "just started dragging" to "activation reached". */
  dragProgress: number;
  /** True once the drag has crossed the activation radius. */
  isActivationReached: boolean;
  /** From the OS/browser `prefers-reduced-motion` setting. */
  prefersReducedMotion: boolean;
}

export const INITIAL_COMPASS_STATE: CompassState = {
  activeDestination: 'north',
  isDragging: false,
  dragPosition: { x: 0, y: 0 },
  closestDirection: null,
  dragProgress: 0,
  isActivationReached: false,
  prefersReducedMotion: false,
};

// ---- Named constants (no magic numbers in the component) ----------------

/** How far the profile control can be dragged, as a fraction of the compass's rendered size. */
export const MAX_DRAG_RATIO = 0.34;
/** Fraction of MAX_DRAG at which a destination is considered "activated" on release. */
export const ACTIVATION_RATIO = 0.55;
/** Scale applied to a fully-targeted destination node (1.0 = no change). */
export const TARGET_SCALE_MAX = 1.1;
/** Opacity floor for the destination directly opposite the drag direction. */
export const OPPOSITE_OPACITY_FLOOR = 0.4;
/** How much a node's minimum opacity can fall as its angle diverges from the drag direction. */
export const OPACITY_FALLOFF_RANGE = 0.6;

// ---- Vector / angle helpers ----------------------------------------------

export function clampVectorToRadius(
  dx: number,
  dy: number,
  maxRadius: number
): { x: number; y: number; distance: number } {
  const distance = Math.hypot(dx, dy);
  if (distance <= maxRadius || distance === 0) {
    return { x: dx, y: dy, distance };
  }
  const factor = maxRadius / distance;
  return { x: dx * factor, y: dy * factor, distance: maxRadius };
}

export function angleFromVector(dx: number, dy: number): number {
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

/** Smallest absolute difference between two angles, result in [0, 180]. */
export function angularDifference(a: number, b: number): number {
  let diff = Math.abs(a - b) % 360;
  if (diff > 180) diff = 360 - diff;
  return diff;
}

export function nearestDirection(dragAngle: number): Direction {
  let closest = COMPASS_NODES[0];
  let smallestDiff = Infinity;
  for (const node of COMPASS_NODES) {
    const diff = angularDifference(dragAngle, node.angle);
    if (diff < smallestDiff) {
      smallestDiff = diff;
      closest = node;
    }
  }
  return closest.direction;
}

/** Per-node visual weighting (scale + opacity), continuous by angle and drag distance. */
export interface NodeVisualState {
  direction: Direction;
  scale: number;
  opacity: number;
  isTarget: boolean;
}

export function computeNodeVisualStates(
  dragAngle: number,
  dragDistance: number,
  activationThreshold: number
): NodeVisualState[] {
  // p ramps 0 -> 1 as the drag approaches the activation threshold, then holds.
  const p = Math.min(dragDistance / Math.max(activationThreshold, 1), 1);

  return COMPASS_NODES.map((node) => {
    const diff = angularDifference(dragAngle, node.angle); // 0 (aligned) .. 180 (opposite)
    const closeness = 1 - diff / 180; // 1 = aligned with drag, 0 = opposite

    const opacityFloor = 1 - (diff / 180) * OPACITY_FALLOFF_RANGE;
    const opacity = 1 - p * (1 - opacityFloor);
    const scale = 1 + p * closeness * (TARGET_SCALE_MAX - 1);

    return {
      direction: node.direction,
      scale,
      opacity,
      isTarget: diff < 45 && p > 0,
    };
  });
}

export function isOppositeFloorRespected(): boolean {
  // Sanity check used only in dev: opposite node (diff=180) should not fall
  // below OPPOSITE_OPACITY_FLOOR when p = 1.
  const floor = 1 - (180 / 180) * OPACITY_FALLOFF_RANGE;
  return floor >= OPPOSITE_OPACITY_FLOOR - 0.001;
}
