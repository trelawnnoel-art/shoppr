'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import type {
  ElementType,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Dancing_Script, Cormorant_Garamond } from 'next/font/google';
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

const shopprScript = Dancing_Script({ subsets: ['latin'], weight: '700' });
const sloganFont = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['italic'],
});

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

const CARDINAL_ARROW: Record<Direction, ElementType> = {
  north: ChevronUp,
  west: ChevronLeft,
  east: ChevronRight,
  south: ChevronDown,
};

const NODE_POSITIONS: Record<Direction, { x: number; y: number }> = {
  north: { x: 0, y: -100 },
  west: { x: -100, y: 0 },
  east: { x: 100, y: 0 },
  south: { x: 0, y: 100 },
};

const TICK_RADIUS_PX = 140;
const TICK_COUNT = 48;
const TICKS = Array.from({ length: TICK_COUNT }, (_, i) => {
  const deg = i * (360 / TICK_COUNT);
  const tier: 'major' | 'mid' | 'fine' =
    deg % 90 === 0 ? 'major' : deg % 30 === 0 ? 'mid' : 'fine';
  return { deg, tier };
});

const TAP_MOVEMENT_THRESHOLD_PX = 6;
const NEEDLE_LENGTH_PX = 56;
const LID_OPEN_DELAY_S = 0.35;
const LID_OPEN_DURATION_S = 3;
const LID_OPEN_ROTATE_DEG = -108;

/** Builds an SVG arc `d` path between two bearing angles (0deg = 12 o'clock, clockwise-positive). */
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number, sweep: 0 | 1) {
  const toPoint = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.sin(rad), y: cy - r * Math.cos(rad) };
  };
  const start = toPoint(startDeg);
  const end = toPoint(endDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} ${sweep} ${end.x} ${end.y}`;
}

/** Arc length in viewBox units, for sizing textLength so text can't overflow/clip past the path's ends. */
function arcLength(r: number, spanDeg: number) {
  return r * ((spanDeg * Math.PI) / 180);
}

// Top arc sweeps left-to-right over the top (clockwise) so the slogan reads
// upright, outward-curving. Bottom arc sweeps left-to-right under the
// bottom (counter-clockwise in bearing terms) so its text also reads
// upright rather than upside-down. Span widened to 130deg (from an earlier
// 110deg) to give the longer top line enough room before textLength forcing.
const LID_ARC_RADIUS = 38;
const LID_ARC_SPAN_DEG = 130;
const LID_TOP_ARC = arcPath(50, 50, LID_ARC_RADIUS, -LID_ARC_SPAN_DEG / 2, LID_ARC_SPAN_DEG / 2, 1);
const LID_BOTTOM_ARC = arcPath(
  50,
  50,
  LID_ARC_RADIUS,
  180 + LID_ARC_SPAN_DEG / 2,
  180 - LID_ARC_SPAN_DEG / 2,
  0
);
// textLength (with lengthAdjust) forces each string to fit within a fixed
// fraction of the arc's own geometric length, so it can never clip past the
// path's start/end regardless of the font actually rendering it.
const LID_TOP_ARC_TEXT_LENGTH = arcLength(LID_ARC_RADIUS, LID_ARC_SPAN_DEG) * 0.92;
const LID_BOTTOM_ARC_TEXT_LENGTH = arcLength(LID_ARC_RADIUS, LID_ARC_SPAN_DEG) * 0.4;
const LID_SLOGAN_TOP = 'Anything. Any Store.';
const LID_SLOGAN_BOTTOM = 'Today.';

const BRASS = '#C9A227';
const BRASS_LIGHT = '#E4C874';
const BRASS_DEEP = '#8C6D28';
const INK_FACE = '#1C1A17';
const INK_FACE_DEEP = '#111010';
const CREAM = '#F3EAD8';

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
  const [hasInteracted, setHasInteracted] = useState(false);
  const [lidOpened, setLidOpened] = useState(false);

  const dragDistance = Math.hypot(dragOffset.x, dragOffset.y);
  const dragAngle = angleFromVector(dragOffset.x, dragOffset.y);

  const activeAngle =
    COMPASS_NODES.find((n) => n.direction === activeDestination)?.angle ?? 0;
  const needleAngle = isDragging && dragDistance > 0 ? dragAngle : activeAngle;
  const isSweeping = !hasInteracted && !isDragging && !prefersReducedMotion;

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
      setHasInteracted(true);
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

      <motion.div
        ref={containerRef}
        role="group"
        aria-label="SHOPPR compass navigation"
        className="relative h-[19rem] w-[19rem] touch-none sm:h-[22rem] sm:w-[22rem] lg:h-[24rem] lg:w-[24rem]"
        style={{ touchAction: 'none' }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: prefersReducedMotion ? 0.2 : 0.55, ease: [0.16, 1, 0.3, 1] }}
        onPointerMove={(e) => isDragging && handlePointerMove(e.clientX, e.clientY)}
        onPointerUp={handlePointerUp}
        onPointerCancel={resetDrag}
        onKeyDown={handleGroupKeyDown}
      >
        {/* Ambient layer: continuous slow counter-clockwise idle spin (CSS keyframe, always running). */}
        <div
          className={`absolute inset-0 rounded-full ${!prefersReducedMotion ? 'animate-bezel-spin' : ''}`}
          aria-hidden="true"
        >
          {/* Kick layer: counter-rotates opposite the needle, same timing as the needle's own turn. */}
          <motion.div
            className="absolute inset-0 rounded-full border-2"
            style={{
              borderColor: 'rgba(201,162,39,0.45)',
              background: `radial-gradient(circle at 34% 28%, #2A2622 0%, ${INK_FACE} 55%, ${INK_FACE_DEEP} 100%)`,
              boxShadow:
                'inset 0 1px 2px rgba(228,200,116,0.15), inset 0 -1px 3px rgba(0,0,0,0.4), 0 1px 4px rgba(0,0,0,0.25)',
            }}
            animate={
              !prefersReducedMotion
                ? { scale: !isDragging ? [1, 1.008, 1] : 1, rotate: -needleAngle }
                : { scale: 1, rotate: 0 }
            }
            transition={
              !prefersReducedMotion
                ? {
                    scale: !isDragging
                      ? { duration: 3.2, repeat: Infinity, ease: 'easeInOut' }
                      : { duration: 0.2 },
                    rotate: isDragging
                      ? { duration: 0 }
                      : { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
                  }
                : { duration: 0.2 }
            }
          >
            {TICKS.map((tick) => {
              const size =
                tick.tier === 'major'
                  ? { width: 2, height: 13, color: CREAM }
                  : tick.tier === 'mid'
                    ? { width: 1.5, height: 9, color: 'rgba(243,234,216,0.45)' }
                    : { width: 1, height: 5, color: 'rgba(243,234,216,0.2)' };
              return (
                <div
                  key={tick.deg}
                  aria-hidden="true"
                  style={{
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    width: size.width,
                    height: size.height,
                    background: size.color,
                    transform: `translate(-50%, -${TICK_RADIUS_PX}px) rotate(${tick.deg}deg)`,
                    transformOrigin: `50% ${TICK_RADIUS_PX}px`,
                  }}
                />
              );
            })}
          </motion.div>
        </div>

        <div
          className="absolute inset-8 rounded-full border sm:inset-10"
          style={{ borderColor: 'rgba(201,162,39,0.25)' }}
          aria-hidden="true"
        />

        <svg
          aria-hidden="true"
          width="16"
          height="16"
          viewBox="0 0 32 32"
          className="absolute left-1/2 opacity-[0.22]"
          style={{ bottom: '17%', transform: 'translateX(-50%)' }}
        >
          <path d="M16 2 L20 16 L16 30 L12 16 Z" fill={CREAM} />
          <path d="M2 16 L16 12 L30 16 L16 20 Z" fill={BRASS} />
        </svg>

        <div
          className={`pointer-events-none absolute left-1/2 top-1/2 origin-left ${
            isSweeping ? 'animate-sweep' : ''
          }`}
          style={{
            width: NEEDLE_LENGTH_PX,
            height: 0,
            ...(!isSweeping && {
              transform: `rotate(${needleAngle}deg)`,
              transition: isDragging
                ? 'none'
                : `transform ${prefersReducedMotion ? '0.15s ease' : '0.5s cubic-bezier(0.16,1,0.3,1)'}`,
            }),
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
              background: BRASS,
              borderRadius: 2,
              opacity: 0.95,
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
              borderLeft: `11px solid ${BRASS}`,
              opacity: 0.95,
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
              className={`absolute left-1/2 top-1/2 flex h-[76px] w-[76px] flex-col items-center justify-center gap-0.5 rounded-full border text-center transition-colors ${
                isActive ? 'opacity-100' : 'opacity-85'
              }`}
              style={{
                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px)`,
                borderColor: isActive ? BRASS : 'rgba(243,234,216,0.18)',
                background: isActive ? '#332C1A' : '#242220',
              }}
            >
              {isActive && !prefersReducedMotion && (
                <motion.span
                  key={activeDestination}
                  className="absolute inset-0 rounded-full border"
                  style={{ borderColor: BRASS }}
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
                style={{ color: CREAM }}
              >
                <span className="text-[9px] font-semibold tracking-wide" style={{ color: BRASS_LIGHT }}>
                  {CARDINAL_LETTER[node.direction]}
                </span>
                <Icon size={17} />
                <span className="text-[11px] font-medium leading-tight" style={{ color: CREAM }}>
                  {node.label}
                </span>
                <Arrow size={11} style={{ color: 'rgba(243,234,216,0.55)' }} aria-hidden="true" />
              </motion.span>
            </button>
          );
        })}

        <button
          type="button"
          aria-label="SHOPPR guide — drag toward a destination, or tap to open SHOPPR AI"
          onPointerDown={handlePointerDown}
          onKeyDown={handleGuideKeyDown}
          className="absolute left-1/2 top-1/2 z-10 h-10 w-10 rounded-full shadow-floating"
          style={{
            transform: `translate(-50%, -50%) translate(${dragOffset.x}px, ${dragOffset.y}px)`,
            cursor: isDragging ? 'grabbing' : 'grab',
            transition: isDragging ? 'none' : 'transform 0.5s cubic-bezier(0.16,1,0.3,1)',
          }}
        >
          <AiGuide isActive={activeDestination === 'east'} />
        </button>

        {!prefersReducedMotion && !lidOpened && (
          <div
            className="absolute inset-0"
            style={{ perspective: 1400, zIndex: 20 }}
            aria-hidden="true"
          >
            <motion.div
              className="absolute inset-0 rounded-full"
              style={{
                transformOrigin: 'top center',
                backfaceVisibility: 'hidden',
                background: `radial-gradient(circle at 32% 22%, ${BRASS_LIGHT} 0%, ${BRASS} 45%, ${BRASS_DEEP} 100%)`,
                boxShadow:
                  '0 14px 32px -8px rgba(0,0,0,0.5), inset 0 1px 2px rgba(255,255,255,0.35), inset 0 -3px 8px rgba(0,0,0,0.35)',
              }}
              initial={{ rotateX: 0 }}
              animate={{ rotateX: LID_OPEN_ROTATE_DEG }}
              transition={{
                delay: LID_OPEN_DELAY_S,
                duration: LID_OPEN_DURATION_S,
                ease: [0.65, 0, 0.35, 1],
              }}
              onAnimationComplete={() => setLidOpened(true)}
            >
              <svg
                viewBox="0 0 100 100"
                className="absolute inset-0 h-full w-full"
                aria-hidden="true"
              >
                <path id="lid-top-arc" d={LID_TOP_ARC} fill="none" />
                <path id="lid-bottom-arc" d={LID_BOTTOM_ARC} fill="none" />
                <text
                  className={sloganFont.className}
                  fontSize="6"
                  fontStyle="italic"
                  fontWeight={600}
                  fill={INK_FACE}
                  opacity={0.75}
                >
                  <textPath
                    href="#lid-top-arc"
                    xlinkHref="#lid-top-arc"
                    startOffset="50%"
                    textAnchor="middle"
                    textLength={LID_TOP_ARC_TEXT_LENGTH}
                    lengthAdjust="spacingAndGlyphs"
                  >
                    {LID_SLOGAN_TOP}
                  </textPath>
                </text>
                <text
                  className={sloganFont.className}
                  fontSize="6"
                  fontStyle="italic"
                  fontWeight={600}
                  fill={INK_FACE}
                  opacity={0.75}
                >
                  <textPath
                    href="#lid-bottom-arc"
                    xlinkHref="#lid-bottom-arc"
                    startOffset="50%"
                    textAnchor="middle"
                    textLength={LID_BOTTOM_ARC_TEXT_LENGTH}
                    lengthAdjust="spacingAndGlyphs"
                  >
                    {LID_SLOGAN_BOTTOM}
                  </textPath>
                </text>
              </svg>
              <div
                aria-hidden="true"
                className={`${shopprScript.className} absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap text-2xl sm:text-3xl`}
                style={{ color: INK_FACE }}
              >
                ShoppR
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>

      <p className="mt-4 min-h-[1.2em] text-sm font-medium" style={{ color: BRASS_DEEP }} aria-live="polite">
        {statusMessage}
      </p>
    </div>
  );
}
