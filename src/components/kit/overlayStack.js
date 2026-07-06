// overlayStack.js — shared overlay-layer primitives for the kit.
//
// ROOT CAUSE this replaces: Dialog and Popover each used to register their
// OWN document-level 'keydown' listener for Escape, gated by
// `if (e.defaultPrevented) return` with a comment claiming "a nested layer
// that already consumed this key owns it — don't also dismiss". That's
// backwards: same-target document.addEventListener listeners fire in
// REGISTRATION order, not DOM-nesting order. A Dialog is always mounted
// (and its listener registered) BEFORE any Popover/Selector/Menu opened
// later inside it, so the Dialog's handler always ran FIRST on Escape,
// closed the whole Dialog, and marked the event defaultPrevented — so the
// nested overlay's own handler then no-op'd. Net effect: Escape closed the
// wrong (outer) layer while the intended nested control silently failed to
// close.
//
// Fix: exactly ONE shared document keydown listener, driven by a stack of
// open overlay entries. The entry pushed most recently is always the
// topmost frame — regardless of when its *container* mounted — because an
// overlay that opens later always pushes later. That's true open/nesting
// order, unlike listener-registration order.
//
// Also exports the focus-trap (`FOCUSABLE_SELECTOR` / `trapFocus`) and
// outside-dismiss (`useOutsideDismiss`) helpers that used to be
// hand-rolled, near-identically, across Dialog.jsx, Popover.jsx,
// Selector.jsx and the shared pickers (DatePicker/TimePicker/ColorPicker).
import { createSignal, onMount, onCleanup, createEffect } from 'solid-js';

// ─── Escape ownership stack ─────────────────────────────────────────────

const stack = [];
// Bumped on every push/pop so `isTopmost()` accessors stay reactive. Module
// level createSignal is safe here: signals need no owner/disposal, only
// effects/memos do (and none are created at module scope).
const [version, setVersion] = createSignal(0);
const bump = () => setVersion((v) => v + 1);

let listenerInstalled = false;

function handleDocumentKeyDown(e) {
  if (e.key !== 'Escape') return;
  const top = stack[stack.length - 1];
  if (!top) return;
  top.onEscape?.(e);
  // The topmost overlay is the sole owner of this Escape: own the key so
  // nothing else (a browser back-gesture, some other stray listener) also
  // reacts, and so it never cascades down to close a layer underneath.
  e.preventDefault();
}

function ensureListener() {
  if (listenerInstalled) return;
  document.addEventListener('keydown', handleDocumentKeyDown);
  listenerInstalled = true;
}

function teardownListenerIfEmpty() {
  if (!listenerInstalled || stack.length > 0) return;
  document.removeEventListener('keydown', handleDocumentKeyDown);
  listenerInstalled = false;
}

/**
 * Registers the calling component as one frame of the shared overlay stack
 * for the duration of its mount: push on mount, pop on cleanup. Use this
 * directly inside overlays that mount only while open (Dialog/Popover's
 * `<Show>`-gated Surface component). For a persistently-mounted component
 * with an internal open signal (Selector, the shared pickers), render the
 * `EscapeLayer` convenience component below inside your own
 * `<Show when={isOpen()}>` so mount/cleanup track open/close instead.
 *
 * IMPORTANT: don't ALSO close the overlay from a local element-scoped
 * keydown handler on Escape — let `onEscape` be the sole trigger. A local
 * handler that calls close() synchronously pops this entry off the stack
 * before the same event finishes bubbling to `document`, which would let
 * the shared listener fall through to the next (wrong) layer underneath.
 *
 * @param {object} [opts]
 * @param {(e: KeyboardEvent) => void} [opts.onEscape] - Called when this
 *   frame is topmost and Escape is pressed. The stack calls
 *   `preventDefault` itself afterward; `onEscape` doesn't need to.
 * @returns {{isTopmost: () => boolean}} Reactive accessor: true while this
 *   frame is the last-pushed (still-registered) entry on the stack.
 */
export function useOverlayLayer({ onEscape } = {}) {
  const entry = { onEscape };

  onMount(() => {
    stack.push(entry);
    ensureListener();
    bump();
  });

  onCleanup(() => {
    const i = stack.indexOf(entry);
    if (i !== -1) stack.splice(i, 1);
    teardownListenerIfEmpty();
    bump();
  });

  const isTopmost = () => {
    version();
    return stack.length > 0 && stack[stack.length - 1] === entry;
  };

  return { isTopmost };
}

/**
 * Convenience bridge for persistently-mounted components: renders nothing,
 * just joins the overlay stack for as long as it stays mounted. Pair with
 * `<Show when={isOpen()}><EscapeLayer onEscape={...} /></Show>` so the
 * layer is pushed/popped exactly when the dropdown/popover opens/closes.
 *
 * @param {object} props
 * @param {(e: KeyboardEvent) => void} [props.onEscape]
 */
export function EscapeLayer(props) {
  useOverlayLayer({ onEscape: (e) => props.onEscape?.(e) });
  return null;
}

// ─── Focus trap (ported verbatim from Dialog.jsx / Popover.jsx) ─────────

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Tab-traps a container: cycles focus inside `containerEl` on Tab / Shift+Tab.
 * Call from the container's own `keydown` handler (bubble-scoped — no
 * document listener needed since focus never legitimately leaves a
 * correctly-trapped container).
 *
 * @param {HTMLElement | null | undefined} containerEl
 * @param {KeyboardEvent} event
 */
export function trapFocus(containerEl, event) {
  if (!containerEl) return;
  const focusables = Array.from(containerEl.querySelectorAll(FOCUSABLE_SELECTOR));
  if (focusables.length === 0) {
    event.preventDefault();
    containerEl.focus();
    return;
  }
  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  if (event.shiftKey) {
    if (active === first || active === containerEl || !containerEl.contains(active)) {
      event.preventDefault();
      last.focus();
    }
  } else if (active === last || !containerEl.contains(active)) {
    event.preventDefault();
    first.focus();
  }
}

// ─── Outside dismiss (replaces ~5 hand-rolled copies) ───────────────────

const resolveEl = (ref) => (typeof ref === 'function' ? ref() : ref);

/**
 * Closes an overlay on a pointer-down outside every provided ref, while
 * `isOpen()` is true. Listens for both mousedown and touchstart — some of
 * the call sites this replaces only handled mousedown; touchstart support
 * is a strict improvement (ported from Selector's fuller behavior) rolled
 * out to all of them.
 *
 * @param {object} opts
 * @param {() => boolean} opts.isOpen - Reactive: the document listeners are
 *   attached only while this returns true.
 * @param {Array<HTMLElement | null | undefined | (() => (HTMLElement | null | undefined))>} [opts.refs]
 *   Elements (or element-getters) that do NOT count as "outside" — e.g. the
 *   trigger and the panel.
 * @param {(e: Event) => void} opts.onDismiss - Called on an outside
 *   mousedown/touchstart.
 */
export function useOutsideDismiss({ isOpen, refs = [], onDismiss }) {
  const handlePointerDown = (e) => {
    const isInside = refs.some((ref) => {
      const el = resolveEl(ref);
      return el && el.contains(e.target);
    });
    if (!isInside) onDismiss?.(e);
  };

  createEffect(() => {
    if (!isOpen()) return;
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('touchstart', handlePointerDown);
    onCleanup(() => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('touchstart', handlePointerDown);
    });
  });
}
