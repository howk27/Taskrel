# Taskrel Design System

Direction: **calm & layered** — a quiet, legible "dependable workbench." Depth and
hierarchy come from layering, type scale, and restraint, not decoration. Dark mode
is the default and is tuned for field eye-comfort; light mode is fully supported.

Source of truth: design tokens live in `src/app/globals.css`; shared primitives in
`src/components/ui/`. Always consume tokens — never hard-code colors, shadows, or
type sizes in components.

## Color

OKLCH throughout. Four theme contexts stay in sync: `:root` (dark default),
`@media (prefers-color-scheme: light)`, `[data-theme="dark"]`, `[data-theme="light"]`.
Any new token must be declared in all four where it is theme-dependent.

- **Surfaces** (back to front): `--tr-bg` → `--tr-bg-soft` → `--tr-shell` →
  `--tr-surface` → `--tr-surface-2` → `--tr-surface-3`.
- **Text**: `--tr-text` (primary) · `--tr-text-muted` (secondary, AA-safe) ·
  `--tr-text-faint` (tertiary / icons only — not for body copy).
**Two-tone, role-separated** (see `.agentic/decisions.md` 2026-06-27 color vision).
Each hue has ONE job, so the UI reads in layers instead of one flat blue pitch:

- **Action (warm) — `--tr-action`** (terracotta/clay): the *primary action* color,
  rendered FILLED via `.tr-primary-action` (Create new, Send, primary submits). This
  is the only "do this" color. Text on it is `--tr-action-ink`. Locked values
  (white-ink terracotta both themes): dark `oklch(0.53 0.142 40)` / hover `0.57`;
  light `oklch(0.48 0.142 40)` / hover `0.43`; ink `oklch(0.99 0.008 60)`. AA verified.
- **Primary (blue) — `--tr-primary`**, reduced to *structure/orientation*: nav
  active state, selection, focus rings, links, info, primary chart series. Never on
  a primary CTA anymore.
- **Status**: semantic `--tr-green/amber/red/info` plus a full `--tr-badge-*`
  vocabulary (bg / text / ring per state). Color is never the only status signal.
- `--tr-orange` stays the brighter *marketing* accent on the landing/brand register
  only; in-app warm CTAs use `--tr-action`.

## Elevation

Three steps of depth. Drop shadow + a faint top highlight (`--tr-highlight`) make
raised surfaces read as lit from above. Shadows are theme-aware
(`--tr-shadow-1/2/3`).

| Class | Use | Look |
|---|---|---|
| `tr-card` / `tr-elevation-flat` | content panels, the default | hairline border + faint lift (shadow-1) |
| `tr-elevation-raised` | cards that stand off the page (lists, command lanes) | shadow-2 |
| `tr-elevation-overlay` | popovers, dropdowns, modals | surface-2 + shadow-3 |

Consume via the `Surface` primitive: `<Surface elevation="raised">`. Default is
`flat`. **Do not nest elevated cards** — raise the outer or the inner, never both.

## Type scale

Fixed rem ramp (~1.2 ratio), not fluid clamps — product UI is viewed at consistent
DPI. One family (Aptos / SF Pro / system sans) across headings, labels, body, data.

| Class | Size | Role |
|---|---|---|
| `tr-h1` | 24px / 1.25, 600, -0.012em | page title |
| `tr-h2` | 20px / 1.25, 600 | section heading |
| `tr-h3` | 17px / 1.35, 600 | card heading |
| `tr-body` | 15px / 1.55 | body copy (cap prose at 65–75ch) |
| `tr-meta` | 13px / 1.4 | meta, labels, eyebrows |

Secondary text earns its hierarchy from size + weight, not by dropping to a low
contrast. Keep body copy on `--tr-text` or `--tr-text-muted`, never `--tr-text-faint`.

## Motion

State-conveying, not decorative. 150–250ms on most transitions.

- Durations: `--tr-dur-fast` 120ms · `--tr-dur-base` 180ms · `--tr-dur-slow` 260ms.
- Easing: `--tr-ease-out` (UI state) · `--tr-ease-out-expo` (reveals).
- `tr-rise`: a single calm entrance for landing sections. Safe by construction —
  runs on load, fills to the visible end state, and collapses to an instant
  appearance under `prefers-reduced-motion` (handled globally in `globals.css`).
- No orchestrated page-load sequences in app UI. No bounce/elastic.

## Primitives (`src/components/ui/`)

`Surface` (elevation), `PageHeader` (title/subtitle/eyebrow on the type scale),
`Badge` (status vocabulary), `Button` (primary/secondary/ghost/destructive ×
sm/md/lg, with loading), `Input`, `PaginationRow`. Every interactive element targets
≥44px and uses the shared focus-visible outline (`--tr-primary`). Reuse these; add a
variant before forking a one-off.

## Roadmap (visual modernization — see `.agentic/decisions.md` 2026-06-27)

1. ✅ Foundation: elevation, type scale, motion tokens + `Surface`/`PageHeader`.
2. ✅ Landing — balanced show-and-tell, one demonstrated 4-step workflow narrative
   with product-UI mockups. Pixel-reviewed (light/dark/mobile).
3. ✅ App shell + quotes — wired the dead global search to `/quotes`, removed the
   redundant "Start quote work" promo card (single header CTA), client name on
   `tr-h3`.
4. ✅ Dashboard — command lanes on `raised` elevation, headings on the type scale.
5. ✅ Polish — tsc clean, 71/71 tests, detector 0 findings on all changed surfaces.
6. ✅ Color vision (two-tone: clay action + reduced structural blue), LOCKED
   2026-06-27. `--tr-action/-hover/-ink` added to all 4 contexts; `.tr-primary-action`
   → filled terracotta.
7. ✅ Layout — quotes list → compact ledger rows (2026-06-28). One `Surface` + hairline
   dividers + sm+ column header; grid `QuoteRow` (bucket icon · client+status badge ·
   next action · right-aligned tabular total · date) reflowing to 2 lines <640px. The
   reusable list pattern for jobs/invoices later.

Verified visually: landing (public). App screens (dashboard/quotes/invoices/clients)
are auth-gated — verified via typecheck, tests, detector, and clean 307 redirect;
pixel review pending a logged-in pass.
