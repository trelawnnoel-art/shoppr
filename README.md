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

## Latest change — SHOPPR AI view, actually built out

`DestinationContent.tsx`'s `AiView` was the thinnest of the four — fixed:

- **Submit now does something real** (simulated): a ~900ms "SHOPPR AI is
  checking nearby stores…" thinking state (spinner, disabled submit
  button), then a result — a short line plus 2 mock product cards,
  clearly labeled as simulated, not just an echoed sentence.
- **Screenshot button actually opens a file picker** now (hidden
  `<input type="file" accept="image/*">`), and shows the chosen
  filename as a removable chip. Nothing is uploaded/processed — it's a
  real interaction, just not a real pipeline yet.
- **Product link button** toggles an inline URL field instead of doing
  nothing.

## Consistency pass (no real bugs found)

Before adding anything else, I ran the whole project through a strict
TypeScript check — not something I could do earlier since there's no
`node_modules` here (no network to `npm install`). Worked around that by
writing a loose stand-in for React/Next/Framer Motion/lucide-react's
types (not the real thing, just enough shape to catch real mistakes),
and checked every file against it.

Result: no real bugs. Everything flagged was a limitation of the
stand-in types themselves (e.g. it doesn't know a plain `<input>`'s
`onChange` handler is properly typed, or that JSX allows a `key` prop on
any component) — all of which resolve automatically once you run
`npm install` and the real type packages are present. If `npm install`
+ `npm run dev` still errors tonight, it's more likely a dependency
version mismatch than a logic bug in the code itself — send me the exact
error text and I'll know where to look fast.

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

## Roadmap — what's left

Living checklist, updated as pieces land. Check here first before asking
"what's missing" — this is the answer.

- **Backend**
  - [x] Store/product data — real DB (SQLite + Prisma), real distance/ETA/
    open-now logic, `GET /api/stores`, `GET /api/stores/[id]`,
    `GET /api/products` (filterable), `GET /api/products/[id]`. See
    `prisma/schema.prisma`, `lib/geo.ts`, `lib/store-derived.ts`.
  - [x] Mission/Scout data — real `Scout` and `Mission` models, seeded
    from the original mock missions. `GET /api/missions`,
    `GET /api/missions/[id]` (full scout detail), `GET /api/scouts`
    (groundwork for the still-unbuilt Scout UI below). `Mission.storeName`
    is deliberately free text, not a `Store` relation — see the comment
    on the `Mission` model in `prisma/schema.prisma` for why.
  - [x] Real AI search — `POST /api/ai-search` calls Claude
    (`claude-opus-5`, structured output via Zod) over the real product
    catalog and returns genuine matches + a one-line message, replacing
    the old fake-timeout mock. Wired into `AiView`'s "Shop for me" flow.
    `ANTHROPIC_API_KEY` is live in `.env` and verified end-to-end (real
    matches for on-catalog prompts, honest empty results for off-catalog
    ones like "a rocket ship to Mars") — if the key/billing ever lapses,
    the endpoint 503s cleanly instead of crashing. See
    `app/api/ai-search/route.ts`.
  - [x] Auth/accounts — real `User` model (scrypt password hashing, HMAC-
    signed session cookie, no extra dependency for either). Demo account
    seeded (`benjamin@example.com` / `shoppr-demo`) so the "Good morning,
    Benjamin" greeting is backed by a real, loggable-into account.
    `POST /api/auth/{register,login,logout}`, `GET /api/auth/me`. See
    `lib/auth.ts`, `lib/session.ts`. No login UI built yet — backend only.
  - [ ] Payments.
  - [ ] Real maps/geolocation — `MapPlaceholder.tsx` is a styled
    stand-in; the store-distance calc uses a hardcoded placeholder
    location (`PLACEHOLDER_USER_LOCATION` in `lib/geo.ts`), not the
    customer's real location.
  - [x] Frontend wiring — `DiscoverView`/`StoresView`/`DeliveryView`/
    `AiView` all fetch from the real API routes now (`lib/useFetch.ts`,
    a small shared hook) instead of importing `data/mock-data.ts`
    directly, with loading/error states throughout. `categories`,
    `aiSuggestions`, and `aiTools` are still local — they're UI copy, not
    entity data.
- **Loading screens** — essentially unbuilt. Only a bare "Loading
  guide…" text fallback exists (for the 3D avatar's Suspense boundary).
  Nothing app-wide for initial load, view transitions, or waiting on API
  calls.
- **Scout UI** — built 2026-10-02. `ScoutProfile.tsx` (photo with initials
  fallback, star rating), `ScoutTrackingVisual.tsx` (a styled live-position
  marker — honestly NOT real GPS, see its own comment; real maps/
  geolocation is still the separate unbuilt item below), and
  `MissionChat.tsx` (a real customer<->Scout thread backed by a new
  `Message` Prisma model + `GET/POST /api/missions/[id]/messages`, with a
  few sample threads seeded). All three are wired into `MissionCard.tsx`'s
  existing "View tracking details" expansion — Scout profile/tracking only
  show for missions with a Scout assigned, chat only for active
  (non-complete) ones. Along the way: removed `stores`/`products`/
  `missions` from `data/mock-data.ts` (confirmed dead — the frontend
  already fetches all three from the real API, these were just unused
  leftovers from before that wiring), and fixed a real bug caught during
  testing — the chat thread didn't auto-scroll, so a sent message posted
  successfully but was invisible below the fold until scrolled manually.
- **3D avatar** (`components/avatar/`) — two planned styles, picked
  2026-10-01: **Cartoon** (our own procedural character) and
  **Realistic** (selfie-based, via Avaturn).
  - **Cartoon**: parametric sizing, outfit color-swapping, joint-based
    posing/preview mode, all working. 2026-10-02 polish pass in response
    to "still doesn't look cartoon enough / flat & plasticky / needs
    variety / expression feels off": switched every material from
    realistic PBR shading to `meshToonMaterial` (flat cel-shaded bands —
    see `toon-gradient.ts`), pushed the head-to-body ratio further and
    narrowed the body for more contrast, added eye catchlights (the
    "alive eyes" fix) and a wider smile, and exposed Skin/Hair color
    swatches in `AiView` (the data already existed from Phase 2, just
    wasn't in the UI yet).
  - **Ceiling hit**: after the polish pass, user compared against real
    Bitmoji references and correctly identified that the remaining gap
    (real garment shapes/hairstyles vs. primitive shapes with color
    swatches) can't be closed by further tuning — it's a 3D-asset
    problem, not a parameter problem. Researched real alternatives: Snap's
    Bitmoji Kit is "login with Snapchat + pull your existing Bitmoji," not
    an in-app creator — ruled out. **Genies** (docs.genies.com) is the
    real match (true 3D, rigged, genuine garment customization, built by
    Bitmoji's original creator), but their Web SDK needs an Early Access
    application (genies.com/contact) rather than instant signup. User is
    applying; outcome/timeline unknown. No code changes pending until
    that resolves.
  - **Realistic**: `RealisticAvatarScene.tsx` wires up the real
    `@avaturn/sdk` package against Avaturn's documented API (verified
    against their docs + the SDK's own `.d.ts` files). Project created
    (subdomain `shoppr`, Export type HttpURL, anonymous accounts on —
    `NEXT_PUBLIC_AVATURN_SUBDOMAIN` is live in `.env`). First real load
    confirmed working — Avaturn's actual creator UI rendered inside our
    app. Not yet completed: a full create-avatar-and-export run (needs a
    human to click through their selfie/creator flow) — until that
    happens, whether `AvatarModelScene`'s camera framing (tuned for the
    old Hitem3D files) suits an Avaturn export is still unverified.
  - Note: "realistic" here means a selfie-based semi-realistic avatar
    (face from a photo, body from sliders), not a true 3D body scan —
    that'd need LiDAR or photogrammetry and is a much bigger undertaking,
    intentionally out of scope for now.
- **No compass rotation on select.** The brief says the compass "may"
  rotate the active destination toward north — skipped for v0.1 to keep
  labels always upright and avoid jank risk. Selection is communicated
  via color, scale, and an `aria-live` status line instead.

## Known gaps / honest notes

- **I could not run lint, type-check, or a production build** (no network
  in my sandbox, from the original v0.1 pass). Run `npm run lint` and
  `npm run build` if you hit anything odd.
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
