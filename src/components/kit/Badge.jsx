// Kit Badge — SolidJS re-implementation of Astryx Badge.
// Spec: `npx astryx component Badge` (semantic variants = solid backgrounds,
// hue variants = tinted bg + vivid text). Per project convention, Badge is for
// counts and enumerated states ONLY — never decoration — so this kit version
// adds first-class count support with max/overflow display ("99+").
// All styling values are Astryx tokens via the Tailwind bridge
// (@astryxdesign/core/src/tailwind-theme.css) or var(--*) custom properties.
import { splitProps, mergeProps, Show } from 'solid-js';
import { cx } from './cx';

const BASE_CLASSES = cx(
  // h-5 → 20px (--spacing-5), px-2 → --spacing-2, rounded-full → --radius-full
  'astryx-badge inline-flex items-center justify-center gap-1 h-5 px-2',
  'rounded-full font-medium text-sm leading-[var(--text-supporting-leading)]',
  'whitespace-nowrap',
);

// Semantic variants use solid status backgrounds (loud, for system state);
// hue variants use tinted subtle/vivid pairs (for categories/tags).
const VARIANT_CLASSES = {
  neutral: 'bg-neutral text-primary',
  info: 'bg-accent-bg text-on-accent',
  success: 'bg-success text-on-success',
  warning: 'bg-warning text-on-warning',
  error: 'bg-error text-on-error',
  blue: 'bg-blue-subtle text-blue-vivid',
  cyan: 'bg-cyan-subtle text-cyan-vivid',
  green: 'bg-green-subtle text-green-vivid',
  orange: 'bg-orange-subtle text-orange-vivid',
  pink: 'bg-pink-subtle text-pink-vivid',
  purple: 'bg-purple-subtle text-purple-vivid',
  red: 'bg-red-subtle text-red-vivid',
  teal: 'bg-teal-subtle text-teal-vivid',
  yellow: 'bg-yellow-subtle text-yellow-vivid',
};

/**
 * Badge highlights a count or an enumerated state at a glance. Read-only —
 * never clickable, never decorative. Use semantic variants only for system
 * status that demands attention; hue variants for category tags.
 *
 * Props (per the Astryx Badge spec, adapted to Solid):
 * @param {'neutral'|'info'|'success'|'warning'|'error'|'blue'|'cyan'|'green'|'orange'|'pink'|'purple'|'red'|'teal'|'yellow'} [variant='neutral']
 *   Visual style variant. Semantic variants use solid backgrounds; hue
 *   variants use tinted backgrounds with vivid text.
 * @param {import('solid-js').JSX.Element} [label] - Enumerated state text
 *   (e.g. "Failed", "Engineering"). Ignored when `count` is provided.
 * @param {number} [count] - Numeric count to display. Values above `max`
 *   render as "<max>+" (e.g. 120 → "99+").
 * @param {number} [max=99] - Overflow ceiling for `count`.
 * @param {import('solid-js').JSX.Element} [icon] - Optional leading icon;
 *   always pair with a text label.
 * @param {string} [class] - Extra classes merged onto the root element.
 * Remaining props (data-*, aria-*, ref, ...) are spread onto the root <span>.
 */
export function Badge(props) {
  const merged = mergeProps({ variant: 'neutral', max: 99 }, props);
  const [local, rest] = splitProps(merged, ['variant', 'label', 'count', 'max', 'icon', 'class']);

  const content = () => {
    if (typeof local.count === 'number') {
      return local.count > local.max ? `${local.max}+` : String(local.count);
    }
    return local.label;
  };

  return (
    <span
      {...rest}
      data-variant={local.variant}
      class={cx(BASE_CLASSES, VARIANT_CLASSES[local.variant], local.class)}
    >
      <Show when={local.icon}>
        <span class="inline-flex items-center shrink-0">{local.icon}</span>
      </Show>
      {content()}
    </span>
  );
}
