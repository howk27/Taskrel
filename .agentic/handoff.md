# Handoff

Review owner: Documentation Manager

Update before long pauses or risky work.

## Current State

SESSION-END SYNC (2026-06-30, later): main pushed through `f582b34`
("fix: always render current contractor logo in PDF, add logo removal"),
tree clean, 160/160 tests pass, tsc clean. APP IS NOT LAUNCH-READY YET —
see "NEXT SESSION — START HERE" below.

DONE this session:
1. Migration 013 marked applied to production (founder-confirmed).
2. Quote PDF logo bug fixed: the authenticated PDF route
   (`/api/quotes/[id]/pdf`) rendered `quote.business_snapshot.logo_url`,
   frozen at quote-creation time — so a logo uploaded AFTER a quote was
   created never appeared on its PDF. Now overlays the contractor's
   CURRENT `logo_url` onto the snapshot at render time.
3. Added logo removal: `DELETE /api/settings/logo` (nulls
   `contractors.logo_url`) + a "Remove logo" control in
   `quote-document-settings-form.tsx` — there was previously no way to
   clear an uploaded logo once set.
4. Stripe webhook: confirmed ALL 5 Stripe env vars (`STRIPE_SECRET_KEY`,
   `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`,
   `STRIPE_PRICE_ID`, `STRIPE_CONNECT_WEBHOOK_SECRET`) are set in
   `.env.local`. Founder confirmed these are ALSO added to Vercel
   Production env vars — NOT independently verified (no Vercel MCP
   access in this environment; same caveat pattern as migration 012/013).
   `/api/stripe/webhook` route reviewed: handles
   `customer.subscription.created/updated/deleted` (updates
   `contractors.subscription_status`) and `payment_intent.succeeded`
   (marks invoice paid + logs a delivery_event). Local testing path:
   `stripe listen --forward-to localhost:3000/api/stripe/webhook` then
   `stripe trigger <event>`.

## NEXT SESSION — START HERE

Two NEW issues found by founder while testing production Stripe flows
(not yet fixed — pick up first):

1. **BUG — uncaught Stripe checkout error.** Founder hit this in the
   browser console on Settings > Billing:
   `Uncaught (in promise) SyntaxError: Failed to execute 'json' on
   'Response': Unexpected end of JSON input`, traced to
   `src/app/(app)/settings/billing/billing-client.tsx` `handleConnect()`
   (the "Client payments are not enabled..." fallback path, line ~69) —
   same pattern likely also affects `handleSubscribe()`. ROOT CAUSE
   CONFIRMED via code read: neither `/api/stripe/connect/route.ts` nor
   `/api/stripe/subscribe/route.ts` wraps its `stripe.*.create(...)`
   calls in try/catch. Any Stripe SDK exception (bad/restricted API key,
   Connect not enabled on the account, invalid price ID, etc.) becomes
   an unhandled Next.js route error → a non-JSON error response → the
   client's `await res.json()` throws instead of showing `data.error`.
   FIX: wrap the Stripe calls in both routes in try/catch, log
   server-side, return `NextResponse.json({ error: ... }, { status: 502
   })` on failure so the client's existing `data.error ?? "..."` fallback
   actually renders. Also worth checking the Stripe dashboard for WHY the
   call is failing (Connect likely not activated on this Stripe account
   yet, or a price/key mismatch between test/live mode).
2. **UX — Settings > Billing/Premium area needs a redesign pass.**
   Founder flagged `billing-client.tsx` as visually rough — three
   disconnected boxy panels (Subscribe / Connect / redeem-code) with
   ad-hoc amber "message" banners for both success and error states.
   Route through Impeccable critique (audit → shape) before touching
   code; this is a UI task so `@critic` UX review applies per CLAUDE.md.

Do NOT tell the founder the app is launch-ready until both are resolved
and re-tested. Combined with the still-open items below (Stripe Connect
account activation status unconfirmed, CHROMIUM_PACK_URL prod
verification, full smoke path), Stripe billing is the current blocker.

SESSION-END SYNC (2026-06-30): main = origin/main @ 5b68893, tree clean. 160/160 tests pass.

Public quote approval flow SHIPPED (10 commits, 6eaf756..5b68893):
- Migration 013: `last_resend_requested_at` on quotes table (NEEDS applying to production)
- Contractor notification email on approval (SendGrid, best-effort)
- `/api/public/quotes/[token]/request-resend` — 1-hour cooldown, notifies contractor
- Public `/q/[token]` page: expiry enforcement, three CTA states (approved/expired/open), three status banners, resend request flow
- Send route: expired quotes bypass cooldown + reset `valid_until` +30 days on send
- Contractor quote detail: green approval banner (with date), "Expired" badge, "Resend" label + note when expired
- Security: 303 on all public redirects, server-side expiry gate on approve route, DB error handling
- Mobile landing nav: wordmark hidden on mobile (logo mark only), visible md+

OPEN FOUNDER ACTIONS:
1. ~~Apply migration 013 to production~~ — MARKED APPLIED 2026-06-30 (founder confirmed)
2. Smoke test on production: expired quote badge → "Request resend" → contractor notification; approved quote → green banner on contractor detail

SESSION-END SYNC (2026-06-29): main = origin/main @ 713cbc1, tree clean. Production
deploy promoted from launch-hardening (ff merge). Docs synced — decisions.md +
roadmap.md updated this session; auto-memory updated (quote-document-design,
taskrel-brand-logo [new], favicon-ico-rgba [new]). OPEN: founder to confirm the
production deploy is green and the rebranded favicon/PWA icons render on the live
tab (favicons cache hard — hard-refresh / incognito). Older PDF+send route-handler
test follow-up still stands.

LATEST (2026-06-29, launch-hardening → production): brand + PDF polish shipped to
main and deploying to production. (1) Brand logo: new mark in
`public/taskrel-logo.svg`, inlined as a `currentColor` glyph via
`src/components/brand/taskrel-logo.tsx` — landing nav/close lockup + mobile app
header; desktop keeps the wordmark. (2) App icons: `src/app/favicon.ico` (16/32/48/256)
and PWA `public/icons/icon-{192,512}.png` regenerated from the mark (white glyph on
brand-dark #11100d), replacing the default Next.js placeholder. GOTCHA: Next/Turbopack's
ICO decoder rejects RGB PNGs — frames MUST be RGBA (color type 6) or `next build`
fails with "The PNG is not in RGBA format!". (3) Quote PDF summary reworked +
`QUOTE_RENDERER_VERSION` bumped v1→v2: Standard/Compact = balanced two-column
(Quote Date top-right, Start Date under Job location, bold spaced email/phone),
Refined = centered. v1 kept FROZEN (templates take the summary renderer as a param)
so already-sent quotes re-render unchanged. Gates: tsc 0, vitest 143/143,
`npm run build` passes. Pushed to origin/main through 713cbc1 (ff from
launch-hardening). Founder verified the Vercel preview green before promoting.
NOTE: Vercel deploys Production Branch (`main`) to prod; other branches are
previews — that was expected, not a misconfig. See decisions.md (2026-06-29).
Open follow-ups: founder to confirm production deploy green + favicon/PWA icons on
the live tab; the older PDF/send route-handler tests follow-up still stands.

PRIOR (2026-06-28, invoice renderer #2 + document archive #3): shipped the
invoice PDF renderer (renderInvoiceDocumentHtml, /api/invoices/[id]/pdf, detail
Download button) and the document-archive persistence layer (Approach A: private
`documents` bucket + `documents` table, migration 011, archived at send time via
src/lib/documents/archive-document.ts hooked into both send routes). Security
review APPROVED w/ conditions — both MUST-FIX resolved (payment-link scheme
backstop + PATCH field denylist; PII redacted from send-route error logs).
Gates: tsc 0, eslint 0, vitest 103/103. See decisions.md (2026-06-28).
Migration 011 APPLIED to production by founder (2026-06-28) — archiving is live.
(Not independently verified via MCP; that account lacks access to ref
ebpjdhmtxfiiowhgolhv.) Suggested next check: confirm a real send writes a row to
the `documents` table + an object in the private `documents` bucket.
All work PUSHED to origin/main (through dcb59cf); branch in sync. Open
follow-ups: signed-URL read path / "view what was sent" UI; route-handler tests
for the PDF + send routes; visual one-page print check of a real archived PDF.

Agentic OS workflow installed into the repo (CLAUDE.md, AGENTS.md, .claude/agents,
.claude/skills, .claude/settings.json hooks, .codex/, .agentic-scripts/, .agentic/).
Project memory seeded from STATUS.md and PRODUCT.md. App core (Sessions 1–10) is
complete; milestone is public launch readiness.

CURRENT FOCUS (2026-06-27, UI pass via Impeccable): processing founder's "next pass"
visual notes one-by-one. Ran audit (app UI 13/20) → defined+LOCKED a two-tone color
vision (terracotta clay action + reduced structural blue; compact ledger rows). DONE
this session: colorize foundation + color LOCKED, accent/sign-out cleanups, and the
`distill` of duplicate "Create new" CTAs. See "Color-vision pass" below for detail.

## Next task (START HERE)

DONE 2026-06-29 — LAUNCH-HARDENING (branch `launch-hardening`, 5 commits on
origin/main, NOT yet pushed/PR'd). Closed four code blockers from the launch
checklist; tsc clean, vitest 136/136 (was 109).
1. Committed the prior PII/SMS/legal working-tree batch (account deletion, SMS
   deferral, legal disclosures) as its own commit (44d4251).
2. Durable per-channel send cooldown on /api/quotes/send (60 min, reads
   delivery_events, 429 + Retry-After) — src/lib/quotes/send-rate-limit.ts.
3. Durable public-PDF cooldown via quotes.last_pdf_generated_at (MIGRATION 012 —
   MARKED APPLIED to prod per founder 2026-06-29, not MCP-verified) — replaced
   the in-memory Map.
4. SSRF DNS-rebinding fix: resolve logo host + block private resolved IPs
   (isBlockedResourceUrlResolved), wired into renderDocumentPdf.
5. First route-handler tests (delete/PDF/send) + vitest.config.ts ("@/" alias).
Pushed to origin/launch-hardening; PR #4 open (base main).
STILL OPEN (need founder / prod, not code): Stripe prod webhook, CHROMIUM_PACK_URL
on deploy + verify a real PDF render, public approval-flow E2E. Migration 012
marked applied (per founder). See the launch checklist. Next code: signed-URL
"view what was sent" UI.



#8 quote-document redesign + REAL PDF is now DONE — local `main` `87e2803`
(NOT pushed). See "DONE 2026-06-28 — QUOTE DOC + PDF" below. The whole founder
visual-notes queue (#1–#8) is now cleared.

OPEN before public launch (all in debt.md): (1) durable cross-instance PDF
rate-limit (currently in-memory best-effort); (2) two note-#4 send blockers
(TCPA SMS consent + /api/quotes/send rate-limit); (3) SSRF DNS-rebinding
residual on the PDF logo fetch; (4) set PDF env vars on the deploy target
(CHROMIUM_PACK_URL for serverless / PUPPETEER_EXECUTABLE_PATH locally) — routes
503 without them, and PDF render was verified locally vs Playwright Chromium,
NOT on prod.

Verify: `nvm use 22 && node_modules/.bin/tsc --noEmit` + `node_modules/.bin/vitest run`
(main = tsc clean, vitest 83/83). Then founder's logged-in pixel pass
(onboarding strip, demoted Clients nav, Switch, quote-detail Delivery panel,
NEW: Download PDF buttons on quote detail + /q/[token] approval page).
NOTE: removing the Notices route leaves a stale `.next/types` validator that
makes tsc fail until you `rm -rf .next` once. The committed CRLF→LF
renormalization is in place; new files commit as LF.

WORKTREE GOTCHA (hit 2026-06-28): `EnterWorktree` branches from origin/main, which is STALE
(missing all local unpushed commits effb4be->03a51ba). Before any edits in a fresh worktree:
`git reset --hard <local-main-HEAD>` so you're on the real current code, and symlink
node_modules from the main checkout (`ln -s /mnt/c/.../Taskrel/node_modules node_modules`) —
worktrees have none. To land: commit on the worktree branch, then from the MAIN checkout
`git merge --ff-only <wt-branch>`, then ExitWorktree remove (discard_changes:true — its
"N commits" warning counts the local-unpushed ones, which are already on main; safe).

DONE 2026-06-28 — QUOTE DOC + PDF (#8) — finished the parked quote-template
redesign and added real PDF generation. Local `main` `460764e` (redesign) +
`87e2803` (PDF). Founder ratified the forks via AskUser: real PDF pipeline,
finish & ship the started worktree, free hosting path (chromium-min). Architect
approved the stack (single-source HTML → Chromium, no parallel renderer);
security-reviewer = APPROVED WITH CONDITIONS (4 MUST-FIX controls implemented).
- Redesign: 3 presets remapped to the 3 locked directions (classic=Executive
  Estimate, compact=Work Order, modern=Premium Proposal). Light, single accent,
  ink total, fixed slots. renderClose() puts notes/terms beside the total;
  print shell strips the web card chrome → all 3 fit ONE Letter page on the
  canonical 3-item sample (verified via real Chromium PDF render + page count).
  Fixed a duplicated client block in the Premium direction.
- Versioning (no migration): QUOTE_RENDERER_VERSION "v1" frozen into
  business_snapshot on first send; renderer reads it back. Future redesign =
  add renderVN + bump constant; sent quotes stay pixel-stable.
- PDF: src/lib/pdf/{generate-quote-pdf,resource-guard,pdf-rate-limit}.ts +
  routes /api/quotes/[id]/pdf (auth) and /api/public/quotes/[token]/pdf
  (token-gated). Download PDF buttons on quote detail + approval page.
- Deps added: puppeteer-core, @sparticuz/chromium-min (free, no recurring $).
- The prior worktree `quote-doc-redesign` (its WIP was this redesign) was
  merged + removed. NOTE: `node_modules` had to be rebuilt this session
  (`CI=true corepack pnpm install`) — the symlinked store had lost its Linux
  rolldown binding again.
- NOT done: SendGrid PDF attachment (deferred post-launch); see debt.md OPEN
  items. tsc clean; vitest 83/83; eslint clean.

DONE 2026-06-28 — NOTES BATCH (#2/#4/#5/#6/#7) — routed via dispatcher-pm as one
batch, founder ratified the open decisions, built + merged to local `main` `bb7f5a6`
(NOT pushed). tsc clean; vitest 146/146.
- #2 onboarding CTA (`launch-readiness-checklist.tsx`): rebuilt the tall two-column
  card into a slim single-row readiness strip — filled clay `.tr-primary-action`
  button (was a gray panel + blue text = a LOCKED color-system violation), ONE
  description not two, ArrowRight not the wrong Plus icon, p-4. Logic unchanged.
- #6 Notices: CUT entirely. Deleted `src/app/(app)/ai-assistant/page.tsx`; removed
  from both nav lists; dropped unused Lightning import. (Re-presented dashboard data,
  no additive value.)
- #5 Clients: DEMOTED. `app-shell.tsx` nav split into `primaryNav` (Dashboard/Jobs/
  Quotes/Invoices) + `secondaryNav` (Clients/Settings) behind a divider on desktop
  (new `SidebarLink` helper); mobile keeps Clients in the "More" sheet only.
- #7 settings modernization: new reusable `src/components/ui/switch.tsx` (accessible
  role=switch, token colors) replacing the raw `<input type=checkbox>` (had off-palette
  `border-slate-600`) in the overhead form; normalized ALL settings-form feedback off
  raw palette (`text-red-400`/`text-emerald-400`) → `--tr-red`/`--tr-green`. Page
  already sections Billing+Export; deeper template-control IA folded into #8.
- #4 delivery: quote-detail "Send proof" panel → "Delivery & status" with one row per
  available channel (Email/SMS): recipient + last status (Sent date / Failed reason /
  Not sent yet) + per-channel button (Send / Retry / Resend). Reuses existing
  `handleSend([channel])`; `/api/quotes/send` already accepted `via:[channel]` so
  UI-ONLY, no new send logic. Buttons disable during in-flight send. Also normalized
  send error/success blocks to tokens. security-reviewer = MERGE WITH FOLLOW-UP (2
  pre-launch blockers in debt.md; tenant isolation verified safe). Invoice per-channel
  resend DEFERRED (invoice send route has no `via`, couples Stripe link — backend job).
- PUSHBACK: #3 quotes-list "100+ crowding" was ALREADY solved (compact QuoteRow ledger
  + server-side `.range()` pagination + PaginationRow) — no new work done; detail-page
  re-spacing left for founder pixel pass.
- NOT pixel-reviewed (auth-gated). @critic UX pass NOT separately spawned (cost) —
  founder's logged-in pass is the review gate.

DONE 2026-06-28 — DASHBOARD DENSITY (founder note #1) — Impeccable shape->build, critic-
reviewed, merged to local `main` `03a51ba` (NOT pushed). Founder confirmed brief (collapse
analytics + responsive command area) AND requested a critic pass. Changes:
- `dashboard-command-center.ts`: new `buildAttentionList()` (TDD, +2 tests) — merges the 3
  lanes into one severity-ranked stream (overdue->waiting->today->rest, tie-break amount),
  tagged by lane; new `statusLabel` on `DashboardCommandItem` (quote=bucketShortLabel,
  job/invoice=prettified effectiveStatus).
- `dashboard/page.tsx` rebuilt: lg+ shows 3 TIGHTENED lanes (dropped subtitles + per-row
  body + "Open quote" action label; row = title + amount + status Badge + meta). <lg shows
  ONE unified "Needs your attention" list (top 6) with a "+N more" caption + Jobs/Quotes/
  Invoices quick links. Removed the 4 metric tiles + all 3 chart cards -> ONE quiet neutral
  summary strip (active quote value / scheduled jobs / unpaid / paid this month, 2-col
  mobile / 4-col sm+). Charts component kept in repo for a future /insights view.
- CRITIC FIXES baked in: status is no longer color-only (text Badge per row, was a bare
  tone dot — a WCAG/DESIGN.md "status never color-only" violation); "+N more" caption
  reconciles the header count vs the 6-item cap; empty lanes now render emptyBody too.
  Deliberately NOT changed (founder-confirmed): summary strip stays neutral (no amber on
  Unpaid) per "quiet strip". The old "double Create New CTA" note was already resolved in
  the earlier distill pass (PageHeader has no CTA).
- Verify: tsc clean; vitest 73/73 (was 71); design hook clean on every edit. Auth-gated ->
  founder logged-in pixel pass at 390px + desktop still pending.

DONE 2026-06-28 — ACTION-FLOW PLAN CLOSED. Investigated the "open artifacts"; founder
confirmed (and the code proved) the plan's intent was already delivered by a different
architecture: dashboard via `buildDashboardCommandCenter`; quote/invoice/jobs via the
`get*WorkflowState` models. The plan's `dashboard-actions.ts` was deliberately NOT built
(would duplicate/regress the command center). Plan banner set to CLOSED.

DONE 2026-06-28 — CONSOLIDATION (commit `c42d685`, merged to local `main`). Built the one
genuinely-additive artifact: `src/components/workflow/action-primitives.tsx` exporting
`ActionRail`. Quote detail: merged the separate "Quote total" + "Actions" panels into one
top ActionRail (actions were buried 4th in the sidebar; now sit with the total; 6 panels
-> 5). Invoice detail: right column now leads with a "Balance due" ActionRail folding in
blockers -> payment link -> send (balance was split across columns); proof/delivery demoted
to a secondary panel; dropped unused `Receipt` import. tsc clean; vitest 71/71. Logged-in
pixel pass pending.

DONE 2026-06-28 — CHEAP FOLLOW-UPS. (1) `.gitattributes` `* text=auto eol=lf` + binary
types (commit `2559393`) then full `git add --renormalize` (commit `1f5c844`, EOL-only,
40 files) -> the 73-file CRLF churn is GONE, working tree clean. (2) Deleted dead
`src/components/layout/bottom-nav.tsx` (commit `2559393`). (3) vitest was failing on a
missing rolldown/unrs linux native binding (node_modules only had win32 bindings); fixed
with `CI=true corepack pnpm install` (the plain install aborts with
`ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`). vitest now runs 71/71. NOTE: local commits
effb4be / 7696ee4 / 2559393 / c42d685 / 1f5c844 are NOT pushed.

DONE 2026-06-28 — color/UI pass COMMITTED to local `main` as `effb4be` ("Commit Taskrel
two-tone color + compact-ledger UI pass"): two-tone terracotta/blue tokens, filled clay
CTAs, compact ledger quote rows, landing redesign, dashboard/app-shell declutter,
distilled duplicate CTAs, elevation/motion/type tokens, DESIGN.md. tsc clean. NOT pushed.
73 CRLF line-ending-churn files (migrations, lockfiles, docs) intentionally left UNstaged
— see "Open Risks" re: a `.gitattributes` normalization follow-up.

DONE 2026-06-28 — `adapt` (P1): mobile nav reachability FIXED, merged to local `main` as
`7696ee4` (`src/components/layout/app-shell.tsx`). Below xl (<1280px) the bottom bar
dropped Clients / Notices / Settings (and Calendar was desktop-header-only). Bottom bar is
now 5 slots: Dashboard / Jobs / Quotes / Invoices + a "More" button opening a bottom sheet
with Calendar / Clients / Notices / Settings. More highlights when an overflow route is
active; sheet closes on tap / nav / Escape, locks body scroll, >=44px (min-h-14) targets,
labels dropped to text-xs to fit 5 columns. Added `List` + `X` to `ui/icons`. The separate
`src/components/layout/bottom-nav.tsx` is DEAD CODE (imported nowhere) — left as-is;
candidate for deletion. Pixel pass pending founder's logged-in review at 390px.

DONE 2026-06-28 — `layout`: quotes list → COMPACT LEDGER ROWS.
`src/components/quotes/quotes-workflow.tsx`. Replaced the tall, nested-panel
`QuoteCard` with `QuoteRow`: one `Surface` wraps the whole list with hairline row
dividers + a quiet sm+ column header (Client / Next action / Total / Date). Each row
is a CSS-grid ledger line — leading workflow-bucket icon (color scan; needs_review→
FileText/amber, waiting→PaperPlaneTilt/blue, approved→CheckCircle/green, closed→
SealCheck/faint), client name + status Badge (status never color-only), muted
next-action column (amber + WarningCircle when blocked), total (fixed-width track,
right, tabular-nums), date. Reflows to 2 lines at <640px via grid row-span/row-start;
single line sm+. Dropped address + readiness footer (now on the /quotes/[id] detail).
Removed unused `deliveryClass`, `MapPin`, `CalendarBlank`; added `PaperPlaneTilt`,
`WarningCircle` to `ui/icons`. tsc clean; design hook clean; no tests assert this
component. NOTE: email/SMS delivery status was intentionally NOT folded in — it's its
own queued founder note. Pixel pass pending founder's logged-in review.

Remaining founder notes (queue, roughly priority order): mobile nav can't reach
Settings/Clients/Notices (adapt, P1); dashboard density + "out of date" feel; settings
modernization incl. billing/export hierarchy; onboarding "Finish Setup" CTA (thinner,
clearer); email/SMS status display + resend/first-send; quote-template calmer redesign
(neutral default, fixed item slots, shorter copy); clients placement + Notices purpose
(decide together); then copy `clarify`, then `animate`/`optimize`/`polish`.

## Completed

- Installed agentic-os native-platform workflow and seeded .agentic/ memory.
- Authored root CLAUDE.md (dispatcher workflow + project snapshot + commands).
- Visual-modernization FOUNDATION (2026-06-27, via Impeccable critique). Critique
  scored UI 27/40, detector 0 slop tells; direction "calm & layered". Added to
  `src/app/globals.css`: elevation tokens (`--tr-shadow-1/2/3`, `--tr-highlight`)
  in all 4 theme contexts; motion tokens (`--tr-dur-*`, `--tr-ease-out`,
  `--tr-ease-out-expo`); type-scale tokens (`--tr-text-2xl..sm`); utility classes
  `.tr-elevation-flat/raised/overlay`, `.tr-h1/h2/h3`, `.tr-body`, `.tr-meta`,
  `.tr-rise`. Wired into `Surface` (new `elevation` prop, default flat = unchanged)
  and `PageHeader` (now on the type scale). New `DESIGN.md` at repo root documents
  the system. Decision logged in decisions.md. tsc --noEmit clean; CSS braces
  balanced; all 47 Surface callers backward-compatible.

## In Progress

Visual modernization (see DESIGN.md roadmap + decisions.md 2026-06-27).
- ✅ Step 1 foundation (elevation/type/motion tokens + Surface/PageHeader).
- ✅ Step 2 landing redesign. Rewrote `src/app/page.tsx` into a demonstrated
  show-and-tell narrative: collapsed the 3 repeating quote-anatomy sections into
  one "How the work moves" 4-step zigzag with product-UI mockups, refined hero +
  client-facing quote section + pricing close. Uses the new foundation (tr-h*,
  elevation, tr-rise). Restored committed launch copy in `public-launch.ts`
  ($19/month + "Start free") — this also FIXED a pre-existing red test
  (`public-launch.test.ts`). Verified: tsc clean, vitest 2/2, renders 200 with all
  sections. Pixel-reviewed across desktop light, desktop dark (primary brand mode),
  and 390px mobile via Playwright — first pass clean, no defects patched. Browser
  screenshots now work (system libs installed 2026-06-27).
- ✅ Step 3 app shell + quotes declutter. app-shell: dead global search wired to a
  real `/quotes` GET form (was a no-op input). quotes-workflow: removed the
  redundant "Start quote work" promo card (3 Create CTAs → 1 header CTA), search now
  full-width, QuoteCard client name on tr-h3.
- ✅ Step 4 dashboard. Command lanes on `Surface elevation="raised"`; section
  headings on tr-h2/tr-h3.
- ✅ Step 5 polish. Whole-project verify: tsc clean, vitest 71/71, detector 0
  findings on all changed surfaces. App routes return clean 307 (no 500s).
  Note: dashboard/quotes are auth-gated; not pixel-reviewed (no test session) —
  founder doing final logged-in pass.

Visual-modernization initiative (steps 1-5) COMPLETE pending founder review.

## Color-vision pass (2026-06-27, via Impeccable audit→vision)

Audit scored app UI 13/20. Root cause of "AI-sloppy blue": `--tr-primary` (hue 255)
did action+selection+info+accent at once AND `.tr-primary-action` rendered as a weak
10% tint, not a filled CTA. Founder vision (decisions.md 2026-06-27): TWO-TONE — warm
CLAY action + reduced structural blue; status unchanged; lists → compact ledger rows.

- ✅ Colorize FOUNDATION + color LOCKED (founder-approved 2026-06-27 via a
  token-accurate preview render; founder couldn't run the live server — see dev env).
  Final token values, all 4 theme contexts (globals.css): WHITE-ink terracotta both
  themes — dark `--tr-action: oklch(0.53 0.142 40)` / hover `0.57 0.143 40`; light
  `--tr-action: oklch(0.48 0.142 40)` / hover `0.43 0.145 40`; ink `oklch(0.99 0.008
  60)`. Dark is lifted only so the button separates from the dark bg; same character.
  Rewrote shared `.tr-primary-action` blue-tint → filled clay (propagates to all 18
  CTA call sites). Blue roles (nav active, selection, focus, info, links) reference
  `--tr-primary` directly, unchanged. Verified: braces 42/42, WCAG AA both themes
  (ink-on-clay 5.0–6.8:1, button-vs-bg 3.65–6.68:1). Live-app pixel pass still pending.
- ✅ quotes-workflow empty-state CTA moved off orange `.tr-accent-action` → clay.
- ✅ settings "Sign out" moved off raw red-* → secondary Button (sign out isn't
  data-loss, so not destructive-styled).
- ✅ Distill — removed duplicate "Create new" CTAs from page headers (dashboard,
  quotes, ai-assistant/Notices) + clients' "New quote" (all → /quotes/new, already in
  the global app-shell header at every breakpoint). Cleaned now-unused `Plus` imports
  (dashboard, ai-assistant). tsc clean; no tests assert these CTAs. invoices' "Review
  quotes" → /quotes kept (distinct action).
- ⏳ Remaining colorize: onboarding `.tr-accent-action` (defer to its own onboarding
  pass); decorative in-app text-orange icons (low priority).
- ✅ `layout` — quotes list → compact ledger rows (2026-06-28). See "Next task" block.
- ⏳ NEXT: mobile nav reachability (`adapt`, P1), then settings hierarchy, copy
  clarify, then animate/optimize/polish. See audit findings.

## Dev environment (resolved 2026-06-27)

WSL native-binding caveat fixed: use Node 22 (`nvm use 22`) + pnpm 11 (corepack).
Deps reinstalled Linux-native. `pnpm dev` works. IMPORTANT: `/mnt/c` does not fire
inotify, so Next HMR won't see edits — start dev with `WATCHPACK_POLLING=true
CHOKIDAR_USEPOLLING=true pnpm dev`, or restart after edits.
UPDATE 2026-06-27: with Next 16.2.7, `next dev` (Turbopack default) FAILS on /mnt/c
(9p fs) — Turbopack can't acquire its `.next` lockfile (`Permission denied, os error
13`). Also `pnpm dev` now aborts after package.json edits (pnpm 11 wants a no-TTY
purge/reinstall). WORKING command:
`nvm use 22 && WATCHPACK_POLLING=true CHOKIDAR_USEPOLLING=true node_modules/.bin/next dev --webpack`
(`--webpack` avoids the Turbopack lockfile; invoking the bin directly avoids pnpm's
purge). Real long-term fix: move the repo onto the Linux fs (~/) for Turbopack + HMR.

## Open Risks

- WSL node_modules mismatch — RESOLVED (Node 22 + Linux deps; see Dev environment).
- Agent-driven browser screenshots — RESOLVED. Playwright Chromium system libs
  installed via `sudo npx playwright install-deps chromium`. Use `npx playwright
  screenshot --browser chromium [--color-scheme dark] --viewport-size W,H --full-page
  URL out.png` against the running dev server.
- Public-launch surfaces and Stripe production webhook not yet verified end-to-end.

## Verification

- File layout confirmed via ls after install.
- Tests NOT run in this environment (WSL native-binding failure) — verify after
  reinstalling deps with Node 22+.


## User notes for next pass visual update:

Call Agentic-os  to classify and delegate each tasks.

For the notes below, analyze each one of them and push back where you think it's wrong. Also check for other cases that similar things might be happening that can be improved. Do not limit yourself to this cases nor limit the fixes that can be applied and keep it mind about scaling into other tools later. 

One main issue I'm noticing is that the app is using blue buttons for both themes but these are repetitive which makes it hard to break out the feeling of "AI-sloppy". We want to use impeccable clarify, audit, critique and shape  as well as others after to bring some life to Taskrel animate, colorize, optimize and polish. We won't limit the taskRel UI to just these commands but these are the main ones for now. 

- Dashboard feels too crowded and slightly out of date. Text is too much. The current layout used in the dashboard feels off and wrong. Double CTA in this screen "Create New". 
- "Finish Setup" > onboarding CTA neds updating to imitate something more modern and easier to understand. Clear CTA's and less dead space for this. Making in thinner might help.
- Quote screen needs re-spacing and re-sizing of its elements. As well as the results found. Too crowded, this will become an issue once a user reaches 100+ quotes.
- Need to add better handling and displayability of email/sms status. Re-send or submit for the first time.
- Clients list could be moved somewhere else. I don't think it should be a part of the main screen, push back if you disagree on this point.
- Notices?? Seems useless. Kind of like a guide on what to do next but that's what the dashboard is for.
- Settings needs to make it feel modern. A lot of old references in terms of checkboxes and the way these forms are displayed. Needs heavy UI and UX refinement so users will have an easier time understanding and using all of this features that taskrel offers. In this, Billing and export modules need to be better represented.
- Quotes template design seems odd. Seems like an overstyled and glorified piece of paper. Needs to be calmer and serious. Different templates should have differents maintaing a neutral one. We want to shorten the descriptions, FIXED places for items (address, company name, etc...)


## Client-Facing Side Quote/Invoice

You are redesigning the quote/proposal PDF generated by Taskrel.

Current problem:
The existing output looks like a glorified email: dark card, loud colors, cramped information, weak hierarchy, and too much content presented as one big message. It does not feel like a professional PDF document a contractor would confidently send to a client.

Goal:
Create a clean, one-page PDF design that feels like a real contractor estimate/proposal, not an email template. The PDF should be generated directly with code and should be easy to reuse with dynamic quote data.

Primary design rules:

* One page only unless the quote has too many line items.
* White or very light background.
* Minimal color usage.
* No heavy dark full-page panels.
* No email-style hero block.
* No oversized decorative sections.
* Strong document hierarchy.
* Make the price, scope, client info, and approval action easy to scan.
* The document should feel professional, trustworthy, and contractor-friendly.
* The layout should work for painting, repairs, remodeling, cleaning, and other service quotes.

Use this sample quote data:

* Contractor/company logo: optional {Placeholder}
* Document type: Quote
* Client name: 
* Client email: 
* Client phone: 
* Address: 
* Created date: Jun 16, 2026
* Scheduled date: Jun 17, 2026- Jun 18, 2026
* Total: $2,625.00

Line items:

1. Interior repaint - 2 standard bedrooms
   Description: walls, ceilings, baseboards, doors, minor patching, caulking, prep, and cleanup
   Qty: 2 room
   Rate: $650.00
   Total: $1,300.00

2. Interior repaint - 2 full bathrooms
   Description: walls, ceilings, baseboards, doors, moisture-resistant prep, minor patching, caulking, and cleanup
   Qty: 2 room
   Rate: $475.00
   Total: $950.00

3. Materials and paint
   Description: interior drywall paint, ceiling paint, trim enamel, caulk, patching compound, masking, sundries
   Qty: 1 job
   Rate: $375.00
   Total: $375.00

Client note:
Thank you for the opportunity to quote this project. This estimate is based on a standard repaint of the listed rooms with normal prep and one color family. Final pricing may adjust if there is heavy damage, stain blocking, mildew remediation, extensive furniture moving, or major color changes.

Create three distinct one-page PDF design directions:

Direction 1: Executive Estimate
A polished, structured estimate. Clean header at top with logo/company placeholder on the left, document type and quote number/date on the right. Large total summary near the top. Client/project information in a compact two-column block. Line items in a clean table. Notes and terms at the bottom. This should feel like a professional business document.

Direction 2: Contractor Work Order
More practical and field-service oriented. Clear sections for client, job site, scheduled work, scope, line items, and total. It should feel like something a contractor can send, print, or bring to the job. Less “corporate,” more operational. Use boxed sections lightly, but keep the page clean.

Direction 3: Premium Proposal
More refined and sales-focused, but still restrained. Use more whitespace, softer typography, and a premium layout. The total should be prominent but not loud. The line items should feel curated, not like an invoice dump. This version should work well for higher-ticket services.

Implementation requirements:

* Build the designs directly in code.
* Use reusable components/functions for:

  * PDF page shell
  * Header
  * Client/project block
  * Line item table
  * Total summary
  * Notes/terms block
  * Footer
* Keep data separate from presentation.
* The same quote data should be renderable in all three design directions.
* Avoid hardcoding layout values all over the file; use spacing, font, and color tokens.
* Make the output easy to integrate into Taskrel later.

Visual constraints:

* Use a clean sans-serif font.
* Avoid more than one accent color.
* Accent color should be subtle and professional.
* Use black, gray, white, and one accent color.
* No gradients unless extremely subtle.
* No large dark background blocks.
* No bright orange total button.
* No fake email styling.
* No excessive shadows.
* No decorative icons unless they serve a clear purpose.

PDF content hierarchy:

1. Who is sending it
2. Who it is for
3. What the work is
4. How much it costs
5. When it is scheduled
6. What is included
7. What may change the price
8. How the client approves or follows up

Output expected:

* Generate three PDFs or one PDF with three pages, one page per design direction.
* Each page should be complete and visually different.
* Add small labels only for internal review, such as “Direction 1 — Executive Estimate.”
* Make sure the final result looks like a professional PDF, not a webpage screenshot.

Stress test before finishing:

* Does this still look professional if printed in black and white?
* Is the total easy to find in under 3 seconds?
* Can a non-technical homeowner understand what they are paying for?
* Would a contractor feel comfortable sending this to a $2,000–$10,000 client?
* Does it avoid looking like an email, receipt, or marketing flyer?
* Is the quote still readable on mobile after opening the PDF?
Fix the structure.
The PDF should create trust by being clear, restrained, and easy to approve.

## 2026-06-28 — PII deletion, SMS deferral, chromium env, legal disclosure

Shipped (working tree, not yet committed):
- **Account deletion (HIGH):** `POST /api/account/delete` + Settings danger zone
  (`src/components/settings/delete-account.tsx`). Purges `documents` +
  `quote-logos` Storage under `{contractor_id}/`, deletes auth user (cascades all
  DB), best-effort cancels Stripe sub. Storage-first; aborts before auth-delete on
  storage failure. No migration needed. Helper + tests: `src/lib/account/`.
- **SMS deferred:** `src/lib/feature-flags.ts` `SMS_ENABLED=false`. Hidden in send
  UI; short-circuited in both send routes; launch-readiness now email-only. Twilio
  code retained. Checklist: `docs/legal/tcpa-readiness.md`.
- **Chromium:** `CHROMIUM_PACK_URL` commented out in `.env.local` (production-only;
  was shadowing local Chrome) + documented in `.env.local.example`.
- **Legal:** `/privacy` + `/terms` disclose PDF/PII storage + deletion;
  `docs/legal/launch-legal-notes.md` (needs attorney review). Decision logged in
  `.agentic/decisions.md`.

Verify: tsc exit 0; vitest 109/109. Not committed — review then commit.
Next: commit; optional CSRF/origin check on delete endpoint; route-handler test
for the destructive path.
