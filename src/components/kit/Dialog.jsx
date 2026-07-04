/**
 * Dialog — SolidJS re-implementation of the Astryx Dialog component.
 *
 * Replaces src/components/ui/Modal.jsx (Phase 4). Fully CONTROLLED: no
 * uiStore coupling — visibility is driven by the `open` prop and every
 * dismiss path (backdrop click, Escape, close button, mobile swipe-down)
 * calls `onClose`.
 *
 * Adds over Modal.jsx: role="dialog" + aria-modal + aria-labelledby wired
 * to the DialogHeader title, Escape-to-close, a focus trap (focus moves to
 * the dialog on open, Tab cycles inside, focus restores to the trigger on
 * close) and an accessible close button (aria-label="Close").
 *
 * Preserves from Modal.jsx: mobile bottom-sheet swipe-to-dismiss (drag down
 * past 100px closes) and the modalPopIn/modalPopOut enter/exit keyframes
 * (styles.css) so the app feel doesn't change.
 *
 * @example
 * const [open, setOpen] = createSignal(false);
 * <Dialog open={open()} onClose={() => setOpen(false)} size="md">
 *   <DialogHeader title="Delete project" subtitle="This cannot be undone." />
 *   <DialogBody>Are you sure?</DialogBody>
 *   <DialogFooter>
 *     <button onClick={() => setOpen(false)}>Cancel</button>
 *   </DialogFooter>
 * </Dialog>
 */
import {
  Show,
  createSignal,
  createContext,
  useContext,
  createUniqueId,
  onMount,
  onCleanup,
  mergeProps,
} from 'solid-js';
import { Portal } from 'solid-js/web';
import { Transition } from 'solid-transition-group';
import { cx } from './cx';

const DialogContext = createContext(null);

// Astryx Dialog is width-driven (default 400px). Mapped to the three widths
// this app already uses (Modal compact/default/wide) so Phase 4 swaps 1:1.
const SIZE_CLASSES = {
  sm: 'sm:w-[400px]',
  md: 'sm:w-[500px]',
  lg: 'sm:w-[850px]',
};

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

// Bottom-sheet swipe-to-dismiss threshold, ported from Modal.jsx.
const SWIPE_CLOSE_THRESHOLD = 100;

/**
 * Modal dialog rendered in a Portal with backdrop, focus trap and
 * enter/exit animation.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether the dialog is open (controlled).
 * @param {() => void} props.onClose - Called on every dismiss request
 *   (backdrop click, Escape, close button, swipe-down on mobile).
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Dialog width: sm 400px,
 *   md 500px, lg 850px (full-width bottom sheet below the sm breakpoint).
 * @param {string} [props.class] - Extra classes for the dialog panel.
 * @param {import('solid-js').JSX.Element} props.children - Dialog content,
 *   typically DialogHeader + DialogBody + optional DialogFooter.
 */
export function Dialog(props) {
  const merged = mergeProps({ size: 'md' }, props);
  const labelId = createUniqueId();
  const close = () => props.onClose?.();

  // Rendered inside <Show> so onMount/onCleanup bracket each open/close.
  const Surface = () => {
    let overlayRef;
    let panelRef;
    let triggerEl = null;
    const [touchStart, setTouchStart] = createSignal(null);
    const [touchDelta, setTouchDelta] = createSignal(0);

    const trapTab = (e) => {
      if (!panelRef) return;
      const focusables = Array.from(panelRef.querySelectorAll(FOCUSABLE_SELECTOR));
      if (focusables.length === 0) {
        e.preventDefault();
        panelRef.focus();
        return;
      }
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || active === panelRef || !panelRef.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !panelRef.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    };

    const handleDocumentKeyDown = (e) => {
      // A nested layer (e.g. an open Selector/Menu inside the dialog) that
      // already consumed this key owns it — don't also dismiss the dialog.
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        close();
      } else if (e.key === 'Tab') {
        trapTab(e);
      }
    };

    onMount(() => {
      // Capture the trigger for focus restoration, then move focus in.
      triggerEl =
        document.activeElement && typeof document.activeElement.focus === 'function'
          ? document.activeElement
          : null;
      document.addEventListener('keydown', handleDocumentKeyDown);
      panelRef?.focus();
    });

    onCleanup(() => {
      document.removeEventListener('keydown', handleDocumentKeyDown);
      triggerEl?.focus();
      triggerEl = null;
    });

    // --- Mobile bottom-sheet swipe-to-dismiss, ported from Modal.jsx ---
    const handleTouchStart = (e) => {
      setTouchStart(e.touches[0].clientY);
      setTouchDelta(0);
    };
    const handleTouchMove = (e) => {
      if (touchStart() === null) return;
      const diff = e.touches[0].clientY - touchStart();
      if (diff > 0) setTouchDelta(diff);
    };
    const handleTouchEnd = () => {
      if (touchDelta() > SWIPE_CLOSE_THRESHOLD) close();
      setTouchStart(null);
      setTouchDelta(0);
    };

    return (
      <div
        ref={overlayRef}
        class="fixed inset-0 z-[var(--z-dialog,70)] flex items-end justify-center bg-overlay backdrop-blur-[2px] p-0 sm:items-center sm:p-4"
        onClick={(e) => {
          // Backdrop only — clicks inside the panel never close.
          if (e.target === overlayRef) close();
        }}
      >
        <div
          ref={panelRef}
          data-dialog-panel
          role="dialog"
          aria-modal="true"
          aria-labelledby={labelId}
          tabindex="-1"
          class={cx(
            'relative flex max-h-[75vh] w-full flex-col overflow-hidden rounded-t-lg border-t border-border bg-popover shadow-lg outline-none',
            'sm:max-w-[90vw] sm:rounded-lg sm:border',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
            SIZE_CLASSES[merged.size] || SIZE_CLASSES.md,
            props.class,
          )}
          style={{
            transform: `translateY(${touchDelta()}px)`,
            transition: touchStart() === null ? 'transform 0.3s var(--ease-spring-smooth)' : 'none',
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <DialogContext.Provider value={{ labelId, onClose: close }}>
            {props.children}
          </DialogContext.Provider>
        </div>
      </div>
    );
  };

  return (
    <Portal>
      <Transition
        onEnter={(el, done) => {
          // Keep the existing app feel: modalPopIn on the panel + overlay fade.
          const panel = el.querySelector('[data-dialog-panel]');
          if (panel) {
            panel.style.animation = 'modalPopIn 0.5s var(--ease-spring-bouncy) forwards';
          }
          const anim = el.animate([{ opacity: 0 }, { opacity: 1 }], {
            duration: 300,
            easing: 'ease-out',
            fill: 'forwards',
          });
          let panelDone = !panel;
          let overlayDone = false;
          const checkDone = () => {
            if (panelDone && overlayDone) done();
          };
          anim.onfinish = () => {
            overlayDone = true;
            checkDone();
          };
          panel?.addEventListener(
            'animationend',
            () => {
              panelDone = true;
              checkDone();
            },
            { once: true },
          );
        }}
        onExit={(el, done) => {
          const panel = el.querySelector('[data-dialog-panel]');
          if (panel) {
            panel.style.animation = 'modalPopOut 0.4s var(--ease-spring-smooth) forwards';
          }
          const anim = el.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 300,
            easing: 'ease-in',
            fill: 'forwards',
          });
          let panelDone = !panel;
          let overlayDone = false;
          const checkDone = () => {
            if (panelDone && overlayDone) done();
          };
          anim.onfinish = () => {
            overlayDone = true;
            checkDone();
          };
          panel?.addEventListener(
            'animationend',
            () => {
              panelDone = true;
              checkDone();
            },
            { once: true },
          );
        }}
      >
        <Show when={props.open}>
          <Surface />
        </Show>
      </Transition>
    </Portal>
  );
}

/**
 * Dialog header: title (labels the dialog via aria-labelledby), optional
 * subtitle, mobile drag handle, and the close button (aria-label="Close").
 *
 * @param {object} props
 * @param {string} props.title - Dialog title; becomes the dialog's
 *   accessible name.
 * @param {string} [props.subtitle] - Secondary text below the title.
 * @param {boolean} [props.hasDivider=true] - Border at the bottom edge
 *   (Astryx DialogHeader default).
 * @param {() => void} [props.onClose] - Close button override; defaults to
 *   the parent Dialog's onClose.
 * @param {string} [props.class] - Extra classes for the header.
 */
export function DialogHeader(props) {
  const ctx = useContext(DialogContext);
  const merged = mergeProps({ hasDivider: true }, props);
  const close = () => {
    if (props.onClose) props.onClose();
    else ctx?.onClose?.();
  };

  return (
    <header
      class={cx(
        'relative shrink-0 px-6 pt-5 pb-4',
        merged.hasDivider && 'border-b border-border',
        props.class,
      )}
    >
      {/* Bottom-sheet drag handle, mobile only (preserved from Modal.jsx) */}
      <div aria-hidden="true" class="mx-auto mb-3 h-1.5 w-12 rounded-full bg-primary/20 sm:hidden" />
      <div class="flex items-start justify-between gap-3">
        <div class="min-w-0 flex-1">
          <h2 id={ctx?.labelId} tabindex="-1" class="text-lg font-semibold text-primary outline-none">
            {props.title}
          </h2>
          <Show when={props.subtitle}>
            <p class="mt-1 text-sm text-secondary">{props.subtitle}</p>
          </Show>
        </div>
        <button
          type="button"
          aria-label="Close"
          onClick={close}
          class="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-primary/10 text-primary/50 transition-colors hover:bg-primary/20 hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
        >
          <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-5 w-5">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </header>
  );
}

/**
 * Scrollable main content area of the dialog.
 *
 * @param {object} props
 * @param {string} [props.class] - Extra classes for the body.
 * @param {import('solid-js').JSX.Element} props.children
 */
export function DialogBody(props) {
  return <div class={cx('min-h-0 flex-1 overflow-y-auto px-6 py-5', props.class)}>{props.children}</div>;
}

/**
 * Footer for dialog actions, aligned to the end.
 *
 * @param {object} props
 * @param {boolean} [props.hasDivider=true] - Border at the top edge.
 * @param {string} [props.class] - Extra classes for the footer.
 * @param {import('solid-js').JSX.Element} props.children
 */
export function DialogFooter(props) {
  const merged = mergeProps({ hasDivider: true }, props);
  return (
    <footer
      class={cx(
        'flex shrink-0 items-center justify-end gap-2 px-6 py-4',
        merged.hasDivider && 'border-t border-border',
        props.class,
      )}
    >
      {props.children}
    </footer>
  );
}
