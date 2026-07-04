// Kit Toast — SolidJS re-implementation of Astryx Toast (+ ToastRegion stack wrapper).
// Spec: `npx astryx component Toast`; swizzled React source studied in
// scratch/swizzle-toast (geometry, timer pause behavior, a11y roles).
// Extended beyond the Astryx info/error pair with success/warning variants so
// the app's toastStore contract ({ id, message, type }, default type 'success')
// can adopt it directly in Phase 4.
// All styling values are Astryx tokens via the Tailwind bridge or var(--*).
import { splitProps, mergeProps, Show, onMount, onCleanup } from 'solid-js';
import { cx } from './cx';
import { IconButton } from './IconButton';

// Status color per variant — status tokens from the theme. The theme ships no
// dedicated "info" status token, so info uses the token-backed blue scale
// (conventional informational color), never a raw palette value.
const STATUS_TEXT_CLASSES = {
  info: 'text-blue-vivid',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
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
    <path d={STATUS_ICON_PATHS[props.type]} />
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

/**
 * Toast shows a brief, non-blocking notification confirming an action or
 * presenting temporary information. Presentational: it renders one toast
 * element; stacking/positioning is the job of ToastRegion (or a provider).
 *
 * Props (per the Astryx Toast spec, adapted to Solid):
 * @param {import('solid-js').JSX.Element} body - Primary message content (required).
 * @param {string} [message] - Alias for `body` matching the app toastStore
 *   contract ({ id, message, type }); ignored when `body` is set.
 * @param {'info'|'success'|'warning'|'error'} [type='info'] - Status variant.
 *   Astryx ships info/error; success/warning are added for the store contract.
 *   Unknown values fall back to info. Error toasts render role="alert"
 *   (assertive) and persist until dismissed by default.
 * @param {boolean} [isAutoHide] - Whether the toast auto-dismisses. Defaults to
 *   true for every type except error (per spec).
 * @param {number} [autoHideDuration=5000] - Milliseconds before auto-dismiss.
 *   Read once on mount. The timer pauses while hovered or focused (per spec).
 * @param {import('solid-js').JSX.Element} [endContent] - Trailing action slot
 *   (e.g. an Undo button or link) rendered before the dismiss button.
 * @param {(reason: 'auto'|'manual') => void} [onDismiss] - Fired when the toast
 *   should be removed: 'auto' from the auto-hide timer, 'manual' from the
 *   dismiss button. The host owns removal — the toast never unmounts itself.
 * @param {string} [class] - Extra classes merged onto the root.
 * Remaining props are spread onto the root element.
 */
export function Toast(props) {
  const merged = mergeProps({ type: 'info', autoHideDuration: 5000 }, props);
  const [local, rest] = splitProps(merged, [
    'body',
    'message',
    'type',
    'isAutoHide',
    'autoHideDuration',
    'endContent',
    'onDismiss',
    'class',
  ]);

  // Unknown store types degrade to the info variant rather than unstyled.
  const type = () => (STATUS_TEXT_CLASSES[local.type] ? local.type : 'info');
  const isError = () => type() === 'error';
  // Spec: auto-hide defaults on for info (and the added success/warning);
  // error persists until dismissed so the user won't miss it.
  const isAutoHide = () => local.isAutoHide ?? !isError();

  const dismiss = (reason) => {
    if (typeof local.onDismiss === 'function') local.onDismiss(reason);
  };

  // Auto-hide timer, pausable on hover/focus so the toast doesn't vanish
  // while the user is reading it or tabbing to its action (per Astryx source).
  let timer = null;
  let startedAt = 0;
  let remaining = 0;
  let isPaused = false;

  const startTimer = () => {
    if (!isAutoHide()) return;
    if (timer) clearTimeout(timer);
    startedAt = Date.now();
    timer = setTimeout(() => dismiss('auto'), remaining);
  };
  const pauseTimer = () => {
    if (!isAutoHide() || isPaused) return;
    isPaused = true;
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    // Always leave at least a beat after interaction ends (per Astryx source).
    remaining = Math.max(remaining - (Date.now() - startedAt), 1000);
  };
  const resumeTimer = () => {
    if (!isAutoHide() || !isPaused) return;
    isPaused = false;
    startTimer();
  };

  onMount(() => {
    remaining = local.autoHideDuration;
    startTimer();
  });
  onCleanup(() => {
    if (timer) clearTimeout(timer);
  });

  return (
    <div
      {...rest}
      class={cx(
        // Geometry per the Astryx spec: 400px wide, viewport-capped (32px =
        // --spacing-8 gutter), spacing-4 padding, container radius, med shadow.
        'astryx-toast pointer-events-auto w-[400px] max-w-[min(100%,calc(100vw-var(--spacing-8)))]',
        'p-4 rounded-lg shadow-md bg-popover text-primary border border-border',
        'font-sans text-base leading-[var(--text-body-leading)]',
        // Enter transition: fade/rise from 8px, disabled for reduced motion.
        'transition-[opacity,transform] duration-[var(--duration-fast)] ease-out',
        'starting:opacity-0 starting:translate-y-2 motion-reduce:transition-none',
        local.class,
      )}
      data-type={type()}
      role={isError() ? 'alert' : 'status'}
      aria-live={isError() ? 'assertive' : 'polite'}
      aria-atomic="true"
      onMouseEnter={pauseTimer}
      onMouseLeave={resumeTimer}
      onFocusIn={pauseTimer}
      onFocusOut={resumeTimer}
    >
      <div class="flex w-full items-start gap-3">
        <span
          class={cx(
            'inline-flex size-5 shrink-0 items-center justify-center',
            STATUS_TEXT_CLASSES[type()],
          )}
          aria-hidden="true"
        >
          <StatusGlyph type={type()} />
        </span>
        <div class="min-w-0 flex-1">{local.body ?? local.message}</div>
        <div class="-my-1 -me-1 flex shrink-0 items-center gap-2">
          <Show when={local.endContent}>{local.endContent}</Show>
          <IconButton
            size="sm"
            variant="ghost"
            label="Dismiss notification"
            icon={<CloseGlyph />}
            onClick={() => dismiss('manual')}
          />
        </div>
      </div>
    </div>
  );
}

const REGION_POSITION_CLASSES = {
  bottomEnd: 'bottom-0 end-0 flex-col items-end',
  bottomStart: 'bottom-0 start-0 flex-col items-start',
  topEnd: 'top-0 end-0 flex-col-reverse items-end',
  topStart: 'top-0 start-0 flex-col-reverse items-start',
};

/**
 * ToastRegion — fixed, labeled live-region stack that hosts Toast children.
 * Place once near the app root; render toasts into it (e.g. from a provider
 * iterating the toastStore).
 *
 * @param {'bottomEnd'|'bottomStart'|'topEnd'|'topStart'} [position='bottomEnd'] -
 *   Viewport corner the stack anchors to (top positions stack newest-downward).
 * @param {string} [label='Notifications'] - Accessible name of the region.
 * @param {import('solid-js').JSX.Element} [children] - Toast elements.
 * @param {string} [class] - Extra classes merged onto the region.
 * Remaining props are spread onto the region element.
 */
export function ToastRegion(props) {
  const merged = mergeProps({ position: 'bottomEnd', label: 'Notifications' }, props);
  const [local, rest] = splitProps(merged, ['position', 'label', 'children', 'class']);
  return (
    <div
      {...rest}
      role="region"
      aria-label={local.label}
      aria-live="polite"
      tabindex="-1"
      class={cx(
        // Fixed stack: spacing-4 inset, spacing-3 gap between toasts. The
        // region itself ignores pointer events; each Toast re-enables them.
        // z via token with the Astryx viewport z-index (500) as fallback.
        'astryx-toast-region pointer-events-none fixed z-[var(--z-toast,500)] flex gap-3 p-4',
        REGION_POSITION_CLASSES[local.position] ?? REGION_POSITION_CLASSES.bottomEnd,
        local.class,
      )}
      data-position={local.position}
    >
      {local.children}
    </div>
  );
}
