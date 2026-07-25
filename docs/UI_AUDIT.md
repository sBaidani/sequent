# Sequent UI Audit — Current State vs. Astryx Design-System Conventions

**Date:** 2026-07-04 · **Branch:** `claude/ultracode-effort-fgbwt6` · **Scope:** the web UI (`src/`, `styles.css`, `index.html`); the native `android_client/` (Jetpack Compose) is a separate UI surface and is out of scope for a web design system — see [Open decisions](#open-decisions).

**Method:** 18-agent audit — 10 per-area file auditors covering every UI file, 5 cross-cutting analysts (framework compatibility, CSS archaeology, component mapping, layout/shell, test safety net), 2 adversarial verifiers on the load-bearing claims, 1 completeness critic. All metric counts below were independently spot-checked (`wc -l`, `grep`) and all Astryx component names verified against `npx astryx component --list`.

---

## 1. Executive summary

The UI is exactly the layered accretion described: vanilla CSS → Tailwind v4 → ad-hoc additions, with **zero Astryx adoption today** (the packages are installed but `reset.css`/`astryx.css` are imported nowhere). Every view is hand-rolled: **528 raw `<div>`s, 110 raw hex colors, 65 inline style objects, ~349 hardcoded px values, 360 Tailwind arbitrary values** across ~6,000 lines of JSX, plus a 317-line `styles.css` of which **~40% is dead code**.

Two structural facts dominate the path to compliance:

1. **Astryx components are React-only.** `@astryxdesign/core` peer-depends on `react >= 19`, `react-dom >= 19`, and `@stylexjs/stylex`; every component implementation imports React; `astryx.css` ships only hashed StyleX atomics (no semantic classes to piggyback on). The app is **SolidJS**. No Astryx component can be mounted from Solid. *(Adversarially verified: CONFIRMED.)*
2. **The token bridge collides with the app's existing theme.** The app's `@theme` block in `styles.css` already defines `--color-accent`, `--color-card`, `--color-text-primary`, `--color-text-muted`, etc., bound to a **runtime** theming system (6 accent themes + `.light` class, set from JS in `uiStore.js`). Astryx's `tailwind-theme.css` defines the **same Tailwind theme names** bound to a *different* mechanism (`light-dark()` + `color-scheme`). The colliding utilities are used **~600 times** (`text-primary` ×324, `text-muted` ×112, `bg-accent` ×77, …). Naive import silently rebinds the whole app to a theme system that ignores the user's accent choice and light/dark toggle. *(Adversarially verified — this was caught by the verifier, not the original analyst.)*

**Bottom line:** literal 100% convention compliance ("use the 149 Astryx components") requires migrating the app to React (~3–6 weeks, high risk across web + Electron + Capacitor). The verified recommendation is **~90% compliance while staying on Solid**: adopt Astryx's framework-agnostic foundation (reset, full token system, a custom-built `sequent` theme via `astryx theme build`), then build a small Solid component kit that matches the Astryx spec component-for-component, using `npx astryx component <Name>` docs and swizzled source as the spec. Details in [§6](#6-paths-to-compliance).

---

## 2. Baseline metrics (verified)

| Metric | Count | Convention target |
|---|---|---|
| UI JSX lines audited | ~6,000 (34 `.jsx` files) | — |
| Raw `<div>` elements | **528** | 0 — components do all layout |
| Raw hex colors (JSX + CSS) | **110** (31 distinct color values repo-wide) | 0 — tokens for every value |
| Inline `style=` objects | **65** | ~0 (data-driven geometry exempt) |
| Hardcoded px values | **~349** | 0 outside region budgets |
| Tailwind arbitrary values (`w-[400px]`, `bg-[#333]`…) | **360** | 0 |
| Astryx imports (`reset.css`, `astryx.css`, components) | **0** | required in app entry |
| `aria-*` attributes in `src/` | **0** | Astryx components ship WAI-ARIA |
| Dead vanilla CSS rule groups in `styles.css` | 12 of ~30 (~40%) | 0 |
| Unit tests | 88 passing / 9 files | keep green throughout |
| E2E tests | 24 Playwright tests, **currently not runnable here** (browser version mismatch; workaround identified) | must run before overhaul |
| Visual regression baselines | 0 | needed before overhaul |

## 3. Per-area scorecard

Findings: **87 critical / 82 major / 40 minor** across 10 areas. Effort assumes the recommended Solid-kit path; areas share the kit so per-area effort drops once it exists.

| Area | Files / lines | Crit / Maj / Min | Effort | Dominant problems |
|---|---|---|---|---|
| Timeline | `TimelineView.jsx` · 815 | 9 / 8 / 3 | **XL** | 104 divs; hand-rolled segmented control, checkbox, skeleton, icon buttons, empty states; custom 1px-per-minute day grid (stays custom-but-tokenized); imperative DOM (`getElementById`, `querySelector('.day-section.is-today')`); raw hex fallbacks `#E8942A`/`#6B5BDB`; `bg-red-500` now-line |
| Calendar | 3 files · 962 | 10 / 8 / 7 | **XL** | full-bleed month grid (no Astryx equivalent — Astryx `Calendar` is a date *picker*); dataTransfer drag-and-drop; hand-rolled toggles/nav |
| Settings | `SettingsView.jsx` · 481 | 10 / 6 / 4 | L | 98 divs; hand-rolled Switch/Selector/Slider equivalents; should be `Section` + `FormLayout` |
| Modals | 5 files · 1,164 | 10 / 8 / 3 | L | custom `Modal.jsx` (no focus trap, no `role=dialog`, no Escape) instead of `Dialog`; `setTimeout(focus, 50)` hacks |
| Pickers | 7 files · 797 | 8 / 8 / 5 | L | hand-rolled `DatePicker`/`TimePicker`/`SelectPicker` → Astryx `DateInput`/`TimeInput`/`Selector`/`Typeahead`; ColorPicker stays custom (no equivalent) |
| Layout/sidebar | 4 files · 587 | 9 / 12 / 4 | L | `<aside>` + glass CSS instead of `SideNav`; flyout positioned via `getBoundingClientRect` + scroll listeners; heatmap stays custom-but-tokenized; hardcoded `#1a1a1a` context menu |
| Tasks | 3 files · 275 | 10 / 9 / 4 | L | hand-rolled list rows → `List`/`ListItem` + `CheckboxInput`; DnD logic stays custom |
| UI primitives | 6 files · 340 | 9 / 13 / 3 | M | custom Modal/EmptyState/Toast/ErrorBoundary duplicate Astryx `Dialog`/`EmptyState`/`Toast`/`Banner`; ToastProvider has no `aria-live` |
| Archive | 1 file · ~150 | 5 / 3 / 3 | S | cleanest area; still div-rows → `List`/`Table` |
| App shell | `App.jsx`, `index.jsx`, `index.html`, `styles.css` | 7 / 7 / 4 | L | no `AppShell`/`Layout` frame; sidebar `lg:w-[20vw]` (violates 240–280px budget); `100vh` not `100dvh` (breaks under Android WebView keyboard); z-index anarchy (`z-[90]`/`z-[100]`/`z-50`/`z-[1000]`/`z-[9999]`); no Astryx CSS imports; glassmorphism aurora orbs conflict with the surface/body token model |

## 4. Cross-cutting findings

### 4.1 CSS archaeology (`styles.css`, 317 lines)
- **12 dead rule groups (~40%)**: view-enter/exit keyframes, `.sidebar-transition`, `.sidebar-closed`, accordion, `.task-checkbox-animate`, `.modal-pop-in/out` classes, `.timeline-card`, all six `.theme-*` accent classes, 5 unused custom properties, `overlayFadeIn`, an empty universal rule, `.clickable`.
- **Three divergent accent palettes** for the same feature: dead `.theme-*` classes (Apple palette), `uiStore.js` runtime `setProperty` palette, and per-item colors persisted in Supabase/IndexedDB. `--secondary-rgb` never updates.
- **`!important` wars**: global `button:active { transform: scale(0.96) !important }` vs Tailwind `active:` utilities; `.calendar-day-cell:hover !important` vs `hover:bg-*` on the same element.
- **Two different error reds in one class string**: `bg-red-500/10 … text-[#ff4d4f]` (`EventViewModal.jsx:179`).
- Modal animation split across stylesheet keyframes + JS inline `style.animation`.

### 4.2 Shell & accessibility
- No routing: view switching is a store string — Android hardware back exits the app; no deep links.
- `viewport-fit=cover` declared but **zero** `env(safe-area-inset-*)` usage.
- **Zero `aria-*` in the entire tree**; no focus traps; toasts invisible to screen readers; calendar-visibility checkboxes are `display:none` (unreachable by keyboard). Adopting Astryx-spec components fixes most of this for free — their specs ship WAI-ARIA patterns (`useGridFocus`, `useListFocus`, Dialog focus management).

### 4.3 Test safety net (testing as the audit-and-verify loop)
- The 88 unit tests are mostly store/logic-level and **survive a UI rewrite**; component tests use role/text queries (good) but coverage is thin.
- E2E: 24 Playwright tests exist but (a) don't run in this environment without pointing at `/opt/pw-browsers/chromium-1194` (verified workaround), and (b) are **coupled to current markup** (`aside >> button:has-text(…)`, `#main-content`) — they break on the first shell swap and must be migrated to role-based locators.
- **Untested load-bearing logic**: `calculateGridOverlap` (timeline layout math), `expandRecurringItems` (rrule expansion), Modal close contract, form-submit wiring, toasts, drag-and-drop, and all visual layout (no screenshot baselines).
- **Pre-refactor test plan (Phase 0)**: pin `calculateGridOverlap` + `expandRecurringItems` with unit tests; characterization tests for Modal contract, form submits, toasts, seeded-store view rendering; extract CalendarView's `onDrop` into a pure function and test it; fix the e2e browser wiring; capture `toHaveScreenshot` baselines per view/theme as the during-migration regression gate.

### 4.4 Deployment landmines the overhaul will trip (critic findings)
- **`service-worker.js` precaches `./styles.css` and `./app.js` — pre-Vite paths that don't exist in the build output**, with cache-first strategy. Must be fixed *before* shipping the overhaul or existing installs pin the old shell.
- Hardcoded dark chrome `#0F0F0F` in `index.html` `theme-color`, `manifest.json`, and Electron `BrowserWindow backgroundColor` — no story for light mode; must map to tokens.
- CSP pins Google Fonts hosts; typography (DM Sans + Major Mono Display brand face, used in 20 files) has no mapping to Astryx type tokens yet.
- `@scope` and `light-dark()` (used by Astryx theme CSS) need Chromium 118/123+: Electron 31 (Chromium 126) is fine; **Capacitor Android depends on device WebView version** — a WebView floor must be an acceptance criterion.
- `icon_generator/` + `icons/` embed the `#E8942A` brand accent; they go stale if the accent changes.

## 5. Component mapping (current pattern → Astryx)

All names verified to exist. **Frame:** `AppShell` + `SideNav` (budget 256–280px), content in `Layout`/`LayoutHeader`/`LayoutContent`/`LayoutPanel` (today-pane → `LayoutPanel width={380}` resizable via `useResizable`).

| Current surface | Astryx solution | Fit |
|---|---|---|
| Sidebar + nav | `SideNav` (`SideNavHeading`/`SideNavSection`/`SideNavItem`/`SideNavCollapseButton`), `Badge` for counts | direct |
| Custom `Modal.jsx` + 7 modal screens | `Dialog`/`DialogHeader`, `AlertDialog` for destructive confirms, body = `FormLayout` | direct |
| Date/Time/Select/Duration pickers | `DateInput`, `TimeInput`, `DateTimeInput`, `Selector`, `Typeahead`, `NumberInput` | direct |
| Settings page | `Section` + `FormLayout`, `Switch`, `Selector`, `Slider` | direct |
| Task/archive/agenda rows | `List`/`ListItem` edge-to-edge, `CheckboxInput` leading, `Token`/`StatusDot`, `MoreMenu` trailing | direct |
| Toasts | `Toast` driven by existing `toastStore`; status via `--color-success/-error/-warning` | direct |
| Login | Basic Login template: `Center` + `Card` + `TextInput`/`Button` | direct |
| Empty/error/loading | `EmptyState`, `Skeleton`, `Banner status='error'`, `Spinner` | direct |
| Segmented list/grid toggle, icon buttons | `SegmentedControl`, `IconButton`/`Icon` | direct |
| Pomodoro widget | `Card` (legit use) + `IconButton` + `Text`; **radial ring stays custom SVG** (ProgressBar is linear) | partial |
| Month calendar grid | **No equivalent** (Astryx `Calendar` = date picker). Frame with `Layout`+`LayoutHeader`; grid stays custom via `Grid` + `useGridFocus` spec, tokenized | none |
| Timeline day canvas (1px-per-minute) | **No equivalent** — stays custom-but-tokenized; minute→px geometry is data-driven (exempt), colors/radii/type from tokens | none |
| Sidebar heatmap | **No equivalent** — keep mini-grid, intensity ramp from `--color-accent-muted → --color-accent` | none |
| ColorPicker | **No equivalent** — rebuild swatches from the 11 named hue-family tokens | none |
| Drag-and-drop | **No primitive** — keep existing pointer/DnD logic over Astryx-spec rows | none |
| Glassmorphism aurora orbs | **No concept; conflicts with surface/body token model** — retire or keep as accepted deviation | decision |

## 6. Paths to compliance

| Path | What | Effort | Compliance ceiling | Verdict |
|---|---|---|---|---|
| **A** — Migrate app to React 19 | Rewrite 34 JSX files, 6 `solid-js/store` stores, tests, vite config; adopt Astryx components directly | 3–6 weeks (likely understated) | ~100% — the only path that literally uses the 149 components | Disproportionate unless literal component usage is mandated |
| **B** — Solid + Astryx foundation + Solid kit ✅ **recommended** | Adopt `reset.css` + token system + **custom `sequent` theme built with `astryx theme build`** (resolves the collision instead of papering over it); build ~15-component Solid kit to Astryx spec (swizzled source + `component` docs as spec — expect rewrites, not ports); migrate views area-by-area | ~1–2 weeks of focused work | **~85–90%** — exact palette/spacing/radii/type/dark-mode + all layout/density/status conventions; not the literal React components | Best value; verifier confirmed the constraint is real and this path sound, with corrections folded in below |
| **C** — Tokens-only cleanup | Token/color/px sweep, no component adoption | 2–4 days *if done as B's milestone 1* | ~40–60% | Not "coherent and nice" alone; do it as B's first milestone |
| **D** — React islands (verifier's addition) | Solid app + selectively mount a few complex Astryx components (e.g. `DateTimeInput`) as React islands | +react/react-dom bundle, interop boundary | between B and A | Viable escape hatch for the hardest components; not the backbone |

**Important correction from verification:** Milestone C/B-1 is *not* a drop-in — because of the `--color-*` namespace collision (§1.2), the first step is a **token-namespace reconciliation**: build a `sequent` Astryx theme from the app's existing 6 accent palettes + light/dark values (`astryx theme build`, the CLI is already installed), decide the light/dark driver (`color-scheme` + `light-dark()` replacing the `.light` class), and rebind the ~600 utility usages deliberately.

## 7. Recommended migration plan (Path B)

- **Phase 0 — Safety net (before touching UI):** pre-refactor tests from §4.3; fix e2e browser wiring; screenshot baselines per view × theme; fix service-worker precache list.
- **Phase 1 — Foundation:** import `reset.css` + `astryx.css`; build custom `sequent` theme (6 accents, light/dark via `color-scheme`); reconcile the `@theme` collision; delete the 12 dead CSS rule groups; map fonts to type tokens; update `theme-color`/manifest/Electron chrome to follow theme.
- **Phase 2 — Solid kit (~15 components):** Button/IconButton, Dialog (focus trap, Escape, `aria-modal`), List/ListItem, Text/Heading, TextInput/TextArea, Switch, Selector, SegmentedControl, CheckboxInput, Token/StatusDot/Badge, Toast, EmptyState/Skeleton/Banner, Popover/Menu, FormLayout/Section — each built to its `npx astryx component <Name>` spec, with unit tests.
- **Phase 3 — Shell:** AppShell-equivalent frame + SideNav-equivalent sidebar (256–280px budget, icon rail on collapse), `100dvh`, safe-area insets, z-index scale, single scroll-container policy, Android back-button handling.
- **Phase 4 — Views, one per PR, screenshot-gated:** archive (pilot, S) → tasks → settings → modals/pickers → layout widgets → calendar → timeline (XL last, custom canvas tokenized).
- **Phase 5 — Cleanup:** remove dead code, kill remaining raw hex/px/arbitrary values (lint rule to prevent regression), a11y pass, e2e migration to role-based locators, WebView floor check on Android.

## Open decisions

1. **Path A (React, literal 100%) vs Path B (Solid kit, ~85–90%) vs B+D (islands)** — gates everything.
2. **User-selectable arbitrary colors** (per-calendar/list hex persisted in Supabase/IndexedDB) — keep as accepted token exception, or migrate stored data to a bounded Astryx hue palette?
3. **`android_client/` (native Compose app duplicating every screen)** — out of scope / frozen / align its theme manually?
4. **Bespoke flourishes** — glassmorphism aurora background, click-origin modal spring, swipe-to-dismiss bottom sheet (primary mobile interaction), Major Mono Display brand type: keep (accepted deviations) or retire?

## 8. Post-migration results (2026-07-05)

**Scope & method:** identical to §2 — `src/**/*.jsx` (57 files, excluding `*.test.*`), `styles.css`, `index.html`; same greps (`grep -o '<div'`, `#[0-9a-fA-F]{3,8}`, `style=`, `[a-zA-Z-]+-\[…\]`, `aria-[a-z]+`, `[0-9]+px`). "kit/" = the 26-component Solid kit under `src/components/kit/` (Path B, §6); "app" = everything else.

### 8.1 Before/after metrics

| Metric | Before (§2, 2026-07-04) | After (2026-07-05) | Notes |
|---|---|---|---|
| Raw `<div>` elements | 528 | **345** — app views **261**, kit internals **84** | kit divs implement the Astryx component specs; app residue is mostly the sanctioned custom canvases (timeline 58, calendar 43+21) + modal scaffolding |
| Raw hex colors (JSX + CSS + HTML) | 110 (31 distinct) | **46 occurrences / 13 distinct — 0 used as hardcoded styling** | breakdown: 3 in comments; **9 sanctioned** brand-logo SVG fills (Google ×8, Microsoft ×1); **18 sanctioned** palette-definition data arrays (`COLORS` in AddCalendarModal/AddListModal, `themes` in SettingsView); 12 persisted-user-color defaults (data values, snapped via `snapUserColor` at render); 4 platform `theme-color` chrome (`index.html` ×2, `src/index.jsx` ×2, mirroring `--color-background-body`) |
| Raw hex in `styles.css` | present | **0** | |
| Inline `style=` | 65 | **58** — kit 16, app **42, all data-driven; hardcoded styling: 0** | app split: timeline/calendar minute→px geometry (`top/height/left/width`), picker `Portal` coords, sentinel/progress/pane-width state geometry, and user-color vars (`snapUserColor(...).cssVar` swatches/dots, `color-mix` chips from pre-snapped `item.color`) |
| Tailwind arbitrary values | 360 | **273** — kit 149 (spec internals, predominantly `var(--token)`-backed), app **124** | app split: 42 token-backed (`shadow-[var(--shadow-low)]`, `z-[var(--z-popover,60)]`, `duration-[var(--duration-fast)]`…); ~64 canvas-geometry/region-budget px (`h-[1440px]` day canvas, `h-[60px]` hour rows, gutters `w-[60px]`/`min-w-[48px]`, `max-w-[800px]`/`w-[350px]` budgets); ~18 misc hardcoded (`text-[9px]`/`[11px]`, `scale-[1.02]`, `ease-[cubic-bezier(…)]` ×2, `content-['']` ×2, heatmap cell sizes) |
| Hardcoded px (`grep -oE '[0-9]+px'`, incl. comments) | ~349 | **212** — app 119, kit 93 | dominated by the same geometry constants as above |
| `aria-*` attributes | **0** | **355** — kit 252, app 103 | 28 distinct attributes; `aria-live` toasts, `aria-modal` dialogs, roving `aria-activedescendant`, etc. |
| Astryx imports | 0 | **present** | `styles.css`: `@astryxdesign/core/reset.css`, `astryx.css`, `tailwind-theme.css` bridge, generated `src/theme/sequent.css` + `accents.css`, layer order pinned; loaded from `src/index.jsx` |
| Dead `styles.css` rule groups | 12 of ~30 (~40%) | **0** (file 317 → 166 lines) | every remaining class verified in use: `animate-pulse-glow`, `task-strike-animate`, `slide-left/right-anim`, `timeline-row-enter`, `calendar-day-cell`; `modalPopIn/Out` keyframes consumed by kit `Dialog` |
| Unit tests | 88 passing / 9 files | **645 passing / 40 files** (re-run 2026-07-05) | e2e/screenshot suites not re-run in this pass |

### 8.2 Per-convention verdicts

| Convention | Verdict | Evidence |
|---|---|---|
| Setup imports (reset/astryx.css) | **COMPLIANT** | `styles.css` imports reset + astryx + tailwind bridge + built theme; entry `src/index.jsx` imports `../styles.css` |
| No `<div>` / components do layout | **PARTIAL** | 261 raw divs remain in app views (down 51% from 528); kit rows/dialogs/forms carry structure, but custom canvases and view scaffolding are still div-built |
| Frame-first shell | **COMPLIANT** | `App.jsx` = kit `AppShell` (`h-dvh`, `env(safe-area-inset-*)`) + `SideNav` sidebar; `--sidenav-width: 272px` inside the 256–280px budget; shell z-index only via `--z-scrim/sidenav/popover/dialog/toast` |
| Dense data as rows | **COMPLIANT** | Tasks/Archive/Settings use `List`/`ListItem` edge-to-edge with `CheckboxInput`/`MoreMenu`-pattern trailing actions; zero `Card`-wrapped list items in those views |
| StatusDot/Token/Badge usage | **COMPLIANT** | `StatusDot` for status (Sidebar, SidebarAtAGlance, EventViewModal); `Token` for categories (ArchiveView, EventViewModal); `Badge` only as enumerated provider label (`SettingsView:402,478`) — no decorative Badge |
| Tokens for every value | **PARTIAL** | Colors fully tokenized (0 styling hex; shadows/motion/z via vars) but ~82 non-token arbitrary px values + literal geometry px persist in views |
| Theme via `astryx theme` | **COMPLIANT** | `src/theme/sequent.css` is `@generated by astryx theme build` from `sequentTheme.ts`; accents are `:root[data-accent="…"]` overrides of accent-family tokens only, in the `astryx-theme` layer — no raw `--color-*` overrides on bare `:root` |

### 8.3 Documented exceptions (sanctioned deviations)

1. **User-color hue snapping at render** — per-calendar/list colors persist as raw hex data (Supabase/IndexedDB, incl. 12 in-code defaults); every render path routes through `snapUserColor` (`src/lib/colorTokens.js`) onto the bounded theme-adaptive hue-token palette. Stored data intentionally not migrated (§Open decisions 2).
2. **Brand logos** — 9 hex fills in Google/Microsoft SVG marks (`LoginScreen`, `SettingsView`); brand colors must not theme.
3. **Data-driven geometry** — 1px-per-minute timeline/calendar canvases (`top/height` from minutes, `h-[1440px]` day height), picker `Portal` coords from `getBoundingClientRect`, heatmap intensity, pomodoro progress width: inline styles/arbitrary values exempt by convention.
4. **Picker z-layer** — DatePicker/TimePicker/ColorPicker portal to `body` at `z-[var(--z-dialog,70)]` (not `--z-popover`) so they clear their host Dialog; deliberate, still on the shell z-scale.
5. **Google Fonts CSP** — `index.html` CSP still pins `fonts.googleapis.com`/`fonts.gstatic.com` for DM Sans + Major Mono Display (mapped to `--font-sans`/`--font-display` tokens); self-hosting deferred.
6. *(theme layer)* Accent palette hex now lives in `src/theme/accents.css` + `sequentTheme.ts` as palette definitions (outside §2 scope by method; sanctioned) since a built Astryx theme carries a single accent — the 6 runtime accents are scoped token overrides.

### 8.4 Remaining known debt

- **261 raw divs** in app views — canvases stay custom by design; modal/settings scaffolding could still shed divs into kit layout primitives.
- **~82 non-token arbitrary px values** in views — grid constants (`h-[60px]`, `h-[1440px]`, gutters) and region budgets could move to CSS vars; ~18 misc (`text-[9px]`, `scale-[1.02]`, raw `cubic-bezier`) should be tokenized.
- **Imperative DOM orchestration** remains in `TimelineView` / `SidebarHeatmap` (`getElementById('timelineScroll')`, `querySelector('.day-section.is-today')`) — works, but fragile coupling flagged in §3.
- **Deprecated `src/components/ui/Modal.jsx`** adapter has zero remaining call sites — safe to delete.
- **Two `!important` rules kept** in `styles.css` (`button:active` tactile scale, `.calendar-day-cell:hover`) — intentional but still overrides utilities.
- **No lint rule yet** blocking raw hex/px regression (Phase 5 item, §7).
- **E2E + screenshot baselines not re-verified** in this pass (unit suite only: 645/645 green); role-based-locator migration status unchecked.
- `index.html`/`index.jsx` `theme-color` chrome hex duplicates `--color-background-body` by hand — regenerate alongside theme rebuilds.
