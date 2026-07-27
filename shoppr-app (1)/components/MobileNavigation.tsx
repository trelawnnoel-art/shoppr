'use client';

import { Compass as CompassIcon, Sparkles, Store, Truck, User } from 'lucide-react';
import type { ElementType } from 'react';
import type { Direction } from './compass/compass-logic';

const ITEMS: { direction: Direction; label: string; icon: ElementType }[] = [
  { direction: 'north', label: 'Discover', icon: CompassIcon },
  { direction: 'west', label: 'Stores', icon: Store },
  { direction: 'east', label: 'AI', icon: Sparkles },
  { direction: 'south', label: 'Delivery', icon: Truck },
];

interface MobileNavigationProps {
  activeDestination: Direction;
  onSelectDestination: (direction: Direction) => void;
  onOpenProfile: () => void;
}

export function MobileNavigation({
  activeDestination,
  onSelectDestination,
  onOpenProfile,
}: MobileNavigationProps) {
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-line bg-surface/90 px-2 py-2 backdrop-blur-md sm:hidden"
    >
      {ITEMS.map(({ direction, label, icon: Icon }) => {
        const isActive = activeDestination === direction;
        return (
          <button
            key={direction}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            onClick={() => onSelectDestination(direction)}
            className="flex flex-col items-center gap-1 rounded-lg px-3 py-1.5"
          >
            <Icon size={20} className={isActive ? 'text-accent-blue' : 'text-muted'} />
            <span className={`text-[11px] font-medium ${isActive ? 'text-accent-blue' : 'text-muted'}`}>
              {label}
            </span>
          </button>
        );
      })}
      <button
        type="button"
        aria-label="Open your profile"
        onClick={onOpenProfile}
        className="flex flex-col items-center gap-1 rounded-lg px-3 py-1.5"
      >
        <User size={20} className="text-muted" />
        <span className="text-[11px] font-medium text-muted">Profile</span>
      </button>
    </nav>
  );
}
