// Kit Button — SolidJS re-implementation of Astryx Button.
// Spec: `npx astryx component Button` (variants, sizes, loading, icon slots).
// All styling values are Astryx tokens via the Tailwind bridge
// (@astryxdesign/core/src/tailwind-theme.css) or var(--*) custom properties.
import { createSignal, splitProps, mergeProps, Show, children as resolveChildren } from 'solid-js';
import { cx } from './cx';

const BASE_CLASSES = cx(
  'astryx-button relative inline-flex items-center justify-center',
  // gap/padding: --spacing-2 / --spacing-3 via the bridge (--spacing = --spacing-1)
  'gap-2 py-2 px-3 border-0',
  // rounded-md → --radius-element
  'rounded-md font-medium text-base leading-[var(--text-label-leading)] whitespace-nowrap',
  'cursor-pointer',
  'transition-[background-image,background-color,color,opacity,transform]',
  'duration-[var(--duration-fast)] ease-out motion-reduce:transition-none',
  // Press feedback (spec: --button-press-scale, default scale(0.98))
  'active:[transform:var(--button-press-scale,scale(0.98))]',
  // Focus ring: 2px outline offset by --button-focus-offset (spec default 3px)
  'focus-visible:outline-2 focus-visible:outline-offset-[var(--button-focus-offset,3px)]',
  // Disabled: --button-disabled-opacity default 0.5, no hover/press feedback
  'disabled:cursor-not-allowed disabled:opacity-50',
  'disabled:[background-image:none] disabled:active:[transform:none]',
);

// Hover/pressed overlays are stacked on the variant color as a background-image,
// mirroring the Astryx source (linear-gradient of --color-overlay-*).
const OVERLAY_CLASSES = cx(
  'hover:[background-image:linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))]',
  'active:[background-image:linear-gradient(var(--color-overlay-pressed),var(--color-overlay-pressed))]',
);

const VARIANT_CLASSES = {
  primary: cx('bg-accent-bg text-on-accent', OVERLAY_CLASSES, 'focus-visible:outline-(--color-accent)'),
  secondary: cx('bg-neutral text-primary', OVERLAY_CLASSES, 'focus-visible:outline-(--color-accent)'),
  ghost: cx('bg-transparent text-primary', OVERLAY_CLASSES, 'focus-visible:outline-(--color-accent)'),
  destructive: cx('bg-error text-on-error', OVERLAY_CLASSES, 'focus-visible:outline-(--color-error)'),
};

const SIZE_CLASSES = {
  sm: 'h-(--size-element-sm)',
  md: 'h-(--size-element-md)',
  lg: 'h-(--size-element-lg)',
};

// Icon geometry per size is fixed by the Astryx spec: sm/md = 16px, lg = 20px.
// size-4/size-5 resolve through the bridge's --spacing (4px base) → 16px/20px.
const ICON_SIZE_CLASSES = {
  sm: 'size-4 text-[16px]',
  md: 'size-4 text-[16px]',
  lg: 'size-5 text-[20px]',
};

const ICON_ONLY_CLASSES = 'aspect-[var(--button-icon-only-aspect,1/1)] p-0';

/** Minimal inline spinner (the kit Spinner slice is separate); inherits the variant foreground. */
const InlineSpinner = () => (
  <svg
    class="animate-spin motion-reduce:animate-none"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" />
    <path
      d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5"
      stroke="currentColor"
      stroke-width="2"
      stroke-linecap="round"
    />
  </svg>
);

/**
 * Button triggers an action when clicked.
 *
 * Props (per the Astryx Button spec, adapted to Solid):
 * @param {string} label - Accessible label (required). Rendered as visible text
 *   by default; used as aria-label when `isIconOnly` is true.
 * @param {'primary'|'secondary'|'ghost'|'destructive'} [variant='secondary'] - Visual style variant.
 * @param {'sm'|'md'|'lg'} [size='md'] - Size variant.
 * @param {'button'|'submit'|'reset'} [type='button'] - HTML button type attribute.
 * @param {boolean} [isDisabled=false] - Disables the button.
 * @param {boolean} [isLoading=false] - Shows a spinner, sets aria-busy, disables
 *   interaction, and announces "Loading" via a polite live region.
 * @param {boolean} [isInterruptible=false] - Keep the button clickable while a
 *   `clickAction` is pending: spinner and aria-busy still show, but the button is
 *   not disabled and the action is not deduped, so a re-click interrupts.
 * @param {import('solid-js').JSX.Element} [icon] - Icon element rendered before the label text.
 * @param {boolean} [isIconOnly=false] - Square icon-only rendering; `label` becomes
 *   the aria-label. Requires `icon`. Prefer the dedicated IconButton component.
 * @param {import('solid-js').JSX.Element} [children] - Optional override for the
 *   visible text; `label` still provides the accessible name.
 * @param {import('solid-js').JSX.Element} [endContent] - Trailing icon/badge after
 *   the label; ignored when `isIconOnly` is true.
 * @param {(e: MouseEvent) => void} [onClick] - Standard click handler.
 * @param {(e: MouseEvent) => void|Promise<void>} [clickAction] - Async click handler;
 *   shows the loading state while the returned promise is pending (deduped unless
 *   `isInterruptible`).
 * @param {string} [class] - Extra classes merged onto the root button.
 * Remaining props (name, value, form, ref, aria-*, ...) are spread onto the <button>.
 */
export function Button(props) {
  const merged = mergeProps(
    {
      variant: 'secondary',
      size: 'md',
      type: 'button',
      isDisabled: false,
      isLoading: false,
      isInterruptible: false,
      isIconOnly: false,
    },
    props,
  );
  const [local, rest] = splitProps(merged, [
    'label',
    'variant',
    'size',
    'type',
    'isDisabled',
    'isLoading',
    'isInterruptible',
    'isIconOnly',
    'icon',
    'endContent',
    'children',
    'onClick',
    'clickAction',
    'class',
  ]);

  // Loading state driven by a pending clickAction (in addition to the isLoading prop).
  const [isPending, setPending] = createSignal(false);
  // Monotonic id so an interrupted (stale) action settling doesn't clear the
  // loading state of the newer in-flight action.
  let actionId = 0;
  let actionInFlight = false;

  const isLoadingState = () => local.isLoading || isPending();
  const isDisabledState = () =>
    local.isDisabled || (isLoadingState() && !local.isInterruptible);

  const resolved = resolveChildren(() => local.children);

  // aria-label is set when: icon-only (label is the only accessible name),
  // loading on a non-icon-only button (visible text is hidden), or children
  // override the visible text (label stays the accessible name).
  const needsAriaLabel = () => {
    if (local.isIconOnly) return local.label !== '';
    if (isLoadingState()) return true;
    const kids = resolved();
    return kids != null && kids !== local.label;
  };

  const handleClick = (e) => {
    // Dedupe fire-once actions; interruptible callers opt out so a re-click
    // lands and interrupts the in-flight action with a fresh one.
    if (isDisabledState() || (actionInFlight && !local.isInterruptible)) {
      e.preventDefault();
      return;
    }
    if (typeof local.onClick === 'function') local.onClick(e);
    if (local.clickAction && !e.defaultPrevented) {
      const id = ++actionId;
      actionInFlight = true;
      setPending(true);
      Promise.resolve()
        .then(() => local.clickAction(e))
        .finally(() => {
          if (id === actionId) {
            actionInFlight = false;
            setPending(false);
          }
        });
    }
  };

  return (
    <button
      {...rest}
      type={local.type}
      class={cx(
        BASE_CLASSES,
        SIZE_CLASSES[local.size],
        VARIANT_CLASSES[local.variant],
        local.isIconOnly && ICON_ONLY_CLASSES,
        local.class,
      )}
      data-variant={local.variant}
      data-size={local.size}
      disabled={isDisabledState() || undefined}
      aria-busy={isLoadingState() || undefined}
      aria-label={needsAriaLabel() ? local.label : undefined}
      onClick={handleClick}
    >
      <Show when={isLoadingState()}>
        <span class="absolute inset-0 grid place-items-center" aria-hidden="true">
          <InlineSpinner />
        </span>
      </Show>
      <span
        class={cx('contents', isLoadingState() && 'text-transparent')}
        aria-hidden={isLoadingState() || undefined}
      >
        <Show when={local.icon}>
          <span
            class={cx(
              'inline-flex items-center justify-center shrink-0',
              ICON_SIZE_CLASSES[local.size],
            )}
          >
            {local.icon}
          </span>
        </Show>
        <Show when={!local.isIconOnly}>
          <span class="overflow-hidden text-ellipsis min-w-0">
            {resolved() ?? local.label}
          </span>
        </Show>
        <Show when={!local.isIconOnly && local.endContent}>
          <span class="inline-flex items-center text-[inherit]">{local.endContent}</span>
        </Show>
      </span>
      {/* Live region for loading state announcements */}
      <span class="sr-only" role="status" aria-live="polite">
        {isLoadingState() ? 'Loading' : ''}
      </span>
    </button>
  );
}
