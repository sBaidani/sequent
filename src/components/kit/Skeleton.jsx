// Kit Skeleton — SolidJS re-implementation of Astryx Skeleton.
// Spec: `npx astryx component Skeleton`; swizzled React source studied in
// scratch/swizzle-skeleton (token radius scale, --color-skeleton fill,
// 1000ms delay + 100ms stagger per `index`, aria-hidden root).
// Extended with a `shape` convenience prop (text/circle/rect) per the app's
// kit contract — each shape just presets height/radius defaults.
// All styling values are Astryx tokens via the Tailwind bridge or var(--*).
import { splitProps, mergeProps } from 'solid-js';
import { cx } from './cx';

// Animation timing from the Astryx source: initial delay avoids a flash of
// animation for fast loads; the stagger creates a wave across siblings.
const DELAY_TIME = 1000;
const STAGGER_TIME = 100;

// Astryx numeric radius scale → bridge utilities (rounded-sm = --radius-inner,
// rounded-md = --radius-element, rounded-lg = --radius-container).
const RADIUS_CLASSES = {
  none: 'rounded-none',
  0: 'rounded-none',
  1: 'rounded-sm',
  2: 'rounded-md',
  3: 'rounded-lg',
  4: 'rounded-lg',
  rounded: 'rounded-full',
};

const toCss = (value) => (typeof value === 'number' ? `${value}px` : value);

/**
 * Skeleton is an animated placeholder that previews the shape of content
 * while it loads. Match the size/shape of the real content; for unknown
 * dimensions use Spinner instead.
 *
 * Purely decorative: hidden from assistive tech (aria-hidden). Convey the
 * loading state on the surrounding region (e.g. aria-busy).
 *
 * Props (per the Astryx Skeleton spec, adapted to Solid):
 * @param {'text'|'circle'|'rect'} [shape='rect'] - Shape preset:
 *   'text' defaults to a 1em-tall line with inner radius, 'circle' is fully
 *   rounded with height matching width, 'rect' is a block with container radius.
 * @param {number|string} [width='100%'] - Width in px (number) or CSS value.
 * @param {number|string} [height] - Height in px (number) or CSS value.
 *   Defaults to '100%' ('1em' for text; mirrors `width` for circle).
 * @param {'none'|0|1|2|3|4|'rounded'} [radius] - Border radius on the token
 *   scale (default 3; 1 for text; forced 'rounded' for circle).
 * @param {number} [index=0] - Stagger index: animation starts at
 *   1000ms + 100ms × index for a wave effect across multiple skeletons.
 * @param {string} [class] - Extra classes merged onto the root element.
 * Remaining props (data-*, ref, ...) are spread onto the root <div>.
 */
export function Skeleton(props) {
  const merged = mergeProps({ shape: 'rect', width: '100%', index: 0 }, props);
  const [local, rest] = splitProps(merged, [
    'shape',
    'width',
    'height',
    'radius',
    'index',
    'class',
    'style',
  ]);

  const height = () => {
    if (local.height != null) return local.height;
    if (local.shape === 'text') return '1em';
    if (local.shape === 'circle') return local.width;
    return '100%';
  };
  const radius = () => {
    if (local.shape === 'circle') return 'rounded';
    if (local.radius != null && RADIUS_CLASSES[local.radius]) return local.radius;
    return local.shape === 'text' ? 1 : 3;
  };

  return (
    <div
      {...rest}
      // Decorative loading placeholder — hide from assistive tech so it is
      // not announced as empty content (matches the Astryx source).
      aria-hidden="true"
      data-shape={local.shape}
      class={cx(
        // --color-skeleton fill via the bridge; pulse disabled under
        // prefers-reduced-motion (static placeholder still reads as loading).
        'astryx-skeleton bg-skeleton animate-pulse motion-reduce:animate-none',
        RADIUS_CLASSES[radius()],
        local.class,
      )}
      style={{
        width: toCss(local.width),
        height: toCss(height()),
        'animation-delay': `${DELAY_TIME + STAGGER_TIME * local.index}ms`,
        ...(typeof local.style === 'object' ? local.style : {}),
      }}
    />
  );
}
