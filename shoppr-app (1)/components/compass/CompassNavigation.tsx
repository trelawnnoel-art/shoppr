'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  ElementType,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Compass as CompassIcon,
  Sparkles,
  Store,
  Truck,
} from 'lucide-react';
import {
  ACTIVATION_RATIO,
  angleFromVector,
  clampVectorToRadius,
  COMPASS_NODES,
  computeNodeVisualStates,
  MAX_DRAG_RATIO,
  nearestDirection,
} from './compass-logic';
import type { Direction } from './compass-logic';
import { AiGuide } from './AiGuide';

const DIRECTION_ICONS: Record<Direction, ElementType> = {
  north: CompassIcon,
  west: Store,
  east: Sparkles,
  south: Truck,
};

const CARDINAL_LETTER: Record<Direction, string> = {
  north: 'N',
  west: 'W',
  east: 'E',
  south: 'S',
};

// Outward-pointing arrow per direction, matching the reference layout
// (e.g. Discover sits under an upward arrow, since it's due north).
const CARDINAL_ARROW: Record<Direction, ElementType> = {
  north: ChevronUp,
  west: ChevronLeft,
  east: ChevronRight,
  south: ChevronDown,
};

// Destination bubbles, at a radius that leaves visible bezel/tick space
// outside them — this is what makes them read as "attached to the
// instrument" rather than floating buttons beside it.
const NODE_POSITIONS: Record<Direction, { x: number; y: number }> = {
  north: { x: 0, y: -100 },
  west: { x: -100, y: 0 },
  east: { x: 100, y: 0 },
  south: { x: 0, y: 100 },
};

const TICK_RADIUS_PX = 140;
const TICK_COUNT = 24;
const TICKS = Array.from({ length: TICK_COUNT }, (_, i) => {
  const deg = i * (360 / TICK_COUNT);
  return { deg, isMajor: deg % 90 === 0 };
});

const TAP_MOVEMENT_THRESHOLD_PX = 6;
// Needle stops short of the destination bubbles' inner edge.
const NEEDLE_LENGTH_PX = 56;

interface CompassNavigationProps {
  activeDestination: Direction;
  onSelectDestination: (direction: Direction) => void;
}

export function CompassNavigation({
  activeDestination,
  onSelectDestination,
}: CompassNavigationProps) {
  const prefersReducedMotion = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const draggedBeyondThreshold = useRef(false);

  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [isActivated, setIsActivated] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  const dragDistance = Math.hypot(dragOffset.x, dragOffset.y);
  const dragAngle = angleFromVector(dragOffset.x, dragOffset.y);

  const activeAngle =
    COMPASS_NODES.find((n) => n.direction === activeDestination)?.angle ?? 0;
  const needleAngle = isDragging && dragDistance > 0 ? dragAngle : activeAngle;

  const getGeometry = useCallback(() => {
    const size = containerRef.current?.getBoundingClientRect().width ?? 320;
    const maxDrag = size * MAX_DRAG_RATIO;
    return { maxDrag, activationThreshold: maxDrag * ACTIVATION_RATIO };
  }, []);

  const nodeStates = useMemo(() => {
    if (dragDistance === 0) {
      return COMPASS_NODES.map((n) => ({
        direction: n.direction,
        scale: 1,
        opacity: 1,
        isTarget: false,
      }));
    }
    const { activationThreshold } = getGeometry();
    return computeNodeVisualStates(dragAngle, dragDistance, activationThreshold);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dragAngle, dragDistance]);

  const resetDrag = useCallback(() => {
    setIsDragging(false);
    setDragOffset({ x: 0, y: 0 });
    setIsActivated(false);
  }, []);

  const announceAndSelect = useCallback(
    (dir: Direction) => {
      const node = COMPASS_NODES.find((n) => n.direction === dir);
      setStatusMessage(node ? `${node.label} locked` : '');
      onSelectDestination(dir);
    },
    [onSelectDestination]
  );

  const handlePointerMove = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const { maxDrag, activationThreshold } = getGeometry();
      const rawDx = clientX - cx;
      const rawDy = clientY - cy;

      if (Math.hypot(rawDx, rawDy) > TAP_MOVEMENT_THRESHOLD_PX) {
        draggedBeyondThreshold.current = true;
      }

      const clamped = clampVectorToRadius(rawDx, rawDy, maxDrag);
      setDragOffset({ x: clamped.x, y: clamped.y });
      setIsActivated(clamped.distance >= activationThreshold);
    },
    [getGeometry]
  );

  const handlePointerDown = (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    draggedBeyondThreshold.current = false;
    setIsDragging(true);
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (!draggedBeyondThreshold.current) {
      // A plain tap on the guide opens the SHOPPR AI experience directly —
      // it's the guide operating the compass, not a profile shortcut.
      resetDrag();
      announceAndSelect('east');
      return;
    }
    if (isActivated) {
      announceAndSelect(nearestDirection(dragAngle));
    }
    resetDrag();
  };

  const handleGroupKeyDown = (e: ReactKeyboardEvent) => {
    const arrowMap: Record<string, Direction> = {
      ArrowUp: 'north',
      ArrowLeft: 'west',
      ArrowRight: 'east',
      ArrowDown: 'south',
    };
    if (arrowMap[e.key]) {
      e.preventDefault();
      announceAndSelect(arrowMap[e.key]);
    }
  };

  const handleGuideKeyDown = (e: ReactKeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      announceAndSelect('east');
    }
  };

  return (
    <div className="flex flex-col items-center">
      <p className="mb-6 text-sm text-muted">Drag the guide, or tap a direction</p>

      <div
        ref={containerRef}
        role="group"
        aria-label="SHOPPR compass navigation"
        className="relative h-[19rem] w-[19rem] touch-none sm:h-[22rem] sm:w-[22rem] lg:h-[24rem] lg:w-[24rem]"
        style={{ touchAction: 'none' }}
        onPointerMove={(e) => isDragging && handlePointerMove(e.clientX, e.clientY)}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetDrag}
        onKeyDown={handleGroupKeyDown}
      >
        {/* Bezel — outer instrument ring with a touch of physical depth */}
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-line-strong bg-surface"
          style={{
            boxShadow:
              'inset 0 1px 2px rgba(255,255,255,0.7), inset 0 -1px 3px rgba(20,20,26,0.06), 0 1px 4px rgba(20,20,26,0.1)',
          }}
          aria-hidden="true"
          animate={
            !prefersReducedMotion && !isDragging
              ? { scale: [1, 1.008, 1] }
              : { scale: 1 }
          }
          transition={
            !prefersReducedMotion && !isDragging
              ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.2 }
          }
        />
        {/* Face — inner boundary, sits just outside the destination bubbles */}
        <div className="absolute inset-8 rounded-full border border-line sm:inset-10" aria-hidden="true" />

        {/* Tick marks around the bezel */}
        {TICKS.map((tick) => (
          <div
            key={tick.deg}
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: tick.isMajor ? 2 : 1,
              height: tick.isMajor ? 12 : 7,
              background: tick.isMajor ? '#14141A' : 'rgba(20,20,26,0.25)',
              transform: `translate(-50%, -${TICK_RADIUS_PX}px) rotate(${tick.deg}deg)`,
              transformOrigin: `50% ${TICK_RADIUS_PX}px`,
            }}
          />
        ))}

        {/* Needle — one shaft, one tip, points at the active destination */}
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 origin-left"
          style={{
            width: NEEDLE_LENGTH_PX,
            height: 0,
            transform: `rotate(${needleAngle}deg)`,
            transition: isDragging
              ? 'none'
              : `transform ${prefersReducedMotion ? '0.15s ease' : '0.5s cubic-bezier(0.16,1,0.3,1)'}`,
          }}
          aria-hidden="true"
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: -1.5,
              width: NEEDLE_LENGTH_PX - 9,
              height: 3,
              background: '#3454D1',
              borderRadius: 2,
              opacity: 0.9,
            }}
          />
          <div
            style={{
              position: 'absolute',
              left: NEEDLE_LENGTH_PX - 10,
              top: -6,
              width: 0,
              height: 0,
              borderTop: '6px solid transparent',
              borderBottom: '6px solid transparent',
              borderLeft: '11px solid #3454D1',
              opacity: 0.9,
            }}
          />
        </div>

        {COMPASS_NODES.map((node) => {
          const state = nodeStates.find((s) => s.direction === node.direction);
          const Icon = DIRECTION_ICONS[node.direction];
          const Arrow = CARDINAL_ARROW[node.direction];
          const isActive = activeDestination === node.direction;
          const pos = NODE_POSITIONS[node.direction];

          return (
            <button
              key={node.direction}
              type="button"
              aria-label={node.label}
              aria-pressed={isActive}
              onClick={() => announceAndSelect(node.direction)}
              className={`absolute left-1/2 top-1/2 flex h-[76px] w-[76px] flex-col items-center justify-center gap-0.5 rounded-full border bg-surface text-center transition-colors ${
                isActive ? 'opacity-100' : 'opacity-80'
              }`}
              style={{
                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
                borderColor: isActive ? '#3454D1' : 'rgba(20,20,26,0.08)',
                background: isActive ? '#E8ECFB' : '#FFFFFF',
              }}
            >
              {isActive && !prefersReducedMotion && (
                <motion.span
                  key={activeDestination}
                  className="absolute inset-0 rounded-full border border-accent-blue"
                  initial={{ scale: 0.75, opacity: 0.6 }}
                  animate={{ scale: 1.3, opacity: 0 }}
                  transition={{ duration: 0.55, ease: 'easeOut' }}
                  aria-hidden="true"
                />
              )}
              <motion.span
                animate={
                  prefersReducedMotion
                    ? undefined
                    : { scale: state?.scale ?? 1, opacity: state?.opacity ?? 1 }
                }
                transition={{ type: 'tween', duration: 0.12 }}
                className="flex flex-col items-center gap-0.5"
              >
                <span className="text-[9px] font-semibold tracking-wide text-accent-blue">
                  {CARDINAL_LETTER[node.direction]}
                </span>
                <Icon size={17} />
                <span className="text-[11px] font-medium leading-tight text-ink-soft">
                  {node.label}
                </span>
                <Arrow size={11} className="text-muted" aria-hidden="true" />
              </motion.span>
            </button>
          );
        })}

        {/* Center — the AI Guide. Drag navigates; a plain tap opens SHOPPR AI. */}
        <button
          type="button"
          aria-label="SHOPPR guide — drag toward a destination, or tap to open SHOPPR AI"
          onPointerDown={handlePointerDown}
          onKeyDown={handleGuideKeyDown}
          className="absolute left-1/2 top-1/2 z-10 h-16 w-16 rounded-full shadow-floating"
          style={{
            transform: `translate(-50%, -50%) translate(${dragOffset.x}px, ${dragOffset.y}px)`,
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <AiGuide isActive={activeDestination === 'east'} />
        </button>
      </div>

      <p className="mt-4 min-h-[1.2em] text-sm font-medium text-accent-blue" aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}
