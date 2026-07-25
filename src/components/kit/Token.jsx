// Kit Token — SolidJS re-implementation of Astryx Token.
// Spec: `npx astryx component Token` (label chip; 11 color variants; sm/md/lg;
// optional icon/endContent/remove button; renders <a> for href, or a <span>
// container with an invisible <button> for onClick, per the Astryx source).
// All styling values are Astryx tokens via the Tailwind bridge
// (@astryxdesign/core/src/tailwind-theme.css) or var(--*) custom properties.
import { splitProps, mergeProps, Show } from 'solid-js';
import { cx } from './cx';

const BASE_CLASSES = cx(
  'astryx-token inline-flex items-center gap-1 px-2 border-0',
  // rounded-sm → --radius-inner via the bridge
  'rounded-sm font-medium text-sm leading-[var(--text-supporting-leading)]',
  'whitespace-nowrap no-underline max-w-full overflow-hidden',
);

// Heights come from the element-size tokens minus 8px, exactly as the Astryx
// source computes them (spec-dictated geometry).
const SIZE_CLASSES = {
  sm: 'h-[calc(var(--size-element-sm)-8px)]',
  md: 'h-[calc(var(--size-element-md)-8px)]',
  lg: 'h-[calc(var(--size-element-lg)-8px)]',
};

// Hue-family variants: subtle background + vivid text from the bridge's
// *-subtle/*-vivid families. 'default' uses the neutral surface pair.
const COLOR_CLASSES = {
  default: 'bg-neutral text-primary',
  red: 'bg-red-subtle text-red-vivid',
  orange: 'bg-orange-subtle text-orange-vivid',
  yellow: 'bg-yellow-subtle text-yellow-vivid',
  green: 'bg-green-subtle text-green-vivid',
  teal: 'bg-teal-subtle text-teal-vivid',
  cyan: 'bg-cyan-subtle text-cyan-vivid',
  blue: 'bg-blue-subtle text-blue-vivid',
  purple: 'bg-purple-subtle text-purple-vivid',
  pink: 'bg-pink-subtle text-pink-vivid',
  gray: 'bg-gray-subtle text-gray-vivid',
};

// Hover/pressed overlays stacked as a background-image, mirroring Astryx.
const INTERACTIVE_CLASSES = cx(
  'cursor-pointer transition-[background-image]',
  'duration-[var(--duration-fast)] ease-out motion-reduce:transition-none',
  'hover:[background-image:linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))]',
  'active:[background-image:linear-gradient(var(--color-overlay-pressed),var(--color-overlay-pressed))]',
  'focus-visible:outline-2 focus-visible:outline-(--color-accent) focus-visible:outline-offset-2',
);

// The clickable container itself never receives focus (its invisible inner
// button does), so the ring is driven by :has(:focus-visible).
const FOCUS_HAS_CLASSES = cx(
  'has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-(--color-accent)',
  'has-[:focus-visible]:outline-offset-2',
);

const DISABLED_CLASSES = 'cursor-not-allowed opacity-50 pointer-events-none';

const LABEL_CLASSES = 'overflow-hidden text-ellipsis whitespace-nowrap min-w-0';

// Invisible button (real button semantics, zero visual footprint).
const INVISIBLE_BUTTON_CLASSES = '[all:unset] cursor-[inherit] overflow-hidden min-w-0';

// 16px hit target with a 14px invisible halo, per the Astryx source geometry.
const REMOVE_BUTTON_CLASSES = cx(
  '[all:unset] relative box-border inline-flex items-center justify-center',
  'size-4 -mr-1 rounded-full cursor-pointer',
  'after:content-[""] after:absolute after:-inset-3.5',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
);

const CloseIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path
      d="M2.5 2.5l7 7m0-7l-7 7"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
    />
  </svg>
);

/**
 * Token is a small inline chip for discrete pieces of associated data —
 * tags, categories, active filters, removable selections.
 *
 * Props (per the Astryx Token spec, adapted to Solid):
 * @param {string} label - Text label (required). Accessible name even when hidden.
 * @param {'sm'|'md'|'lg'} [size='md'] - Size variant.
 * @param {'default'|'red'|'orange'|'yellow'|'green'|'teal'|'cyan'|'blue'|'purple'|'pink'|'gray'} [color='default']
 *   Color variant mapping to the bridge's hue families (subtle bg / vivid text).
 * @param {string} [customColor] - Escape hatch for user-supplied data colors
 *   (e.g. user-defined label colors). Renders a tinted chip derived from the
 *   arbitrary color via color-mix against theme tokens; overrides `color`.
 * @param {import('solid-js').JSX.Element} [icon] - Leading icon.
 * @param {boolean} [isDisabled=false] - Reduces opacity and blocks interaction.
 * @param {(e: MouseEvent) => void} [onRemove] - Renders an X button that fires this.
 * @param {(e: MouseEvent) => void} [onClick] - Renders a <span> container with an
 *   invisible <button> inside for accessibility (Astryx pattern).
 * @param {string} [href] - Renders the token as an <a>.
 * @param {string} [description] - aria-description on the root element.
 * @param {import('solid-js').JSX.Element} [endContent] - Trailing content after the
 *   label (before the remove button).
 * @param {boolean} [isLabelHidden=false] - Visually hides the label (sr-only);
 *   it remains the accessible name.
 * @param {string} [class] - Extra classes merged onto the root element.
 * Remaining props (data-*, aria-*, ref, ...) are spread onto the root element.
 */
export function Token(props) {
  const merged = mergeProps(
    { size: 'md', color: 'default', isDisabled: false, isLabelHidden: false },
    props,
  );
  const [local, rest] = splitProps(merged, [
    'label',
    'size',
    'color',
    'customColor',
    'icon',
    'isDisabled',
    'onRemove',
    'onClick',
    'href',
    'description',
    'endContent',
    'isLabelHidden',
    'class',
    'style',
  ]);

  // customColor escape hatch: tint the chip from the arbitrary color by mixing
  // it with theme tokens, so the chip stays readable in light and dark themes.
  const styleValue = () => {
    if (!local.customColor) return local.style;
    return {
      'background-color': `color-mix(in oklab, ${local.customColor} 20%, var(--color-background-surface))`,
      color: `color-mix(in oklab, ${local.customColor} 65%, var(--color-text-primary))`,
      ...(typeof local.style === 'object' && local.style != null ? local.style : {}),
    };
  };

  const rootClass = (interactive) =>
    cx(
      BASE_CLASSES,
      SIZE_CLASSES[local.size],
      !local.customColor && COLOR_CLASSES[local.color],
      interactive && INTERACTIVE_CLASSES,
      local.isDisabled && DISABLED_CLASSES,
      local.class,
    );

  const sharedAttrs = () => ({
    'data-color': local.customColor ? 'custom' : local.color,
    'data-size': local.size,
    'aria-label': local.isLabelHidden ? local.label : undefined,
    'aria-description': local.description,
    style: styleValue(),
  });

  const LabelSpan = () => (
    <span class={cx(LABEL_CLASSES, local.isLabelHidden && 'sr-only')}>{local.label}</span>
  );

  const RemoveButton = () => (
    <Show when={local.onRemove}>
      <button
        type="button"
        aria-label={`Remove ${local.label}`}
        disabled={local.isDisabled || undefined}
        class={REMOVE_BUTTON_CLASSES}
        onClick={(e) => {
          e.stopPropagation();
          local.onRemove(e);
        }}
      >
        <CloseIcon />
      </button>
    </Show>
  );

  // Container click: ignore clicks that originate inside the inner button or a
  // link so the action doesn't fire twice (mirrors the Astryx source).
  const handleContainerClick = (e) => {
    if (local.isDisabled) return;
    if (e.target.closest('button, a')) return;
    local.onClick?.(e);
  };

  return (
    <Show
      when={local.href != null}
      fallback={
        <Show
          when={local.onClick != null}
          fallback={
            <span {...rest} {...sharedAttrs()} class={rootClass(false)}>
              {local.icon}
              <LabelSpan />
              {local.endContent}
              <RemoveButton />
            </span>
          }
        >
          <span
            {...rest}
            {...sharedAttrs()}
            class={cx(rootClass(true), FOCUS_HAS_CLASSES)}
            onClick={handleContainerClick}
          >
            {local.icon}
            <button
              type="button"
              disabled={local.isDisabled || undefined}
              class={INVISIBLE_BUTTON_CLASSES}
              onClick={(e) => local.onClick(e)}
            >
              <LabelSpan />
            </button>
            {local.endContent}
            <RemoveButton />
          </span>
        </Show>
      }
    >
      <a
        {...rest}
        {...sharedAttrs()}
        href={local.href}
        aria-disabled={local.isDisabled || undefined}
        class={rootClass(true)}
      >
        {local.icon}
        <LabelSpan />
        {local.endContent}
        <RemoveButton />
      </a>
    </Show>
  );
}
