'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { Image as ImageIcon, Link as LinkIcon, Sparkles } from 'lucide-react';
import type { Direction } from './compass/compass-logic';
import { aiSuggestions, aiTools, categories, missions, products, stores } from '@/data/mock-data';
import { SectionHeader } from './SectionHeader';
import { StoreCard } from './StoreCard';
import { ProductCard } from './ProductCard';
import { MissionCard } from './MissionCard';
import { MapPlaceholder } from './MapPlaceholder';

export function DestinationContent({ destination }: { destination: Direction }) {
  switch (destination) {
    case 'north':
      return <DiscoverView />;
    case 'west':
      return <StoresView />;
    case 'east':
      return <AiView />;
    case 'south':
      return <DeliveryView />;
    default:
      return null;
  }
}

function DiscoverView() {
  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <section>
        <SectionHeader eyebrow="Discover" title="Trending categories" />
        <div className="scroll-row -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {categories.map((c) => (
            <span
              key={c}
              className="shrink-0 rounded-pill border border-line bg-surface px-4 py-2 text-sm font-medium text-ink-soft"
            >
              {c}
            </span>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Need it today?" />
        <div className="scroll-row -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
          {products.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="Popular Missions this week" />
        <div className="scroll-row -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
          {stores.slice(0, 4).map((s) => (
            <StoreCard key={s.id} store={s} />
          ))}
        </div>
      </section>
    </div>
  );
}

function StoresView() {
  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <SectionHeader eyebrow="Nearby" title="Stores around you" />
      <MapPlaceholder />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {stores.map((s) => (
          <StoreCard key={s.id} store={s} />
        ))}
      </div>
    </div>
  );
}

function AiView() {
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setResult(
      `Prototype result — SHOPPR AI would search nearby stores for: "${prompt.trim()}"`
    );
  };

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <SectionHeader eyebrow="SHOPPR AI · Prototype" title="Tell it what you need" />

      <form onSubmit={handleSubmit} className="rounded-card border border-line bg-surface p-4 shadow-card">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you're looking for…"
          rows={3}
          className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex gap-2">
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-xs font-medium text-ink-soft"
            >
              <ImageIcon size={14} /> Screenshot
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-xs font-medium text-ink-soft"
            >
              <LinkIcon size={14} /> Product link
            </button>
          </div>
          <button
            type="submit"
            className="flex items-center gap-1.5 rounded-pill bg-ink px-4 py-2 text-xs font-semibold text-paper"
          >
            <Sparkles size={14} /> Shop for me
          </button>
        </div>
      </form>

      {result && (
        <div className="rounded-card border border-accent-blue-soft bg-accent-blue-soft p-4 text-sm text-accent-blue">
          {result}
        </div>
      )}

      <section>
        <SectionHeader title="Suggested prompts" />
        <div className="flex flex-wrap gap-2">
          {aiSuggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setPrompt(s.prompt)}
              className="rounded-pill border border-line bg-surface px-3 py-2 text-xs font-medium text-ink-soft"
            >
              {s.prompt}
            </button>
          ))}
        </div>
      </section>

      <section>
        <SectionHeader title="AI tools" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {aiTools.map((tool) => (
            <div key={tool.id} className="rounded-card border border-line bg-surface p-4">
              <p className="text-sm font-semibold text-ink">{tool.name}</p>
              <p className="mt-1 text-xs text-muted">{tool.description}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function DeliveryView() {
  const activeMissions = missions.filter((m) => m.status !== 'complete');
  const pastMissions = missions.filter((m) => m.status === 'complete');

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      <section>
        <SectionHeader eyebrow="Delivery" title={`Active Missions — ${activeMissions.length}`} />
        <div className="flex flex-col gap-4">
          {activeMissions.map((m) => (
            <MissionCard key={m.id} mission={m} />
          ))}
        </div>
      </section>

      {pastMissions.length > 0 && (
        <section>
          <SectionHeader title="Mission history" />
          <div className="flex flex-col gap-4">
            {pastMissions.map((m) => (
              <MissionCard key={m.id} mission={m} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
