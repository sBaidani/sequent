// colorTokens — bounded Astryx hue palette for per-item USER colors
// (calendars, task lists) plus nearest-hue snapping for stored colors.
//
// The design system exposes ~10 hue families through the Tailwind bridge
// (@astryxdesign/core/src/tailwind-theme.css): each family has subtle/ring/
// vivid sub-tokens; the `-vivid` variant is the designated high-contrast
// color for text/icons/dots, and adapts to light/dark via the theme
// (src/theme/sequent.css --color-text-<hue>).
//
// Each entry carries:
//   name   — hue family name (matches the bridge utility suffix, e.g.
//            `text-blue-vivid`).
//   cssVar — CSS variable reference to render the hue theme-adaptively.
//   hex    — a representative sRGB value for the hue, used both for
//            nearest-hue distance math and as the value the ColorPicker
//            writes to stores/DB (existing persistence stays plain hex).
//            Values are the theme's saturated mid-tones (the dark-theme
//            `--color-border-<hue>` ring colors from src/theme/sequent.css;
//            gray uses the icon tone since its ring is a surface shade).
export const HUE_TOKENS = Object.freeze([
  Object.freeze({ name: 'red', cssVar: 'var(--color-red-vivid)', hex: '#ff6f6c' }),
  Object.freeze({ name: 'orange', cssVar: 'var(--color-orange-vivid)', hex: '#e2883e' }),
  Object.freeze({ name: 'yellow', cssVar: 'var(--color-yellow-vivid)', hex: '#c0990e' }),
  Object.freeze({ name: 'green', cssVar: 'var(--color-green-vivid)', hex: '#69ad67' }),
  Object.freeze({ name: 'teal', cssVar: 'var(--color-teal-vivid)', hex: '#63ab9d' }),
  Object.freeze({ name: 'cyan', cssVar: 'var(--color-cyan-vivid)', hex: '#67a7b8' }),
  Object.freeze({ name: 'blue', cssVar: 'var(--color-blue-vivid)', hex: '#6d9cfe' }),
  Object.freeze({ name: 'purple', cssVar: 'var(--color-purple-vivid)', hex: '#dd74f0' }),
  Object.freeze({ name: 'pink', cssVar: 'var(--color-pink-vivid)', hex: '#f273aa' }),
  Object.freeze({ name: 'gray', cssVar: 'var(--color-gray-vivid)', hex: '#a1a1aa' }),
]);

const GRAY_TOKEN = HUE_TOKENS.find((t) => t.name === 'gray');

/**
 * Parse a CSS color string into {r, g, b} (0-255 each).
 * Supports #rgb, #rrggbb (alpha digits tolerated and ignored) and
 * rgb()/rgba() with comma-, space- or slash-separated integer channels.
 * @param {string} input
 * @returns {{r: number, g: number, b: number} | null} null when unparseable.
 */
function parseCssColor(input) {
  if (typeof input !== 'string') return null;
  const value = input.trim().toLowerCase();

  // #rgb / #rgba (shorthand) and #rrggbb / #rrggbbaa — alpha is ignored.
  const hexMatch = value.match(/^#([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/);
  if (hexMatch) {
    const digits = hexMatch[1];
    if (digits.length <= 4) {
      return {
        r: parseInt(digits[0] + digits[0], 16),
        g: parseInt(digits[1] + digits[1], 16),
        b: parseInt(digits[2] + digits[2], 16),
      };
    }
    return {
      r: parseInt(digits.slice(0, 2), 16),
      g: parseInt(digits.slice(2, 4), 16),
      b: parseInt(digits.slice(4, 6), 16),
    };
  }

  // rgb(255, 111, 108) / rgba(255 111 108 / 0.5)
  const rgbMatch = value.match(
    /^rgba?\(\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*[,\s]\s*(\d{1,3})\s*(?:[,/][^)]*)?\)$/,
  );
  if (rgbMatch) {
    const clamp = (n) => Math.min(255, Math.max(0, parseInt(n, 10)));
    return { r: clamp(rgbMatch[1]), g: clamp(rgbMatch[2]), b: clamp(rgbMatch[3]) };
  }

  return null;
}

/**
 * Weighted RGB ("redmean") distance — a cheap perceptual improvement over
 * plain Euclidean distance that keeps e.g. pure #ff0000 snapping to the red
 * family rather than a numerically-closer warm neighbor.
 */
function colorDistance(a, b) {
  const rMean = (a.r + b.r) / 2;
  const dr = a.r - b.r;
  const dg = a.g - b.g;
  const db = a.b - b.b;
  return (2 + rMean / 256) * dr * dr + 4 * dg * dg + (2 + (255 - rMean) / 256) * db * db;
}

/**
 * Snap an arbitrary stored user color to the nearest Astryx hue token.
 *
 * @param {string} cssColor - #rgb, #rrggbb or rgb()/rgba() color string.
 * @returns {{name: string, cssVar: string, hex: string}} the nearest entry
 *   of HUE_TOKENS; unknown/invalid input snaps to the gray token.
 */
export function snapUserColor(cssColor) {
  const rgb = parseCssColor(cssColor);
  if (!rgb) return GRAY_TOKEN;

  let best = GRAY_TOKEN;
  let bestDistance = Infinity;
  for (const token of HUE_TOKENS) {
    const distance = colorDistance(rgb, parseCssColor(token.hex));
    if (distance < bestDistance) {
      bestDistance = distance;
      best = token;
    }
  }
  return best;
}
