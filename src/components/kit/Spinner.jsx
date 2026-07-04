// Kit Spinner — SolidJS re-implementation of Astryx Spinner.
// Spec: `npx astryx component Spinner`; swizzled React source studied in
// scratch/swizzle-spinner (size geometry sm/md/lg = 10/14/18px diameters,
// 75% arc over a faded full-ring track, shade variants, label handling).
// The React source paints a <canvas> from resolved theme tokens; here the ring
// is an SVG stroked with currentColor (track = same color at 30% alpha), so
// every shade is just a text-color class and 'inherit' works for free.
// All styling values are Astryx tokens via the Tailwind bridge or var(--*).
import { splitProps, mergeProps, Show } from 'solid-js';
import { cx } from './cx';

// Fixed geometry from the Astryx spec: {ring diameter, stroke width} in px.
const SIZES = {
  sm: { diameter: 10, border: 2 },
  md: { diameter: 14, border: 3 },
  lg: { diameter: 18, border: 3 },
};

// Shade → currentColor source. 'default' uses the accent color
// (text-accent-bg → --color-accent; text-accent would be the accent *text*
// color), 'onMedia' the on-dark color, 'subtle' secondary text; 'inherit'
// leaves currentColor from the parent (e.g. a button's label color).
const SHADE_CLASSES = {
  default: 'text-accent-bg',
  onMedia: 'text-on-dark',
  subtle: 'text-secondary',
  inherit: '',
};

/** How much of the circle the active arc covers (fraction of the ring). */
const SPREAD = 0.75;

/**
 * Spinner is an animated loading indicator for processes of unknown duration.
 * For content with known dimensions use Skeleton instead.
 *
 * Accessible by default: `role="status"` with an aria-label plus a
 * visually-hidden text label, so it announces even with no visible label.
 *
 * Props (per the Astryx Spinner spec, adapted to Solid):
 * @param {'sm'|'md'|'lg'} [size='md'] - Ring diameter (10 / 14 / 18px).
 * @param {'default'|'onMedia'|'subtle'|'inherit'} [shade='default'] - Color
 *   shade: accent on light backgrounds, on-dark for media/accent backgrounds,
 *   subtle for inline lists, inherit to match the parent's currentColor.
 * @param {import('solid-js').JSX.Element} [label] - Visible content below the
 *   spinner. A string label also becomes the accessible name unless
 *   `aria-label` is set explicitly.
 * @param {string} [aria-label='Loading'] - Accessible name for screen readers.
 * @param {string} [class] - Extra classes merged onto the root element.
 * Remaining props (data-*, ref, ...) are spread onto the root element.
 */
export function Spinner(props) {
  const merged = mergeProps({ size: 'md', shade: 'default' }, props);
  const [local, rest] = splitProps(merged, ['size', 'shade', 'label', 'aria-label', 'class']);

  const size = () => (SIZES[local.size] ? local.size : 'md');
  const shade = () => (SHADE_CLASSES[local.shade] != null ? local.shade : 'default');
  const hasLabel = () => local.label != null;
  // Accessible name: explicit aria-label > string label > "Loading" (per spec).
  const ariaLabel = () =>
    local['aria-label'] ?? (typeof local.label === 'string' ? local.label : undefined) ?? 'Loading';

  const ring = () => {
    const { diameter, border } = SIZES[size()];
    const frame = diameter + border * 2;
    const r = diameter / 2;
    const c = 2 * Math.PI * r;
    return { frame, r, border, circumference: c };
  };

  const spinner = (rootProps) => (
    <span
      {...rootProps}
      role="status"
      aria-label={ariaLabel()}
      data-size={size()}
      data-shade={shade()}
      class={cx(
        'astryx-spinner inline-grid place-items-center overflow-hidden align-middle',
        SHADE_CLASSES[shade()],
        rootProps?.class,
      )}
    >
      <svg
        width={ring().frame}
        height={ring().frame}
        viewBox={`0 0 ${ring().frame} ${ring().frame}`}
        fill="none"
        aria-hidden="true"
        // Continuous rotation; dramatically slowed (not frozen — a frozen
        // spinner reads as broken) under prefers-reduced-motion, per source.
        class="animate-spin [animation-duration:var(--duration-slow-min)] motion-reduce:[animation-duration:3s]"
      >
        {/* Track: full ring in the same color at 30% alpha */}
        <circle
          cx={ring().frame / 2}
          cy={ring().frame / 2}
          r={ring().r}
          stroke="currentColor"
          stroke-width={ring().border}
          opacity="0.3"
        />
        {/* Active arc: 75% of the ring, round caps */}
        <circle
          cx={ring().frame / 2}
          cy={ring().frame / 2}
          r={ring().r}
          stroke="currentColor"
          stroke-width={ring().border}
          stroke-linecap="round"
          stroke-dasharray={`${ring().circumference * SPREAD} ${ring().circumference}`}
          transform={`rotate(-90 ${ring().frame / 2} ${ring().frame / 2})`}
        />
      </svg>
      {/* Visually-hidden label so the status announces even without aria support */}
      <span class="sr-only">{ariaLabel()}</span>
    </span>
  );

  return (
    <Show when={hasLabel()} fallback={spinner({ ...rest, class: local.class })}>
      <div {...rest} class={cx('inline-flex flex-col items-center gap-2', local.class)}>
        {spinner({})}
        <Show
          when={typeof local.label === 'string'}
          fallback={local.label}
        >
          <span class="font-bold text-primary text-[length:var(--text-body-size)] leading-[var(--text-body-leading)]">
            {local.label}
          </span>
        </Show>
      </div>
    </Show>
  );
}
