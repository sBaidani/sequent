// Kit Text — SolidJS re-implementation of Astryx Text.
// Spec: `npx astryx component Text` (types, size/weight/color, truncation, a11y).
// React source studied via `npx astryx swizzle Text` (scratch/swizzle-text).
//
// Type-scale styling (font-family / size / leading) comes from the theme's
// `.astryx-text.<type>` classes (src/theme/sequent.css); colors come from
// `.astryx-text.<color>`. Everything else uses Astryx tokens via the Tailwind
// bridge or var(--*) custom properties — no raw values.
import { createEffect, createSignal, mergeProps, onCleanup, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cx } from './cx';

/** Built-in semantic text types (custom theme types fall back to body baselines). */
const BUILTIN_TYPES = [
  'body',
  'large',
  'label',
  'supporting',
  'code',
  'display-1',
  'display-2',
  'display-3',
];

// `size` prop values → --font-size-* token suffixes (spec's 'xsm' → token 'xs').
const SIZE_TOKEN = {
  '4xs': '4xs',
  '3xs': '3xs',
  '2xs': '2xs',
  xsm: 'xs',
  sm: 'sm',
  base: 'base',
  lg: 'lg',
  xl: 'xl',
  '2xl': '2xl',
  '3xl': '3xl',
  '4xl': '4xl',
};

const DISPLAY_CLASSES = { inline: 'inline', block: 'block' };
// Single-line truncation (maxLines = 1)
const TRUNCATE_SINGLE_CLASSES = 'block overflow-hidden text-ellipsis whitespace-nowrap';
// Multi-line truncation base (maxLines > 1); -webkit-line-clamp is inline (dynamic)
const TRUNCATE_MULTI_CLASSES =
  'overflow-hidden [display:-webkit-box] [-webkit-box-orient:vertical]';
const WORD_BREAK_CLASSES = {
  'break-word': '[word-break:normal] [overflow-wrap:break-word]',
  'break-all': 'break-all',
};
const TEXT_WRAP_CLASSES = {
  wrap: 'text-wrap',
  nowrap: 'text-nowrap',
  balance: 'text-balance',
  pretty: 'text-pretty',
};
const JUSTIFY_CLASSES = { start: 'text-start', center: 'text-center', end: 'text-end' };
// Optical alignment via text-box-trim (forces block display, per spec)
const CAPSIZE_CLASSES = 'block [text-box-edge:cap_alphabetic] [text-box-trim:trim-both]';

/**
 * Semantic text component. Renders body copy, labels, captions, and inline
 * code with type-based styling from the theme.
 *
 * Props (per the Astryx Text spec, adapted to Solid):
 * @param {import('solid-js').JSX.Element} children - Text content (required).
 * @param {'body'|'large'|'label'|'supporting'|'code'|'display-1'|'display-2'|'display-3'} [type='body']
 *   Semantic text type; determines size, weight, and line-height from the theme.
 * @param {'4xs'|'3xs'|'2xs'|'xsm'|'sm'|'base'|'lg'|'xl'|'2xl'|'3xl'|'4xl'} [size]
 *   Explicit font-size override (token-backed). Prefer `type` alone.
 * @param {'primary'|'secondary'|'disabled'|'placeholder'|'accent'|'inherit'} [color]
 *   Text color. Defaults to 'secondary' for type="supporting", else 'primary'.
 * @param {'normal'|'medium'|'semibold'|'bold'} [weight] - Font weight override.
 * @param {'inline'|'block'} [display='inline'] - Display type; silently forced
 *   to 'block' when `maxLines` > 0 or `hasCapsize`.
 * @param {'span'|'p'|'div'|'label'|'h1'|'h2'|'h3'} [as='span'] - Element to render.
 * @param {number} [maxLines=0] - Max lines before truncation (0 = none). When
 *   truncated, the full text is exposed via the native `title` tooltip.
 * @param {boolean|'above'|'below'|'start'|'end'} [hasTruncateTooltip=true]
 *   false disables the truncation tooltip (placement strings are accepted for
 *   spec parity but the native tooltip position is browser-controlled).
 * @param {'break-word'|'break-all'} [wordBreak] - Word break when truncating.
 *   Defaults to 'break-all' for maxLines=1, 'break-word' otherwise.
 * @param {'wrap'|'nowrap'|'balance'|'pretty'} [textWrap] - Text wrapping behavior.
 * @param {'start'|'center'|'end'} [justify='start'] - Logical text alignment.
 * @param {boolean} [hasCapsize=false] - Optical alignment via text-box-trim.
 * @param {boolean} [hasStrikethrough=false] - Strikethrough decoration.
 * @param {boolean} [hasTabularNumbers=false] - Tabular numbers for aligned digits.
 * @param {string} [class] - Extra classes merged onto the root element.
 * Remaining props (id, for, aria-*, ref, ...) are spread onto the element.
 */
export function Text(props) {
  const merged = mergeProps(
    {
      type: 'body',
      display: 'inline',
      as: 'span',
      maxLines: 0,
      hasTruncateTooltip: true,
      justify: 'start',
      hasCapsize: false,
      hasStrikethrough: false,
      hasTabularNumbers: false,
    },
    props,
  );
  const [local, rest] = splitProps(merged, [
    'type',
    'size',
    'color',
    'weight',
    'display',
    'as',
    'maxLines',
    'hasTruncateTooltip',
    'wordBreak',
    'textWrap',
    'justify',
    'hasCapsize',
    'hasStrikethrough',
    'hasTabularNumbers',
    'children',
    'class',
    'style',
    'ref',
  ]);

  // Custom (theme-defined) types fall back to 'body' for baseline weight,
  // mirroring the Astryx resolveStyleType behavior.
  const styleType = () => (BUILTIN_TYPES.includes(local.type) ? local.type : 'body');
  // Default color: supporting → secondary, everything else → primary.
  const resolvedColor = () =>
    local.color ?? (local.type === 'supporting' ? 'secondary' : 'primary');
  const resolvedDisplay = () =>
    local.maxLines > 0 || local.hasCapsize ? 'block' : local.display;
  const resolvedWordBreak = () =>
    local.wordBreak ?? (local.maxLines === 1 ? 'break-all' : 'break-word');

  // --- Truncation detection (mirrors Astryx useTruncation, adapted to Solid) ---
  const [isTruncated, setTruncated] = createSignal(false);
  const [fullText, setFullText] = createSignal('');
  let el;
  const checkTruncation = () => {
    if (!el || !(local.maxLines > 0)) {
      setTruncated(false);
      setFullText('');
      return;
    }
    setFullText(el.textContent ?? '');
    if (local.maxLines === 1) {
      // Single-line: horizontal overflow
      setTruncated(el.scrollWidth > el.offsetWidth);
    } else {
      // Multi-line: Range measures real content height even when line-clamped
      let contentHeight = el.scrollHeight;
      try {
        const range = document.createRange();
        range.selectNodeContents(el);
        contentHeight = range.getBoundingClientRect().height;
        range.detach();
      } catch {
        // Fallback to scrollHeight (e.g. jsdom in tests)
      }
      setTruncated(contentHeight > el.offsetHeight);
    }
  };
  createEffect(() => {
    checkTruncation();
    if (el && local.maxLines > 0 && typeof ResizeObserver !== 'undefined') {
      const observer = new ResizeObserver(checkTruncation);
      observer.observe(el);
      onCleanup(() => observer.disconnect());
    }
  });
  const tooltipEnabled = () =>
    local.maxLines > 0 && local.hasTruncateTooltip !== false && isTruncated();

  const classValue = () =>
    cx(
      // Stable theme hooks: base class + type/color variant classes
      // (styled by .astryx-text.<type> / .astryx-text.<color> in the theme CSS)
      'astryx-text',
      local.type,
      resolvedColor(),
      resolvedColor() === 'inherit' && 'text-inherit',
      local.maxLines === 1
        ? TRUNCATE_SINGLE_CLASSES
        : local.maxLines > 1
          ? TRUNCATE_MULTI_CLASSES
          : DISPLAY_CLASSES[resolvedDisplay()],
      local.maxLines > 0 && WORD_BREAK_CLASSES[resolvedWordBreak()],
      local.textWrap && TEXT_WRAP_CLASSES[local.textWrap],
      local.justify !== 'start' && JUSTIFY_CLASSES[local.justify],
      local.hasCapsize && CAPSIZE_CLASSES,
      local.hasStrikethrough && 'line-through',
      local.hasTabularNumbers && 'tabular-nums',
      local.class,
    );

  // Weight (not covered by theme classes), optional size override, and the
  // dynamic line-clamp count — all token-backed. User style sits between our
  // defaults and the clamp, matching the Astryx merge order.
  const styleValue = () => {
    const own = {
      'font-weight': local.weight
        ? `var(--font-weight-${local.weight})`
        : `var(--text-${styleType()}-weight)`,
    };
    if (local.size && SIZE_TOKEN[local.size]) {
      own['font-size'] = `var(--font-size-${SIZE_TOKEN[local.size]})`;
    }
    const clamp =
      local.maxLines > 1 ? { '-webkit-line-clamp': String(local.maxLines) } : null;
    if (typeof local.style === 'string') {
      const ownText = Object.entries(own)
        .map(([k, v]) => `${k}:${v}`)
        .join(';');
      return [ownText, local.style, clamp && `-webkit-line-clamp:${local.maxLines}`]
        .filter(Boolean)
        .join(';');
    }
    return { ...own, ...local.style, ...clamp };
  };

  return (
    <Dynamic
      component={local.as}
      {...rest}
      ref={(node) => {
        el = node;
        if (typeof local.ref === 'function') local.ref(node);
      }}
      class={classValue()}
      style={styleValue()}
      data-type={local.type}
      data-color={resolvedColor()}
      title={tooltipEnabled() ? fullText() : undefined}
    >
      {local.children}
    </Dynamic>
  );
}
