'use client';

import { motion, useReducedMotion } from 'framer-motion';

interface AiGuideProps {
  isActive: boolean;
}

export function AiGuide({ isActive }: AiGuideProps) {
  const prefersReducedMotion = useReducedMotion();
  const eyeColor = isActive ? '#C9A227' : '#F7F6F3';

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
      <div className="absolute inset-[2px] rounded-full border border-paper/15" />

      <motion.span
        aria-hidden="true"
        className="absolute left-[11px] top-[14px] block h-[4px] w-[4px] rounded-full"
        style={{ background: eyeColor }}
        animate={blinkAnimation}
        transition={blinkTransition}
      />
      <motion.span
        aria-hidden="true"
        className="absolute right-[11px] top-[14px] block h-[4px] w-[4px] rounded-full"
        style={{ background: eyeColor }}
        animate={blinkAnimation}
        transition={blinkTransition}
      />
      <span
        aria-hidden="true"
        className="absolute left-1/2 top-[20px] block h-[3px] w-[3px] -translate-x-1/2 rounded-full"
        style={{ background: '#C9A227' }}
      />
    </motion.div>
  );
}
