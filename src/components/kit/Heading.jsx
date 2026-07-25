// Kit Heading — SolidJS re-implementation of Astryx Heading.
// Spec: `npx astryx component Heading` (levels, display types, truncation, a11y).
// React source studied via `npx astryx swizzle Heading` (scratch/swizzle-heading).
//
// Level styling (font-family / size / weight / leading — brand typography is
// Major Mono Display via --font-family-heading) comes from the theme's
// `.astryx-heading.level-<n>` classes (src/theme/sequent.css); colors come
// from `.astryx-heading.<color>`. Display-scale `type` variants override the
// level styling with --text-display-* tokens.
import { createEffect, createSignal, mergeProps, onCleanup, splitProps } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cx } from './cx';

const LEVELS = [1, 2, 3, 4, 5, 6];
const DISPLAY_TYPES = ['display-1', 'display-2', 'display-3'];

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
 * Semantic heading component. Renders the correct h1–h6 element with themed
 * styling from the heading type scale (brand font: Major Mono Display).
 *
 * Props (per the Astryx Heading spec, adapted to Solid):
 * @param {1|2|3|4|5|6} level - Heading level (required). Determines the HTML
 *   element (h1–h6) and the visual styling from the theme (unless `type` is set).
 * @param {import('solid-js').JSX.Element} children - Heading content (required).
 * @param {'display-1'|'display-2'|'display-3'} [type] - Display-scale variant
 *   (font-display support): overrides the level's visual styling with the
 *   larger/lighter --text-display-* tokens in the brand heading font, while
 *   `level` still determines the element for accessibility.
 * @param {1|2|3|4|5|6} [accessibilityLevel] - When set and different from
 *   `level`, applies aria-level so the document outline differs from the
 *   visual style.
 * @param {'primary'|'secondary'|'disabled'|'placeholder'|'accent'|'inherit'} [color='primary']
 *   Text color.
 * @param {'inline'|'block'} [display='block'] - Display type; silently forced
 *   to 'block' when `maxLines` > 0 or `hasCapsize`.
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
 * @param {string} [class] - Extra classes merged onto the root element.
 * Remaining props (id, aria-*, ref, ...) are spread onto the heading element.
 */
export function Heading(props) {
  const merged = mergeProps(
    {
      color: 'primary',
      display: 'block',
      maxLines: 0,
      hasTruncateTooltip: true,
      justify: 'start',
      hasCapsize: false,
      hasStrikethrough: false,
    },
    props,
  );
  const [local, rest] = splitProps(merged, [
    'level',
    'type',
    'accessibilityLevel',
    'color',
    'display',
    'maxLines',
    'hasTruncateTooltip',
    'wordBreak',
    'textWrap',
    'justify',
    'hasCapsize',
    'hasStrikethrough',
    'children',
    'class',
    'style',
    'ref',
  ]);

  // `level` is required; recover to h2 in dev rather than crashing.
  const resolvedLevel = () => {
    const level = Number(local.level);
    if (LEVELS.includes(level)) return level;
    console.error(
      `Heading: \`level\` prop is required and must be 1-6 (received ${String(local.level)}). Falling back to 2.`,
    );
    return 2;
  };
  const tag = () => `h${resolvedLevel()}`;
  const displayType = () => (DISPLAY_TYPES.includes(local.type) ? local.type : undefined);
  const resolvedDisplay = () =>
    local.maxLines > 0 || local.hasCapsize ? 'block' : local.display;
  const resolvedWordBreak = () =>
    local.wordBreak ?? (local.maxLines === 1 ? 'break-all' : 'break-word');
  // aria-level only when the outline level differs from the visual level
  const ariaLevel = () => {
    const a11yLevel = Number(local.accessibilityLevel);
    return LEVELS.includes(a11yLevel) && a11yLevel !== resolvedLevel()
      ? a11yLevel
      : undefined;
  };

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
      // Stable theme hooks: base class + level/type/color variant classes
      // (styled by .astryx-heading.level-<n> / .astryx-heading.<color>)
      'astryx-heading',
      `level-${resolvedLevel()}`,
      displayType(),
      local.color,
      local.color === 'inherit' && 'text-inherit',
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
      local.class,
    );

  // Display-type overrides (the theme only styles .astryx-heading.level-*, so
  // the display scale is applied inline from --text-display-* tokens) plus the
  // dynamic line-clamp count. User style sits between our overrides and the
  // clamp, matching the Astryx merge order.
  const styleValue = () => {
    const own = {};
    const type = displayType();
    if (type) {
      own['font-family'] = 'var(--font-family-heading)';
      own['font-size'] = `var(--text-${type}-size)`;
      own['font-weight'] = `var(--text-${type}-weight)`;
      own['line-height'] = `var(--text-${type}-leading)`;
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
      component={tag()}
      {...rest}
      ref={(node) => {
        el = node;
        if (typeof local.ref === 'function') local.ref(node);
      }}
      class={classValue()}
      style={styleValue()}
      data-level={String(resolvedLevel())}
      data-color={local.color}
      data-type={displayType()}
      aria-level={ariaLevel()}
      title={tooltipEnabled() ? fullText() : undefined}
    >
      {local.children}
    </Dynamic>
  );
}
