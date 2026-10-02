'use client';

import { useRef, useState } from 'react';
import type { ChangeEvent, FormEvent, ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { Image as ImageIcon, Link as LinkIcon, Loader2, Sparkles, X } from 'lucide-react';
import type { Direction } from './compass/compass-logic';
import type { Mission, Product, Store } from '@/data/types';
import { aiSuggestions, aiTools, categories } from '@/data/mock-data';
import { useFetch } from '@/lib/useFetch';
import { SectionHeader } from './SectionHeader';
import { StoreCard } from './StoreCard';
import { ProductCard } from './ProductCard';
import { MissionCard } from './MissionCard';
import { MapPlaceholder } from './MapPlaceholder';
import {
  BASE_HEIGHT_CM,
  BASE_WEIGHT_KG,
  MIN_HEIGHT_CM,
  MAX_HEIGHT_CM,
  MIN_WEIGHT_KG,
  MAX_WEIGHT_KG,
  type AvatarOutfit,
} from './avatar/AvatarCharacter';

// Phase 2: a small preset palette per garment, standing in for "pull colors
// from a store's product" until real product data drives this. Each row is
// swatch value -> the outfit field it sets.
const SHIRT_SWATCHES = ['#3454D1', '#E14D4D', '#2E8B57', '#1C1A17', '#F2C230'];
const PANTS_SWATCHES = ['#14141A', '#4A4A52', '#5B3A29', '#2B4C6F'];
const SHOE_SWATCHES = ['#6B4630', '#1C1A17', '#F5F5F0', '#B23A2E'];
// Cartoon-polish pass: skin/hair color were already in AvatarOutfit's data
// layer (Phase 2) but never exposed in the UI — this is the "needs variety"
// fix that doesn't require new geometry, just wiring up what already exists.
const SKIN_SWATCHES = ['#E8C9A0', '#F5D7B8', '#C98F5E', '#8D5A3B', '#4A2E1E'];
const HAIR_SWATCHES = ['#2E2118', '#6B4226', '#B8893A', '#1C1A17', '#D9A441'];

// R3F's Canvas needs a browser (WebGL context, ResizeObserver) and this app
// otherwise server-renders, so the avatar scene is loaded client-only.
//
// Renders our own procedural character (AvatarCharacter) — the path we
// committed to for the full clothing-fit/sizing/pose feature set, since the
// Hitem3D-generated .glb models (see model-paths.ts, AvatarModelScene.tsx)
// have no skeleton/rig and no body/clothing separation to build on. Phase 1
// of that plan (parametric height/weight sizing) lives in AvatarCharacter.tsx.
const AvatarScene = dynamic(() => import('./avatar/AvatarScene').then((mod) => mod.AvatarScene), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center text-xs text-muted">
      Loading guide…
    </div>
  ),
});

// Selfie-based "Realistic" style — see RealisticAvatarScene.tsx for the
// Avaturn SDK integration. Renders an honest "not connected" placeholder
// on its own until NEXT_PUBLIC_AVATURN_SUBDOMAIN is set in .env.
const RealisticAvatarScene = dynamic(
  () => import('./avatar/RealisticAvatarScene').then((mod) => mod.RealisticAvatarScene),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-64 items-center justify-center text-xs text-muted sm:h-72">
        Loading…
      </div>
    ),
  }
);

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
  const products = useFetch<Product[]>('/api/products');
  const stores = useFetch<Store[]>('/api/stores');

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
        <AsyncRow items={products} render={(p) => <ProductCard key={p.id} product={p} />} />
      </section>

      <section>
        <SectionHeader title="Popular Missions this week" />
        <AsyncRow
          items={stores}
          slice={4}
          render={(s) => <StoreCard key={s.id} store={s} />}
        />
      </section>
    </div>
  );
}

function StoresView() {
  const stores = useFetch<Store[]>('/api/stores');

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <SectionHeader eyebrow="Nearby" title="Stores around you" />
      <MapPlaceholder />
      {stores.isLoading && <LoadingNote />}
      {stores.error && <ErrorNote message={stores.error} />}
      {stores.data && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {stores.data.map((s) => (
            <StoreCard key={s.id} store={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function AiView() {
  const [prompt, setPrompt] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [resultProducts, setResultProducts] = useState<Product[] | null>(null);
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [screenshotName, setScreenshotName] = useState<string | null>(null);
  const [showLinkField, setShowLinkField] = useState(false);
  const [productLink, setProductLink] = useState('');
  const [heightCm, setHeightCm] = useState(BASE_HEIGHT_CM);
  const [weightKg, setWeightKg] = useState(BASE_WEIGHT_KG);
  const [outfit, setOutfit] = useState<AvatarOutfit>({});
  const [previewMode, setPreviewMode] = useState(false);
  const [avatarStyle, setAvatarStyle] = useState<'cartoon' | 'realistic'>('cartoon');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isThinking) return;
    setIsThinking(true);
    setResultProducts(null);
    setResultMessage(null);
    setSearchError(null);

    try {
      const res = await fetch('/api/ai-search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `Search failed (${res.status})`);
      setResultMessage(data.message);
      setResultProducts(data.products);
    } catch (err) {
      setSearchError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsThinking(false);
    }
  };

  function handleScreenshotChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setScreenshotName(file ? file.name : null);
  }

  return (
    <div className="flex flex-col gap-6 animate-fade-in">
      <SectionHeader eyebrow="SHOPPR AI · Prototype" title="Tell it what you need" />

      <section>
        <div className="relative mx-auto mb-3 w-fit max-w-[85%] rounded-2xl border border-line bg-surface px-4 py-2.5 shadow-card">
          <p className="text-center text-sm text-ink-soft">
            What&rsquo;s the vibe we&rsquo;re going for today?
          </p>
          <span
            aria-hidden="true"
            className="absolute left-1/2 top-full h-3 w-3 -translate-x-1/2 -translate-y-1.5 rotate-45 border-b border-r border-line bg-surface"
          />
        </div>

        <div className="mb-3 flex items-center justify-center gap-2">
          <span className="text-xs font-medium text-muted">Avatar style:</span>
          <button
            type="button"
            onClick={() => setAvatarStyle('cartoon')}
            aria-pressed={avatarStyle === 'cartoon'}
            className={`rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors ${
              avatarStyle === 'cartoon'
                ? 'bg-ink text-paper'
                : 'border border-line bg-surface text-ink-soft'
            }`}
          >
            Cartoon
          </button>
          <button
            type="button"
            onClick={() => setAvatarStyle('realistic')}
            aria-pressed={avatarStyle === 'realistic'}
            className={`rounded-pill px-3 py-1.5 text-xs font-semibold transition-colors ${
              avatarStyle === 'realistic'
                ? 'bg-ink text-paper'
                : 'border border-line bg-surface text-ink-soft'
            }`}
          >
            Realistic
          </button>
        </div>

        {avatarStyle === 'cartoon' ? (
          <>
            <div className="h-64 overflow-hidden rounded-card border border-line bg-surface shadow-card sm:h-72">
              <AvatarScene
                heightCm={heightCm}
                weightKg={weightKg}
                outfit={outfit}
                previewMode={previewMode}
              />
            </div>
            <div className="mt-2 flex items-center justify-center gap-3">
              <p className="text-center text-xs text-muted">Drag to rotate the guide</p>
              <button
                type="button"
                onClick={() => setPreviewMode((v) => !v)}
                aria-pressed={previewMode}
                className={`rounded-pill px-3 py-1 text-xs font-semibold transition-colors ${
                  previewMode ? 'bg-ink text-paper' : 'border border-line bg-surface text-ink-soft'
                }`}
              >
                {previewMode ? 'Preview mode: on' : 'Preview mode'}
              </button>
            </div>
          </>
        ) : (
          <RealisticAvatarScene />
        )}

        {avatarStyle === 'cartoon' && (
        <div className="mt-3 flex flex-col gap-3 rounded-card border border-line bg-surface p-3">
          <div className="flex items-center justify-between gap-3">
            <label htmlFor="avatar-height" className="text-xs font-medium text-ink-soft">
              Height
            </label>
            <span className="text-xs text-muted">{heightCm} cm</span>
          </div>
          <input
            id="avatar-height"
            type="range"
            min={MIN_HEIGHT_CM}
            max={MAX_HEIGHT_CM}
            value={heightCm}
            onChange={(e) => setHeightCm(Number(e.target.value))}
            className="w-full accent-ink"
          />

          <div className="flex items-center justify-between gap-3">
            <label htmlFor="avatar-weight" className="text-xs font-medium text-ink-soft">
              Weight
            </label>
            <span className="text-xs text-muted">{weightKg} kg</span>
          </div>
          <input
            id="avatar-weight"
            type="range"
            min={MIN_WEIGHT_KG}
            max={MAX_WEIGHT_KG}
            value={weightKg}
            onChange={(e) => setWeightKg(Number(e.target.value))}
            className="w-full accent-ink"
          />

          <SwatchRow
            label="Skin"
            swatches={SKIN_SWATCHES}
            value={outfit.skinColor}
            onChange={(skinColor) => setOutfit((o) => ({ ...o, skinColor }))}
          />
          <SwatchRow
            label="Hair"
            swatches={HAIR_SWATCHES}
            value={outfit.hairColor}
            onChange={(hairColor) => setOutfit((o) => ({ ...o, hairColor }))}
          />
          <SwatchRow
            label="Shirt"
            swatches={SHIRT_SWATCHES}
            value={outfit.shirtColor}
            onChange={(shirtColor) => setOutfit((o) => ({ ...o, shirtColor }))}
          />
          <SwatchRow
            label="Pants"
            swatches={PANTS_SWATCHES}
            value={outfit.pantsColor}
            onChange={(pantsColor) => setOutfit((o) => ({ ...o, pantsColor }))}
          />
          <SwatchRow
            label="Shoes"
            swatches={SHOE_SWATCHES}
            value={outfit.shoeColor}
            onChange={(shoeColor) => setOutfit((o) => ({ ...o, shoeColor }))}
          />
        </div>
        )}
      </section>

      <form onSubmit={handleSubmit} className="rounded-card border border-line bg-surface p-4 shadow-card">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe what you're looking for…"
          rows={3}
          className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-muted focus:outline-none"
        />

        {screenshotName && (
          <div className="mb-2 flex w-fit items-center gap-1.5 rounded-pill bg-accent-blue-soft px-3 py-1 text-xs font-medium text-accent-blue">
            {screenshotName}
            <button
              type="button"
              aria-label="Remove screenshot"
              onClick={() => {
                setScreenshotName(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <X size={12} />
            </button>
          </div>
        )}

        {showLinkField && (
          <input
            type="url"
            value={productLink}
            onChange={(e) => setProductLink(e.target.value)}
            placeholder="Paste a product link…"
            className="mb-2 w-full rounded-pill border border-line bg-paper px-3 py-2 text-xs text-ink placeholder:text-muted focus:border-accent-blue focus:outline-none"
          />
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleScreenshotChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-xs font-medium text-ink-soft"
            >
              <ImageIcon size={14} /> Screenshot
            </button>
            <button
              type="button"
              onClick={() => setShowLinkField((v) => !v)}
              className="flex items-center gap-1.5 rounded-pill border border-line px-3 py-1.5 text-xs font-medium text-ink-soft"
            >
              <LinkIcon size={14} /> Product link
            </button>
          </div>
          <button
            type="submit"
            disabled={isThinking}
            className="flex items-center gap-1.5 rounded-pill bg-ink px-4 py-2 text-xs font-semibold text-paper disabled:opacity-60"
          >
            {isThinking ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Sparkles size={14} />
            )}
            {isThinking ? 'Thinking…' : 'Shop for me'}
          </button>
        </div>
      </form>

      {isThinking && (
        <div className="flex items-center gap-2 text-sm text-muted">
          <Loader2 size={14} className="animate-spin" />
          SHOPPR AI is checking nearby stores…
        </div>
      )}

      {searchError && !isThinking && <ErrorNote message={searchError} />}

      {resultProducts && !isThinking && (
        <section>
          {resultMessage && <p className="mb-3 text-sm text-ink-soft">{resultMessage}</p>}
          {resultProducts.length > 0 && (
            <div className="scroll-row -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">
              {resultProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </section>
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

function SwatchRow({
  label,
  swatches,
  value,
  onChange,
}: {
  label: string;
  swatches: string[];
  value: string | undefined;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-medium text-ink-soft">{label}</span>
      <div className="flex gap-1.5">
        {swatches.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${label} color ${color}`}
            aria-pressed={value === color}
            onClick={() => onChange(color)}
            style={{ backgroundColor: color }}
            className={`h-6 w-6 rounded-full border-2 transition-transform ${
              value === color ? 'scale-110 border-ink' : 'border-line'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function DeliveryView() {
  const missions = useFetch<Mission[]>('/api/missions');

  if (missions.isLoading) return <LoadingNote />;
  if (missions.error) return <ErrorNote message={missions.error} />;
  if (!missions.data) return null;

  const activeMissions = missions.data.filter((m) => m.status !== 'complete');
  const pastMissions = missions.data.filter((m) => m.status === 'complete');

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

function LoadingNote() {
  return <p className="text-sm text-muted">Loading…</p>;
}

function ErrorNote({ message }: { message: string }) {
  return <p className="text-sm text-red-600">Couldn&rsquo;t load this — {message}</p>;
}

function AsyncRow<T>({
  items,
  render,
  slice,
}: {
  items: { data: T[] | null; isLoading: boolean; error: string | null };
  render: (item: T) => ReactNode;
  slice?: number;
}) {
  if (items.isLoading) return <LoadingNote />;
  if (items.error) return <ErrorNote message={items.error} />;
  if (!items.data) return null;

  const list = slice ? items.data.slice(0, slice) : items.data;
  return (
    <div className="scroll-row -mx-1 flex gap-4 overflow-x-auto px-1 pb-1">{list.map(render)}</div>
  );
}
