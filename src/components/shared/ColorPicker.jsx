// ColorPicker — bounded Astryx hue palette swatch picker.
//
// The palette is exactly the ~10 hue token families from
// src/lib/colorTokens.js (user decision: bounded palette, no free-form
// custom colors). Selecting a swatch calls `onChange` with the token's
// representative hex so existing store/DB writes keep working; the stored
// value is rendered back through snapUserColor() so it always displays as
// a theme-adaptive token reference.
//
// A11y: the trigger is an icon-only button (aria-haspopup/aria-expanded);
// the portal panel is a radiogroup of swatches with roving tabindex —
// arrows/Home/End move focus, Enter/Space select, Escape closes and
// refocuses the trigger. Outside-dismiss and Escape ownership are
// delegated to the kit's shared overlay primitives (see
// src/components/kit/overlayStack.js) so this picker dismisses correctly
// on touch too, and so Escape doesn't wrongly cascade to close an ancestor
// Dialog when opened from inside one.
import { createSignal, Show, For } from 'solid-js';
import { Portal } from 'solid-js/web';
import { cx, EscapeLayer, useOutsideDismiss } from '../kit';
import { HUE_TOKENS, snapUserColor } from '../../lib/colorTokens';

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

function ColorPicker(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });
  let containerRef;
  let popoverRef;
  let triggerRef;
  const swatchRefs = new Map();

  const selectedToken = () => (props.value ? snapUserColor(props.value) : null);

  // Upgrades the previous mousedown-only outside-click handling to also
  // dismiss on touchstart (the shared hook's fuller behavior).
  useOutsideDismiss({
    isOpen,
    refs: [() => containerRef, () => popoverRef],
    onDismiss: () => setIsOpen(false),
  });

  const close = ({ refocus = false } = {}) => {
    setIsOpen(false);
    if (refocus) triggerRef?.focus();
  };

  const togglePicker = (e) => {
    e.preventDefault();
    if (!isOpen()) {
      const rect = containerRef.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left });
      setIsOpen(true);
      // Focus the selected (or first) swatch once the portal has rendered.
      requestAnimationFrame(() => {
        const target = swatchRefs.get(selectedToken()?.name) ?? swatchRefs.get(HUE_TOKENS[0].name);
        target?.focus();
      });
    } else {
      setIsOpen(false);
    }
  };

  const select = (token) => {
    props.onChange(token.hex);
    close({ refocus: true });
  };

  const handleGroupKeyDown = (e) => {
    const focusedIndex = HUE_TOKENS.findIndex((t) => swatchRefs.get(t.name) === document.activeElement);
    let next = null;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      next = (Math.max(focusedIndex, 0) + 1) % HUE_TOKENS.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      next = (Math.max(focusedIndex, 0) - 1 + HUE_TOKENS.length) % HUE_TOKENS.length;
    } else if (e.key === 'Home') {
      next = 0;
    } else if (e.key === 'End') {
      next = HUE_TOKENS.length - 1;
    } else {
      // Escape is handled by the shared overlay stack (see the EscapeLayer
      // rendered alongside the panel below) rather than here.
      return;
    }
    e.preventDefault();
    swatchRefs.get(HUE_TOKENS[next].name)?.focus();
  };

  // Roving tabindex: the selected swatch (or the first) is the tab stop.
  const tabStopName = () => selectedToken()?.name ?? HUE_TOKENS[0].name;

  return (
    <div class="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={togglePicker}
        aria-label="Choose color"
        aria-haspopup="dialog"
        aria-expanded={isOpen() ? 'true' : 'false'}
        title="Choose color"
        class={cx(
          'size-6 shrink-0 rounded-full p-0 cursor-pointer',
          'border-(length:--border-width) border-solid border-border-strong',
          'transition-transform duration-[var(--duration-fast)] ease-out motion-reduce:transition-none hover:scale-110',
          'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
        )}
        style={{ background: selectedToken()?.cssVar ?? 'var(--color-neutral)' }}
      />

      <Show when={isOpen()}>
        {/* Joins the shared overlay stack for as long as the panel is open,
            so a nested Escape doesn't wrongly cascade to close an ancestor
            Dialog (e.g. this picker opened from inside AddEventModal). */}
        <EscapeLayer onEscape={() => close({ refocus: true })} />
        <Portal>
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Choose color"
            class="fixed z-[var(--z-dialog,70)] p-3 rounded-lg border border-border bg-popover shadow-md"
            style={{ top: `${coords().top}px`, left: `${coords().left}px` }}
          >
            <div
              role="radiogroup"
              aria-label="Color"
              onKeyDown={handleGroupKeyDown}
              class="grid grid-cols-5 gap-2"
            >
              <For each={HUE_TOKENS}>{(token) => (
                <button
                  ref={(el) => swatchRefs.set(token.name, el)}
                  type="button"
                  role="radio"
                  aria-checked={selectedToken()?.name === token.name ? 'true' : 'false'}
                  aria-label={capitalize(token.name)}
                  title={capitalize(token.name)}
                  tabindex={tabStopName() === token.name ? 0 : -1}
                  onClick={() => select(token)}
                  class={cx(
                    'size-8 rounded-full p-0 cursor-pointer border-0',
                    'transition-transform duration-[var(--duration-fast)] ease-out motion-reduce:transition-none hover:scale-110',
                    'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
                    selectedToken()?.name === token.name &&
                      'shadow-[0_0_0_2px_var(--color-popover),0_0_0_4px_var(--color-accent)]',
                  )}
                  style={{ background: token.cssVar }}
                />
              )}</For>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  );
}

export default ColorPicker;
