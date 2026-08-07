'use client';

import { useEffect, useRef, useState } from 'react';
import { Bell } from 'lucide-react';
import { ShopprLogo } from './ShopprLogo';
import { SearchBar } from './SearchBar';
import { CompassNavigation } from './compass/CompassNavigation';
import type { Direction } from './compass/compass-logic';
import { DestinationContent } from './DestinationContent';
import { ProfilePanel } from './ProfilePanel';
import { MobileNavigation } from './MobileNavigation';
import { quickSuggestions, userProfile } from '@/data/mock-data';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export function HomeExperience() {
  const [activeDestination, setActiveDestination] = useState<Direction>('north');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [greeting, setGreeting] = useState('Good afternoon');
  const [searchValue, setSearchValue] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setGreeting(getGreeting());
  }, []);

  function handleQuickSuggestion(text: string) {
    setSearchValue(text);
    searchInputRef.current?.focus();
  }

  return (
    <div className="pb-24 sm:pb-16">
      {/*
        First screen: logo, greeting, headline, search, compass, quick
        suggestions. Sized to roughly fill the viewport on load so the
        home screen reads as a complete "screen," not a page that
        happens to have a compass partway down it.
      */}
      <div className="flex min-h-[100dvh] flex-col">
        <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-5 pt-6 sm:px-8">
          <div>
            <ShopprLogo />
            <p className="mt-1 text-sm text-muted">
              {greeting}, {userProfile.firstName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Notifications"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-ink-soft"
            >
              <Bell size={18} />
            </button>
            <button
              type="button"
              aria-label="Open your profile"
              onClick={() => setIsProfileOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-xs font-semibold text-paper"
            >
              {userProfile.initials}
            </button>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 sm:px-8">
          <section className="mx-auto w-full max-w-xl pt-6 text-center sm:pt-8">
            <h1 className="font-display text-2xl font-semibold tracking-tight text-ink sm:text-3xl">
              What are you looking for today?
            </h1>
            <div className="mt-5">
              <SearchBar ref={searchInputRef} value={searchValue} onChange={setSearchValue} />
            </div>
          </section>

          <section className="mt-8 sm:mt-10">
            <CompassNavigation
              activeDestination={activeDestination}
              onSelectDestination={setActiveDestination}
            />
          </section>

          <section className="mt-8 flex flex-wrap items-center justify-center gap-2">
            <span className="text-xs font-medium text-muted">Quick:</span>
            {quickSuggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => handleQuickSuggestion(s)}
                className="rounded-pill border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-ink-soft transition-colors hover:border-accent-blue hover:text-accent-blue"
              >
                {s}
              </button>
            ))}
          </section>
        </div>
      </div>

      <main className="mx-auto max-w-5xl px-5 pt-10 sm:px-8 sm:pt-14">
        <section>
          <DestinationContent destination={activeDestination} />
        </section>
      </main>

      <MobileNavigation
        activeDestination={activeDestination}
        onSelectDestination={setActiveDestination}
        onOpenProfile={() => setIsProfileOpen(true)}
      />

      <ProfilePanel
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        profile={userProfile}
      />
    </div>
  );
}
