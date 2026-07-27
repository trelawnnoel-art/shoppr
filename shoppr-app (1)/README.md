# SHOPPR v0.1 — Home page + Compass

Next.js (App Router) + TypeScript + Tailwind CSS + Framer Motion + Lucide icons.

## Run it

I couldn't run `npm install` or a build myself — this sandbox has no internet
access. Do this in VS Code:

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`. If `npm install` or `npm run dev` throws
any error, copy/paste it back to me and I'll fix it — I wrote this carefully
but couldn't verify it compiles.

## What's built (Phases 1–4 from the brief)

- **Home page shell** — header (wordmark, greeting, notifications), hero
  headline + rotating-placeholder search bar, compass, dynamic destination
  content, mobile bottom nav fallback.
- **SHOPPR Compass** (`components/compass/`) — tap, drag, and keyboard
  (arrow keys select a destination; Enter/Space on the center opens the
  profile). Distance/angle math lives in `compass-logic.ts`, fully separate
  from the rendering component, with named constants (no magic numbers).
- **Four destination views** — Discover, Nearby Stores, SHOPPR AI (mock
  conversational assistant), Delivery (Mission list with a status pipeline).
- **Profile panel** — slide-up/slide-in drawer with mock account links,
  opened by tapping the compass center.
- **Typed mock data** — `data/mock-data.ts` + `data/types.ts`. Nothing is
  scattered inline in page components.

## Compass state model

```ts
interface CompassState {
  activeDestination: Direction | null;
  isDragging: boolean;
  dragPosition: { x: number; y: number };
  closestDirection: Direction | null;
  dragProgress: number;       // 0–1
  isActivationReached: boolean;
  prefersReducedMotion: boolean;
}
```

In the actual component this is split across a few `useState` hooks rather
than one object, for simpler re-renders — the shape above is documented in
`compass-logic.ts` for reference and to keep the model explicit.

## Distance / activation logic

- `MAX_DRAG_RATIO` (0.34) — how far the profile can be dragged, as a
  fraction of the compass's rendered size.
- `ACTIVATION_RATIO` (0.55) — fraction of max-drag distance that counts as
  "activated."
- Each node's scale/opacity is computed continuously from its **angular
  distance** to the current drag direction and the drag's **progress**
  toward the activation threshold — not a simple on/off hover state. See
  `computeNodeVisualStates()`.

## Latest change — AI Guide + instrument bezel

This is the big one from the compass concept, actually wired into
`CompassNavigation.tsx` now (not just previewed):

- **Bezel + ticks**: a visible outer ring with a touch of physical depth
  (layered `box-shadow`, not a gradient — real depth reads better here
  than it did in the flat concept preview), plus 24 tick marks (major
  ticks at true N/E/S/W) at `TICK_RADIUS_PX`.
- **Cardinal letters live inside each destination bubble** (N above
  Discover, E above SHOPPR AI, etc.), not as a separate ring — this is
  what makes them read as "attached to the bezel" rather than floating
  beside it, and it matches the stacked layout in your reference (N /
  DISCOVER / arrow). Each bubble also got a small outward-pointing
  chevron, matching the ▲▶▼◀ in your example.
- **AI Guide replaces the "BF" initials** at center —
  `components/compass/AiGuide.tsx`. Flat black orb, two dot eyes, one
  small blue "compass core" dot, subtle blink (skipped under reduced
  motion). Eyes turn SHOPPR blue and it lifts very slightly (`scale:
  1.04`) when SHOPPR AI is the active destination.
- **Profile moved to the header** (small avatar next to notifications) —
  since the center is now the guide, not a profile shortcut. The mobile
  bottom-nav Profile button still works exactly as before.
- **Tapping the guide (no drag) now opens SHOPPR AI directly** — "the
  character acts as the guide operating the compass." This was the one
  real interpretation call I made: your spec didn't say explicitly what
  a plain tap on the center should do once it's not opening a profile
  anymore. If you'd rather tapping do something else (e.g. nothing,
  or a dedicated "ask the guide" panel later), it's one line to change
  in `handlePointerUp`.
- **Selection pulse** — the active destination bubble gets a brief
  expanding ring on selection (skipped under reduced motion), matching
  "a small pulse confirms that the direction is locked."
- **Compass grew** (19rem → 22rem → 24rem across breakpoints) to make
  physical room for the bezel outside the destination bubbles, whose
  radius pulled in slightly (128px → 100px) to fit. Angular positions
  (which direction is where) are unchanged.

## Latest change — real compass needle

Replaced the old thin drag-trail line in `CompassNavigation.tsx` with a
persistent, single-tipped needle:

- One shaft + one triangular tip (`borderLeft` trick), not a two-sided
  magnetic needle.
- At rest, points at `activeDestination` (reads its angle straight from
  `COMPASS_NODES` in `compass-logic.ts` — no new math needed there).
- While dragging, previews the live drag angle, same as the old trail did.
- SHOPPR blue (`#3454D1`), stays visible (opacity 0.9) at all times, not
  just during drag.
- No `z-index` set, so it renders behind the center control (which has
  `z-10`) — this holds even after the center becomes the AI Guide
  character, since that's just a z-10 element occupying the same spot.
- Rotation transition respects `prefers-reduced-motion` (shorter, simple
  fade-like snap instead of the spring easing).

Everything else in the compass — drag physics, tap, keyboard nav, node
fade/scale, the breathing ring — is untouched.

## Tonight's changes (home-screen-only pass)

Scoped to your list — nothing here touches the destination views' actual
functionality, just the pre-destination home screen:

- **Layout**: hero + search + compass + quick suggestions now sit inside
  a `min-h-[100dvh]` block, so the home screen fills the first viewport
  like a real "screen" instead of trailing off partway down the page.
  Destination content (Discover/Stores/AI/Delivery) now lives in the one
  remaining `<main>` below that — there was a duplicate `<main>` landmark
  before, which is invalid HTML; fixed.
- **Headline reduced, compass moved up**: `text-3xl/4xl` → `text-2xl/3xl`,
  and the gap between hero and compass tightened so the compass reads as
  the focus, not an afterthought below a big headline.
- **Quick suggestions row** added below the compass (`Outfit tonight` ·
  `Birthday gift` · `Home essentials` · `Electronics`) — tapping one fills
  the search bar and focuses it. `SearchBar` is now a controlled,
  forwardRef component to support this.
- **Compass orientation** — confirmed and commented explicitly in
  `compass-logic.ts`: North=Discover, West=Nearby Stores, East=SHOPPR AI,
  South=Delivery, Center=Profile. This was already correct in the code I
  gave you; if your live build shows it differently, something changed
  it downstream — check that file first.
- **Subtle idle "breathing"** added to the compass ring (scale/opacity
  pulse, ~3.2s loop), off during drag and off under reduced motion.
- **Nested modal scrolling fixed** — `ProfilePanel` now locks background
  scroll while open and has one explicit scroll container
  (`max-h-[85vh] overflow-y-auto`) instead of two scrollable regions
  fighting each other.
- **Mission cards rewritten to read like an actual shopping experience**,
  not order-tracking data — e.g. "Arriving today / Nike Running Shoes /
  Scout: Maya / 2 stops away" instead of status codes. The detailed
  step-by-step pipeline still exists, tucked behind a "View tracking
  details" toggle. See `data/mock-data.ts` and `MissionCard.tsx`.

## Applying this to your live repo

If your in-editor assistant's build has diverged from this zip, the
cleanest path is to **replace these specific files wholesale** rather
than hand-merge, since they're self-contained: `HomeExperience.tsx`,
`SearchBar.tsx`, `MissionCard.tsx`, `DeliveryStatus.tsx`,
`ProfilePanel.tsx`, `CompassNavigation.tsx`, `compass-logic.ts`,
`data/mock-data.ts`, `data/types.ts`. Check whether your live version has
custom changes in those files first (e.g. if the assistant already fixed
the Missions/Scouts copy) before overwriting, so you don't lose work.

## Known gaps / honest notes

- **No compass rotation on select.** The brief says the compass "may"
  rotate the active destination toward north — I skipped this for v0.1 to
  keep labels always upright and avoid the biggest source of jank risk.
  Selection is communicated via color, scale, and an `aria-live` status
  line instead. Worth revisiting once the interaction feels solid.
- **I could not run lint, type-check, or a production build** (no network
  in my sandbox). Please run `npm run lint` and `npm run build` after
  `npm install` and send me any errors.
- **No real AI, payments, maps, or auth**, per the brief — all four
  destination views and the AI assistant use mock/simulated data and are
  labeled as such where relevant.
- **Map is a styled placeholder** (`MapPlaceholder.tsx`) sized and
  structured to be swapped for a real Google Maps embed later without
  touching the surrounding layout.

## Suggested commit

```
feat: SHOPPR v0.1 home page and Compass navigation

- Home page shell with header, hero search, and mobile nav fallback
- Interactive Compass: tap, drag, and keyboard navigation
- Discover, Stores, AI, and Delivery destination views (mock data)
- Profile panel drawer
- Typed mock data layer
```

Suggested branch: `feature/shoppr-home-compass` (per the brief — not
created automatically since I don't have repo access).
