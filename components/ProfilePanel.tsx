'use client';

import { useEffect, useRef } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  Bell,
  ChevronRight,
  CreditCard,
  Heart,
  Package,
  Ruler,
  Shield,
  Store as StoreIcon,
  User,
  X,
} from 'lucide-react';
import type { UserProfile } from '@/data/types';

const LINKS = [
  { label: 'Account', icon: User },
  { label: 'SHOPPR Fit', icon: Ruler },
  { label: 'Saved sizes', icon: Ruler },
  { label: 'Favorite stores', icon: StoreIcon },
  { label: 'Saved items', icon: Heart },
  { label: 'Missions', icon: Package },
  { label: 'Payment methods', icon: CreditCard },
  { label: 'Notifications', icon: Bell },
  { label: 'Privacy settings', icon: Shield },
];

interface ProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
  profile: UserProfile;
}

export function ProfilePanel({ isOpen, onClose, profile }: ProfilePanelProps) {
  const prefersReducedMotion = useReducedMotion();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) closeButtonRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (isOpen) window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  // Lock the page behind the panel so we never get a scrolling page
  // underneath a scrolling panel at the same time.
  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            aria-label="Close profile panel"
            className="fixed inset-0 z-40 bg-ink/30 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: prefersReducedMotion ? 0 : 0.2 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Profile"
            className="fixed bottom-0 left-0 right-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-[28px] bg-surface p-6 shadow-floating sm:bottom-auto sm:right-0 sm:top-0 sm:h-full sm:max-h-none sm:w-[380px] sm:rounded-t-none sm:rounded-l-[28px]"
            initial={prefersReducedMotion ? { opacity: 0 } : { y: '100%' }}
            animate={prefersReducedMotion ? { opacity: 1 } : { y: 0 }}
            exit={prefersReducedMotion ? { opacity: 0 } : { y: '100%' }}
            transition={{ type: 'tween', duration: prefersReducedMotion ? 0.15 : 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="mb-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-sm font-semibold text-paper">
                  {profile.initials}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{profile.firstName}</p>
                  <p className="text-xs text-muted">
                    {profile.savedItemsCount} saved · {profile.favoriteStoresCount} favorite stores
                  </p>
                </div>
              </div>
              <button
                ref={closeButtonRef}
                type="button"
                aria-label="Close"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink-soft"
              >
                <X size={16} />
              </button>
            </div>

            <nav>
              <ul className="flex flex-col">
                {LINKS.map(({ label, icon: Icon }) => (
                  <li key={label}>
                    <button
                      type="button"
                      className="flex w-full items-center justify-between border-b border-line py-3.5 text-left text-sm text-ink"
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={16} className="text-muted" />
                        {label}
                      </span>
                      <ChevronRight size={16} className="text-muted" />
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
