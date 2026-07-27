'use client';

import { forwardRef, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { searchPrompts } from '@/data/mock-data';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
}

/**
 * Controlled so quick-suggestion chips (in HomeExperience) can fill it.
 * Placeholder still rotates through example prompts on its own.
 */
export const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(function SearchBar(
  { value, onChange },
  ref
) {
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % searchPrompts.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  return (
    <label className="block w-full">
      <span className="sr-only">Search SHOPPR</span>
      <div className="flex items-center gap-3 rounded-pill border border-line bg-surface px-5 py-4 shadow-card transition-colors focus-within:border-accent-blue">
        <Search size={20} className="shrink-0 text-muted" aria-hidden="true" />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={searchPrompts[placeholderIndex]}
          className="w-full bg-transparent text-base text-ink placeholder:text-muted focus:outline-none"
        />
      </div>
    </label>
  );
});
