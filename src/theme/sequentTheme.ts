/**
 * Sequent Theme
 *
 * Astryx theme for the Sequent app — dark-first surfaces matching the
 * existing product (#1c1c1e body, translucent white cards, #2c2c2e
 * popovers) with a light mode derived from the app's `.light` palette
 * (#f4f5f7 body, white cards, #111827 ink).
 *
 * Light/dark is driven by `color-scheme` + light-dark() — the [light, dark]
 * tuples below compile to light-dark() pairs. uiStore.js sets
 * `document.documentElement.style.colorScheme` from the stored mode.
 *
 * Accent: amber #E8942A by default. Light mode desaturates the accent by
 * mixing 75% accent + 25% #666666 (the app's historical treatment) —
 * amber's light stop is #c88939. The 5 alternate user-selectable accents
 * are applied as [data-accent="…"] token overrides in ./accents.css
 * (kept outside defineTheme because Astryx themes are one-accent-per-theme;
 * the accent variants override only the accent-family tokens).
 *
 * Typography: DM Sans body, Major Mono Display headings/display (the app's
 * brand face, loaded via Google Fonts in index.html).
 *
 * Scaffolded from @astryxdesign/theme-neutral via `astryx theme add` and
 * edited. The neutral theme's OKLCH status + categorical hue ramps are kept
 * as-is — they pass WCAG AA in both modes and will back per-item colors and
 * toast/banner statuses in later phases. React-only parts of the scaffold
 * (icon registry, syntax theme, component style overrides) were dropped:
 * this app consumes only the CSS/token foundation.
 *
 * Build: npx astryx theme build src/theme/sequentTheme.ts --out src/theme/sequent.css
 */

import {defineTheme} from '@astryxdesign/core/theme';

export const sequentTheme = defineTheme({
  name: 'sequent',

  // DM Sans for body copy; Major Mono Display for headings (the lowercase
  // brand face used by every view title today via `font-display`).
  // Scale: base=14, ratio=1.2 (matches the app's 13–14px body sizes).
  typography: {
    scale: {base: 14, ratio: 1.2},
    body: {
      family: 'DM Sans',
      fallbacks:
        'ui-sans-serif, system-ui, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
    },
    heading: {
      family: 'Major Mono Display',
      fallbacks: 'ui-monospace, monospace',
    },
    code: {
      family: 'ui-monospace',
      fallbacks:
        '"SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
    },
  },

  // Snappy motion — the app's springs sit around 200–500ms.
  motion: {fast: 125, medium: 300, slow: 700, ratio: 0.75},

  tokens: {
    // =========================================================================
    // Backgrounds — match the app's current surfaces exactly.
    //   body    #f4f5f7 / #1c1c1e   (old --bg)
    //   card    #ffffff / 4% white  (old --card)
    //   popover #ffffff / #2c2c2e   (old modal chrome, solid)
    //   surface = popover tone: interactive controls lifted above body
    //   muted   = card tone
    // =========================================================================
    '--color-background-surface': ['#ffffff', '#2c2c2e'],
    '--color-background-body':    ['#f4f5f7', '#1c1c1e'],
    '--color-background-card':    ['#ffffff', '#FFFFFF0A'],
    '--color-background-popover': ['#ffffff', '#2c2c2e'],
    '--color-background-muted':   ['#f4f5f7', '#FFFFFF0A'],

    // Accent — amber default; light stop = mix(75% #E8942A, 25% #666666).
    // Alternate accents override these five tokens via [data-accent] in
    // accents.css.
    '--color-accent':       ['#c88939', '#E8942A'],
    '--color-accent-muted': ['#E8942A33', '#E8942A40'],
    '--color-neutral':      ['#0000000F', '#FFFFFF1A'],

    // Overlays (modal scrims, hover/pressed tints)
    '--color-overlay':         ['#00000066', '#00000099'],
    '--color-overlay-hover':   ['#0000000D', '#FFFFFF0D'],
    '--color-overlay-pressed': ['#0000001A', '#FFFFFF1A'],

    // Text — old ladder: #fff / 70% / 40% (dark), #111827 / 70% / 40% (light)
    '--color-text-primary':   ['#111827', '#ffffff'],
    '--color-text-secondary': ['#111827B3', '#FFFFFFB3'],
    '--color-text-disabled':  ['#11182766', '#FFFFFF66'],
    '--color-text-accent':    ['#c88939', '#E8942A'],
    '--color-on-dark':  '#ffffff',
    '--color-on-light': '#111827',
    // White text on every accent (the app's current bg-accent + text-white)
    '--color-on-accent': '#ffffff',

    // Icon — follows the text ladder
    '--color-icon-accent':    ['#c88939', '#E8942A'],
    '--color-icon-primary':   ['#111827', '#ffffff'],
    '--color-icon-secondary': ['#111827B3', '#FFFFFFB3'],
    '--color-icon-disabled':  ['#11182766', '#FFFFFF66'],

    // Status — kept from the neutral scaffold (OKLCH ramps, AA in both modes):
    //   light = pastel T90 surface + dark T30/T40 ink
    //   dark  = 24%-alpha tinted overlay + light T80 pastel ink
    '--color-success': ['#007004', '#9fe59b'],
    '--color-error': ['#a50c25', '#ffc6c1'],
    '--color-warning': ['#745b00', '#fdcf4f'],
    '--color-success-muted': ['#c5e5c0', '#84c9803D'],
    '--color-error-muted': ['#facecb', '#ff9e973D'],
    '--color-warning-muted': ['#f8da9d', '#deb4333D'],
    '--color-on-success': ['#ffffff', '#171717'],
    '--color-on-error':   ['#ffffff', '#171717'],
    '--color-on-warning': '#111827',

    // Border — old: 8% black / 8% white
    '--color-border': ['#00000014', '#FFFFFF14'],
    '--color-border-emphasized': ['#00000029', '#FFFFFF29'],

    // Effects
    '--color-skeleton': ['#e5e7eb', '#FFFFFF1F'],
    '--color-shadow': ['#0000001A', '#0000004D'],
    '--color-tint-hover': ['black', 'white'],

    // =========================================================================
    // Categorical hues — kept from the neutral scaffold (OKLCH, evenly-spaced
    // hues, AA in both modes). Will back per-item calendar/list colors.
    //   bg     light=T87-T90 pastel   dark=T70 hue @ 24% alpha overlay
    //   border light=T80 pastel       dark=T60 mid-bright
    //   icon   light=T30 dark ink     dark=T70 light pastel
    //   text   light=T30 dark ink     dark=T80 light pastel
    // =========================================================================

    // Red  H=22
    '--color-background-red': ['#facecb', '#ff9e973D'],
    '--color-border-red': ['#e6bab8', '#ff6f6c'],
    '--color-icon-red': ['#89001a', '#ff9e97'],
    '--color-text-red': ['#89001a', '#ffc6c1'],

    // Orange  H=55
    '--color-background-orange': ['#fad0b5', '#ffa2583D'],
    '--color-border-orange': ['#e6bda2', '#e2883e'],
    '--color-icon-orange': ['#6e3500', '#ffa258'],
    '--color-text-orange': ['#6e3500', '#ffc9a2'],

    // Yellow  H=90
    '--color-background-yellow': ['#f8da9d', '#deb4333D'],
    '--color-border-yellow': ['#e4c279', '#c0990e'],
    '--color-icon-yellow': ['#584400', '#deb433'],
    '--color-text-yellow': ['#584400', '#fdcf4f'],

    // Green  H=144
    '--color-background-green': ['#c5e5c0', '#84c9803D'],
    '--color-border-green': ['#b2d1ac', '#69ad67'],
    '--color-icon-green': ['#0c5700', '#84c980'],
    '--color-text-green': ['#0c5700', '#9fe59b'],

    // Teal  H=180
    '--color-background-teal': ['#a5e3d6', '#7ec6b83D'],
    '--color-border-teal': ['#94d6c8', '#63ab9d'],
    '--color-icon-teal': ['#005348', '#7ec6b8'],
    '--color-text-teal': ['#005348', '#99e2d3'],

    // Cyan  H=215
    '--color-background-cyan': ['#a3e0ef', '#83c2d43D'],
    '--color-border-cyan': ['#91d3e3', '#67a7b8'],
    '--color-icon-cyan': ['#00505f', '#83c2d4'],
    '--color-text-cyan': ['#00505f', '#9edef0'],

    // Blue  H=255
    '--color-background-blue': ['#c4ddfb', '#9eb7ff3D'],
    '--color-border-blue': ['#b1c9e7', '#6d9cfe'],
    '--color-icon-blue': ['#00458c', '#9eb7ff'],
    '--color-text-blue': ['#00458c', '#c7d3ff'],

    // Purple  H=320
    '--color-background-purple': ['#eccef3', '#f297ff3D'],
    '--color-border-purple': ['#d8bbdf', '#dd74f0'],
    '--color-icon-purple': ['#700084', '#f297ff'],
    '--color-text-purple': ['#700084', '#fac1ff'],

    // Pink  H=355
    '--color-background-pink': ['#fccadc', '#ff99c33D'],
    '--color-border-pink': ['#e7b7c8', '#f273aa'],
    '--color-icon-pink': ['#83004b', '#ff99c3'],
    '--color-text-pink': ['#83004b', '#ffc3da'],

    // Gray (categorical neutral, chroma 0)
    '--color-background-gray': ['#e5e7eb', 'var(--color-neutral)'],
    '--color-border-gray': ['#d4d4d8', '#2c2c2e'],
    '--color-icon-gray': ['#52525b', '#a1a1aa'],
    '--color-text-gray': ['#26262b', '#e4e4e7'],

    // =========================================================================
    // Radius — matches the app's existing 12 / 16 / 32px ladder
    // (old --card-radius-md / --card-radius-lg / --radius-xl).
    // Bridge mapping: rounded-md=element, rounded-lg=container, rounded-xl=page.
    // =========================================================================
    '--radius-none': '0.25rem',
    '--radius-inner': '0.375rem',
    '--radius-element': '0.75rem',
    '--radius-container': '1rem',
    '--radius-page': '2rem',
    '--radius-full': '9999px',

    // =========================================================================
    // Shadows — kept from the neutral scaffold: subtle drops in light mode,
    // deeper drops + 1px white inset rim in dark mode (light-dark() keeps
    // light mode unaffected).
    // =========================================================================
    '--shadow-low':
      '0 2px 4px light-dark(oklch(0 0 0 / 5%), oklch(0 0 0 / 25%)), ' +
      '0 4px 8px light-dark(oklch(0 0 0 / 10%), oklch(0 0 0 / 40%)), ' +
      'inset 0 0 0 1px light-dark(transparent, oklch(1 0 0 / 8%))',
    '--shadow-med':
      '0 2px 4px light-dark(oklch(0 0 0 / 5%), oklch(0 0 0 / 35%)), ' +
      '0 4px 12px light-dark(oklch(0 0 0 / 10%), oklch(0 0 0 / 50%)), ' +
      'inset 0 0 0 1px light-dark(transparent, oklch(1 0 0 / 12%))',
    '--shadow-high':
      '0 4px 6px light-dark(oklch(0 0 0 / 10%), oklch(0 0 0 / 50%)), ' +
      '0 12px 24px light-dark(oklch(0 0 0 / 15%), oklch(0 0 0 / 70%)), ' +
      'inset 0 0 0 1px light-dark(transparent, oklch(1 0 0 / 15%))',
    // Accent-derived insets track the active [data-accent] automatically
    '--shadow-inset-hover':
      'inset 0px 0px 0px 2px color-mix(in srgb, var(--color-accent) 30%, transparent)',
    '--shadow-inset-selected':
      'inset 0px 0px 0px 2px color-mix(in srgb, var(--color-accent) 50%, transparent)',
    '--shadow-inset-success': 'inset 0px 0px 0px 2px #1981004D',
    '--shadow-inset-warning': 'inset 0px 0px 0px 2px #ffce2f4D',
    '--shadow-inset-error': 'inset 0px 0px 0px 2px #e33f4a4D',
  },
});
