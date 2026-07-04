/**
 * Popover — SolidJS re-implementation of the Astryx Popover component.
 * Spec: `npx astryx component Popover` (see scratch/swizzle-popover for the
 * React source this mirrors).
 *
 * An anchored floating layer rendered in a Portal, positioned with
 * getBoundingClientRect + window resize/scroll listeners (no positioning
 * deps). Flips to the opposite side when it would overflow the viewport and
 * clamps along the cross axis.
 *
 * Adapted to the kit's controlled convention (like Dialog): visibility is
 * driven by the `open` prop, every dismiss path (Escape, click outside)
 * calls `onClose`, and the anchor is an external element via `anchorRef` —
 * the Astryx trigger-wrapping mode does not translate to Solid cleanly.
 *
 * Layering: the panel gets `z-index: var(--z-popover)` from the shell
 * z-index scale defined on :root in styles.css (scrim 40 < sidenav 50 <
 * popover 60 < dialog 70 < toast 80); the 60 fallback keeps the ordering
 * meaningful when the app stylesheet isn't loaded.
 *
 * @example
 * let anchor;
 * const [open, setOpen] = createSignal(false);
 * <button ref={anchor} onClick={() => setOpen(!open())}>Filter</button>
 * <Popover open={open()} onClose={() => setOpen(false)}
 *   anchorRef={() => anchor} label="Filter options">
 *   ...content...
 * </Popover>
 */
import { Show, createSignal, onMount, onCleanup, mergeProps } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cx } from './cx';

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Pure placement math, exported for direct unit testing.
 *
 * Flips to the opposite side of the anchor when the preferred side
 * overflows the viewport AND the opposite side fits; clamps the cross
 * axis into the viewport.
 *
 * @param {object} opts
 * @param {DOMRect} opts.anchorRect - Anchor bounding rect (viewport coords).
 * @param {DOMRect} opts.panelRect - Popover panel bounding rect (for size).
 * @param {'above'|'below'|'start'|'end'} [opts.placement='below'] - Preferred
 *   side of the anchor (start/end = inline start/end, i.e. left/right in LTR).
 * @param {'start'|'center'|'end'} [opts.alignment='start'] - Alignment along
 *   the anchor's other axis.
 * @param {number} [opts.gap=4] - Gap between anchor and panel (--spacing-1).
 * @param {number} [opts.padding=8] - Minimum viewport inset (--spacing-2).
 * @param {number} opts.viewportWidth
 * @param {number} opts.viewportHeight
 * @returns {{top: number, left: number, placement: string}} fixed-position
 *   coordinates plus the placement actually used after flipping.
 */
export function computePopoverPosition(opts) {
  const {
    anchorRect: a,
    panelRect: p,
    placement = 'below',
    alignment = 'start',
    gap = 4,
    padding = 8,
    viewportWidth: vw,
    viewportHeight: vh,
  } = opts;

  const clamp = (v, min, max) => Math.min(Math.max(v, min), Math.max(min, max));

  // Flip the main axis when the preferred side overflows and the other fits.
  let resolved = placement;
  const fitsBelow = a.bottom + gap + p.height <= vh - padding;
  const fitsAbove = a.top - gap - p.height >= padding;
  const fitsEnd = a.right + gap + p.width <= vw - padding;
  const fitsStart = a.left - gap - p.width >= padding;
  if (placement === 'below' && !fitsBelow && fitsAbove) resolved = 'above';
  else if (placement === 'above' && !fitsAbove && fitsBelow) resolved = 'below';
  else if (placement === 'end' && !fitsEnd && fitsStart) resolved = 'start';
  else if (placement === 'start' && !fitsStart && fitsEnd) resolved = 'end';

  let top;
  let left;
  if (resolved === 'below' || resolved === 'above') {
    top = resolved === 'below' ? a.bottom + gap : a.top - gap - p.height;
    if (alignment === 'center') left = a.left + (a.width - p.width) / 2;
    else if (alignment === 'end') left = a.right - p.width;
    else left = a.left;
    left = clamp(left, padding, vw - p.width - padding);
  } else {
    left = resolved === 'end' ? a.right + gap : a.left - gap - p.width;
    if (alignment === 'center') top = a.top + (a.height - p.height) / 2;
    else if (alignment === 'end') top = a.bottom - p.height;
    else top = a.top;
    top = clamp(top, padding, vh - p.height - padding);
  }
  return { top, left, placement: resolved };
}

/** Read a px-valued design token off :root, converting rem; fallback for jsdom. */
function readTokenPx(name, fallback) {
  if (typeof document === 'undefined') return fallback;
  const root = document.documentElement;
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return fallback;
  if (raw.endsWith('rem')) {
    return n * (parseFloat(getComputedStyle(root).fontSize) || 16);
  }
  return n;
}

/**
 * A click-triggered overlay anchored to an external trigger element.
 *
 * @param {object} props
 * @param {boolean} props.open - Whether the popover is shown (controlled).
 * @param {() => void} props.onClose - Called on every dismiss request
 *   (Escape, click outside). The owner flips `open` off.
 * @param {HTMLElement | (() => HTMLElement)} props.anchorRef - The anchor
 *   element (or an accessor returning it) the popover positions against.
 *   Clicks on the anchor never light-dismiss, so a toggling trigger works.
 * @param {'above'|'below'|'start'|'end'} [props.placement='below'] - Preferred
 *   side of the anchor; flips automatically near viewport edges.
 * @param {'start'|'center'|'end'} [props.alignment='start'] - Alignment along
 *   the placement axis.
 * @param {string} [props.label] - Accessible name (aria-label) for the
 *   popover dialog. Recommended when role is 'dialog'.
 * @param {'dialog'|'none'} [props.role='dialog'] - ARIA role of the panel.
 *   'none' omits the dialog role/label/focus-trap so a child content role
 *   (e.g. Menu's role="menu") is the exposed semantics — mirrors Astryx
 *   usePopover's role option.
 * @param {number|string} [props.width] - Panel width; numbers are px.
 * @param {boolean} [props.matchAnchorWidth=false] - Give the panel a
 *   min-width equal to the anchor's width (Astryx dropdown behavior).
 * @param {boolean} [props.hasAutoFocus=true] - Focus the first focusable
 *   element (or the panel) when opened; role='dialog' only.
 * @param {boolean} [props.hasLightDismiss=true] - Close on outside click.
 * @param {boolean} [props.hasEscapeDismiss=true] - Close on Escape.
 * @param {string} [props.id] - id for the panel (wire to aria-controls).
 * @param {string} [props.class] - Extra classes for the panel.
 * @param {import('solid-js').JSX.Element} props.children - Popover content.
 *   (The Astryx `content` prop; in this kit the trigger lives outside, so
 *   children are the content.)
 */
export function Popover(props) {
  const merged = mergeProps(
    {
      placement: 'below',
      alignment: 'start',
      role: 'dialog',
      hasAutoFocus: true,
      hasLightDismiss: true,
      hasEscapeDismiss: true,
      matchAnchorWidth: false,
    },
    props,
  );

  const isDialog = () => merged.role === 'dialog';

  // Rendered inside <Show> so onMount/onCleanup bracket each open/close.
  const Surface = () => {
    let panelRef;
    const [pos, setPos] = createSignal(null);
    const [anchorWidth, setAnchorWidth] = createSignal(null);
    let prevFocus = null;

    const anchorEl = () =>
      typeof props.anchorRef === 'function' ? props.anchorRef() : props.anchorRef;

    const update = () => {
      const anchor = anchorEl();
      if (!anchor || !panelRef) return;
      const anchorRect = anchor.getBoundingClientRect();
      setPos(
        computePopoverPosition({
          anchorRect,
          panelRect: panelRef.getBoundingClientRect(),
          placement: merged.placement,
          alignment: merged.alignment,
          gap: readTokenPx('--spacing-1', 4),
          padding: readTokenPx('--spacing-2', 8),
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        }),
      );
      if (merged.matchAnchorWidth) setAnchorWidth(anchorRect.width);
    };

    const handleDocMouseDown = (e) => {
      if (!merged.hasLightDismiss) return;
      if (panelRef && panelRef.contains(e.target)) return;
      const anchor = anchorEl();
      // Never light-dismiss from the anchor: its own click handler toggles,
      // and dismiss-then-reopen jitter is what the Astryx source guards too.
      if (anchor && anchor.contains(e.target)) return;
      props.onClose?.();
    };

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

    const handleDocKeyDown = (e) => {
      // A nested layer that already consumed this key owns it — don't also
      // dismiss the popover (mirrors the Dialog guard).
      if (e.defaultPrevented) return;
      if (e.key === 'Escape') {
        if (merged.hasEscapeDismiss) {
          e.preventDefault();
          props.onClose?.();
        }
        return;
      }
      // Focus trap only for dialog-role popovers; menus close on Tab instead.
      if (e.key === 'Tab' && isDialog()) trapTab(e);
    };

    onMount(() => {
      prevFocus =
        document.activeElement && typeof document.activeElement.focus === 'function'
          ? document.activeElement
          : null;

      update();
      window.addEventListener('resize', update);
      // capture:true also catches scrolls of nested scroll containers.
      window.addEventListener('scroll', update, true);
      document.addEventListener('mousedown', handleDocMouseDown);
      document.addEventListener('keydown', handleDocKeyDown);
      let resizeObserver;
      if (typeof ResizeObserver !== 'undefined') {
        resizeObserver = new ResizeObserver(update);
        resizeObserver.observe(panelRef);
      }

      onCleanup(() => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
        document.removeEventListener('mousedown', handleDocMouseDown);
        document.removeEventListener('keydown', handleDocKeyDown);
        resizeObserver?.disconnect();
        // Restore focus to the trigger unless the user already moved it
        // somewhere else (e.g. light-dismiss by clicking another control).
        const active = document.activeElement;
        if (!active || active === document.body || (panelRef && panelRef.contains(active))) {
          prevFocus?.focus();
        }
        prevFocus = null;
      });

      if (isDialog() && merged.hasAutoFocus) {
        const first = panelRef.querySelector(FOCUSABLE_SELECTOR);
        (first ?? panelRef).focus();
      }
    });

    return (
      <div
        ref={panelRef}
        id={props.id}
        role={isDialog() ? 'dialog' : undefined}
        aria-label={isDialog() ? props.label : undefined}
        tabindex="-1"
        data-placement={pos()?.placement ?? merged.placement}
        class={cx(
          // bg/border/radius/shadow per the Astryx popover surface tokens.
          'fixed rounded-lg border border-border bg-popover shadow-md outline-none',
          // Content padding (--spacing-3) applies to dialog popovers; menus
          // bring their own (--spacing-1), matching the Astryx source.
          isDialog() && 'p-3',
          props.class,
        )}
        style={{
          top: `${pos()?.top ?? 0}px`,
          left: `${pos()?.left ?? 0}px`,
          // Hidden until the first measure so there's no top-left flash.
          visibility: pos() ? 'visible' : 'hidden',
          'z-index': 'var(--z-popover, 60)',
          width: typeof props.width === 'number' ? `${props.width}px` : props.width,
          'min-width': anchorWidth() != null ? `${anchorWidth()}px` : undefined,
        }}
      >
        {props.children}
      </div>
    );
  };

  return (
    <Portal>
      <Show when={props.open}>
        <Surface />
      </Show>
    </Portal>
  );
}
