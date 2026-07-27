'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface AiGuideProps {
  /** True when the SHOPPR AI destination is the active one. */
  isActive: boolean;
}

/**
 * Deliberately minimal: a flat orb, two dot eyes, one small blue
 * "compass core." No mouth, no cartoon/robot styling. Eyes shift to
 * SHOPPR blue and the guide gets a very slight lift when AI is active —
 * that's the whole "expressive" range, on purpose.
 */
export function AiGuide({ isActive }: AiGuideProps) {
  const prefersReducedMotion = useReducedMotion();
  const eyeColor = isActive ? '#3454D1' : '#F7F6F3';

  const blinkAnimation = prefersReducedMotion
    ? undefined
    : { scaleY: [1, 1, 0.15, 1, 1] };
  const blinkTransition = { duration: 4.5, repeat: Infinity, ease: 'easeInOut' as const };

  return (
    <motion.div
      className="relative h-full w-full rounded-full bg-ink"
      animate={isActive ? { scale: 1.04 } : { scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="absolute inset-[3px] rounded-full border border-paper/15" />

      <motion.span
        aria-hidden="true"
        className="absolute left-[19px] top-[24px] block h-[6px] w-[6px] rounded-full"
        style={{ background: eyeColor }}
        animate={blinkAnimation}
        transition={blinkTransition}
      />
      <motion.span
        aria-hidden="true"
        className="absolute right-[19px] top-[24px] block h-[6px] w-[6px] rounded-full"
        style={{ background: eyeColor }}
        animate={blinkAnimation}
        transition={blinkTransition}
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-[33px] block h-[5px] w-[5px] -translate-x-1/2 rounded-full bg-accent-blue"
      />
    </motion.div>
  );
}
