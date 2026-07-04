// Kit Banner — SolidJS re-implementation of Astryx Banner.
// Spec: `npx astryx component Banner`; swizzled React source studied in
// scratch/swizzle-banner (two-part structure: colored status header + optional
// collapsible card content area; role=alert for error/warning, role=status for
// info/success; self-managed dismissed state; card/section containers).
// All styling values are Astryx tokens via the Tailwind bridge or var(--*).
import { createSignal, splitProps, mergeProps, Show } from 'solid-js';
import { cx } from './cx';
import { IconButton } from './IconButton';

// Header background per status — muted status tokens (info uses accent-muted,
// matching the Astryx source).
const STATUS_BG_CLASSES = {
  info: 'bg-accent-muted',
  warning: 'bg-warning-muted',
  error: 'bg-error-muted',
  success: 'bg-success-muted',
};

// Default icon color per status (Astryx: accent / warning / error / success).
const STATUS_ICON_CLASSES = {
  info: 'text-[var(--color-icon-accent)]',
  warning: 'text-warning',
  error: 'text-error',
  success: 'text-success',
};

// Error/warning interrupt (assertive alert); info/success are polite statuses.
const STATUS_ROLES = {
  info: 'status',
  warning: 'alert',
  error: 'alert',
  success: 'status',
};

/** Inline status glyphs (20px, currentColor) so the kit stays dependency-free. */
const STATUS_ICON_PATHS = {
  info: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 3.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM11 14h-2V9h2v5Z',
  success: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm4.03 5.78-4.75 4.75a.75.75 0 0 1-1.06 0l-2.25-2.25 1.06-1.06 1.72 1.72 4.22-4.22 1.06 1.06Z',
  warning: 'M10.87 2.5a1 1 0 0 0-1.74 0l-7.5 13A1 1 0 0 0 2.5 17h15a1 1 0 0 0 .87-1.5l-7.5-13ZM9 7h2v5H9V7Zm1 6.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z',
  error: 'M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16ZM9 6h2v5H9V6Zm1 6.5a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z',
};

const StatusGlyph = (props) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path d={STATUS_ICON_PATHS[props.status]} />
  </svg>
);

const CloseGlyph = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M4 4l8 8M12 4l-8 8"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
    />
  </svg>
);

const ChevronGlyph = (props) => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
    class={cx(
      'transition-transform duration-[var(--duration-fast)] ease-out motion-reduce:transition-none',
      props.expanded && 'rotate-180',
    )}
  >
    <path
      d="M4 6l4 4 4-4"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
);

/**
 * Banner shows a persistent message at the top of a page or section: form
 * errors, maintenance notices, success confirmations. For short-lived
 * messages that disappear on their own, use Toast instead.
 *
 * Renders `role="alert"` for error/warning and `role="status"` for
 * info/success. Manages its own dismissed state — it hides on dismiss even
 * when `onDismiss` is not provided.
 *
 * Props (per the Astryx Banner spec, adapted to Solid):
 * @param {'info'|'warning'|'error'|'success'} status - Status controlling
 *   icon, color, and ARIA role (required).
 * @param {import('solid-js').JSX.Element} title - Main message in the header (required).
 * @param {import('solid-js').JSX.Element} [description] - Detail below the title.
 * @param {import('solid-js').JSX.Element} [icon] - Override the default status icon.
 * @param {boolean} [isDismissable=false] - Shows a dismiss button; the banner
 *   hides itself when clicked.
 * @param {() => void} [onDismiss] - Called when the dismiss button is clicked.
 * @param {import('solid-js').JSX.Element} [endContent] - Action content in the
 *   header, end-aligned (typically a button or link).
 * @param {'card'|'section'} [container='card'] - 'card' has border-radius for
 *   in-page use; 'section' is full-width/flush for page-level messages.
 * @param {boolean} [defaultIsExpanded=false] - Whether the collapsible content
 *   area (children) starts expanded.
 * @param {import('solid-js').JSX.Element} [children] - Extra content in a
 *   collapsible card-background area below the header; adds an expand toggle.
 * @param {string} [class] - Extra classes merged onto the root element.
 * Remaining props (data-*, aria-*, ref, ...) are spread onto the root <div>.
 */
export function Banner(props) {
  const merged = mergeProps(
    { isDismissable: false, container: 'card', defaultIsExpanded: false },
    props,
  );
  const [local, rest] = splitProps(merged, [
    'status',
    'title',
    'description',
    'icon',
    'isDismissable',
    'onDismiss',
    'endContent',
    'container',
    'defaultIsExpanded',
    'children',
    'class',
  ]);

  const [isDismissed, setIsDismissed] = createSignal(false);
  // defaultIsExpanded is read once as the initial value (uncontrolled, per spec).
  const [isExpanded, setIsExpanded] = createSignal(local.defaultIsExpanded);

  const status = () => (STATUS_ROLES[local.status] ? local.status : 'info');
  const isCard = () => local.container !== 'section';
  const hasChildren = () => local.children != null;
  const showContent = () => hasChildren() && isExpanded();
  const showEndArea = () => local.endContent != null || local.isDismissable || hasChildren();
  // Center the row vertically when there is a single text line plus actions.
  const isSingleLine = () =>
    local.description == null && (local.endContent != null || local.isDismissable);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof local.onDismiss === 'function') local.onDismiss();
  };

  return (
    <Show when={!isDismissed()}>
      <div
        {...rest}
        role={STATUS_ROLES[status()]}
        data-status={status()}
        data-container={local.container}
        class={cx('astryx-banner flex flex-col font-sans', local.class)}
      >
        {/* Header: colored status background with icon, text, and actions */}
        <div
          class={cx(
            'flex gap-2 px-4 py-3',
            isSingleLine() ? 'items-center' : 'items-start',
            STATUS_BG_CLASSES[status()],
            // Card container radius: all corners standalone, top-only when the
            // content area is visible below. Section stays flush (no radius).
            isCard() && (showContent() ? 'rounded-t-lg' : 'rounded-lg'),
          )}
        >
          <span
            class={cx('flex shrink-0 items-center', STATUS_ICON_CLASSES[status()])}
            aria-hidden="true"
          >
            <Show when={local.icon != null} fallback={<StatusGlyph status={status()} />}>
              {local.icon}
            </Show>
          </span>
          <div class="flex min-w-0 flex-1 flex-col">
            <div class="m-0 font-semibold text-primary text-[length:var(--text-label-size)] leading-[var(--text-label-leading)]">
              {local.title}
            </div>
            <Show when={local.description != null}>
              <div class="m-0 font-normal text-secondary text-[length:var(--text-supporting-size)] leading-[var(--text-supporting-leading)]">
                {local.description}
              </div>
            </Show>
          </div>
          <Show when={showEndArea()}>
            <div class="-my-1 ms-auto flex shrink-0 items-center gap-2">
              {local.endContent}
              <Show when={hasChildren()}>
                <IconButton
                  size="sm"
                  variant="ghost"
                  label={isExpanded() ? 'Collapse' : 'Expand'}
                  icon={<ChevronGlyph expanded={isExpanded()} />}
                  aria-expanded={isExpanded() ? 'true' : 'false'}
                  onClick={() => setIsExpanded((prev) => !prev)}
                />
              </Show>
              <Show when={local.isDismissable}>
                <IconButton
                  size="sm"
                  variant="ghost"
                  label="Dismiss"
                  icon={<CloseGlyph />}
                  onClick={handleDismiss}
                />
              </Show>
            </div>
          </Show>
        </div>
        {/* Content: collapsible card-background area below the header */}
        <Show when={showContent()}>
          <div
            class={cx(
              'border-x border-b border-border bg-card px-4 py-3',
              isCard() && 'rounded-b-lg',
            )}
          >
            {local.children}
          </div>
        </Show>
      </div>
    </Show>
  );
}
