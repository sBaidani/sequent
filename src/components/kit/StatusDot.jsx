// Kit StatusDot — SolidJS re-implementation of Astryx StatusDot.
// Spec: `npx astryx component StatusDot` (five semantic variants, fixed 8px dot,
// role="img" + aria-label, optional pulse that respects prefers-reduced-motion).
// All styling values are Astryx tokens via the Tailwind bridge
// (@astryxdesign/core/src/tailwind-theme.css) or var(--*) custom properties.
import { splitProps, mergeProps } from 'solid-js';
import { cx } from './cx';

const VARIANT_CLASSES = {
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  // bg-accent-bg → --color-accent (bg-accent would be the accent *text* color)
  accent: 'bg-accent-bg',
  // Astryx uses --color-icon-secondary for neutral; no bridge utility, so var().
  neutral: 'bg-(--color-icon-secondary)',
};

/**
 * A small colored dot communicating status (presence, severity, liveness).
 * Always pair with visible text — color alone must not carry meaning.
 *
 * Props (per the Astryx StatusDot spec, adapted to Solid):
 * @param {'success'|'warning'|'error'|'accent'|'neutral'} variant - Semantic
 *   color variant (required).
 * @param {string} label - Accessible label surfaced via aria-label (required).
 * @param {boolean} [isPulsing=false] - Pulse animation for states needing
 *   attention; disabled under prefers-reduced-motion.
 * @param {string} [tooltip] - Explanatory text shown on hover (native title).
 * @param {string} [class] - Extra classes merged onto the root element.
 * Remaining props (data-*, aria-*, ref, ...) are spread onto the root <span>.
 */
export function StatusDot(props) {
  const merged = mergeProps({ isPulsing: false }, props);
  const [local, rest] = splitProps(merged, ['variant', 'label', 'isPulsing', 'tooltip', 'class']);

  return (
    <span
      {...rest}
      role="img"
      aria-label={local.label}
      title={local.tooltip}
      data-variant={local.variant}
      class={cx(
        // size-2 → 8px via the bridge spacing scale (spec-fixed geometry)
        'astryx-statusdot inline-block size-2 rounded-full shrink-0',
        VARIANT_CLASSES[local.variant],
        // Tailwind's pulse (opacity 1 → .5 → 1 over 2s) matches the Astryx keyframes.
        local.isPulsing && 'animate-pulse motion-reduce:animate-none',
        local.class,
      )}
    />
  );
}
