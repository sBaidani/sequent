// TimePicker — hour/minute dropdown rebuilt on kit primitives.
//
// Public contract unchanged: `value` is an 'HH:mm' string, `onChange('HH:mm')`
// fires on every hour/minute pick, the display respects the 24-hour-clock
// setting, and the panel keeps the pre-kit portal behavior (fixed positioning
// under the trigger at the dialog z layer so it works inside modals).
//
// Internals: the hour and minute columns are kit List/ListItem rows
// (edge-to-edge, keyboard navigable), the confirm action is a kit Button,
// tokens for every color/radius/duration, Escape closes and refocuses.
import { createSignal, onCleanup, onMount, For, Show, createMemo, createEffect } from 'solid-js';
import { Portal } from 'solid-js/web';
import { Clock } from 'lucide-solid';
import { format } from 'date-fns';
import { settingsStore } from '../../stores/settingsStore';
import { List, ListItem, Button, cx } from '../kit';

const TRIGGER_DEFAULT_CLASS = cx(
  'w-full box-border flex items-center justify-between gap-2 py-2 px-3 cursor-pointer',
  'rounded-md bg-surface text-primary font-sans text-base leading-[var(--text-label-leading)]',
  'border-(length:--border-width) border-solid border-border-strong',
  'focus:border-(--color-accent) transition-[border-color] duration-[var(--duration-fast)] ease-out',
  'motion-reduce:transition-none outline-none',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
);

// Fixed scroll window for the option columns (kept from the pre-kit picker;
// same idea as the Selector spec's fixed 300px listbox).
const COLUMN_CLASS = 'h-[200px] w-16 overflow-y-auto rounded-md bg-muted p-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]';

function TimePicker(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });
  let containerRef;
  let popoverRef;
  let triggerRef;
  let hoursContainerRef;
  let minutesContainerRef;

  const handleClickOutside = (e) => {
    if (isOpen() && containerRef && !containerRef.contains(e.target) && popoverRef && !popoverRef.contains(e.target)) {
      setIsOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside);
  });

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  // Provide 5 min increments
  const minutes = Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0'));

  const selectedHour = () => (props.value ? props.value.split(':')[0] : '09');
  const selectedMinute = () => (props.value ? props.value.split(':')[1] : '00');

  const updateTime = (h, m) => {
    props.onChange(`${h}:${m}`);
  };

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
    } else {
      setIsOpen(false);
    }
  };

  createEffect(() => {
    if (isOpen()) {
      // Use requestAnimationFrame to ensure the portal is fully rendered before scrolling
      requestAnimationFrame(() => {
        for (const container of [hoursContainerRef, minutesContainerRef]) {
          const active = container?.querySelector('[aria-selected="true"]');
          active?.scrollIntoView?.({ block: 'center' });
        }
      });
    }
  });

  const handlePanelKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      close({ refocus: true });
    }
  };

  const displayValue = createMemo(() => {
    if (!props.value) return 'Select time';
    if (settingsStore.state.use24HourClock) return props.value;

    const [h, m] = props.value.split(':');
    const d = new Date();
    d.setHours(parseInt(h, 10), parseInt(m, 10), 0);
    return format(d, 'h:mm a');
  });

  return (
    <div class="relative w-full" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={togglePicker}
        aria-haspopup="dialog"
        aria-expanded={isOpen() ? 'true' : 'false'}
        class={props.class || TRIGGER_DEFAULT_CLASS}
      >
        <span>{displayValue()}</span>
        <Clock aria-hidden="true" class="size-4 shrink-0 text-secondary" />
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Choose time"
            onKeyDown={handlePanelKeyDown}
            class="fixed z-[var(--z-dialog,70)] w-max p-3 rounded-lg border border-border bg-popover shadow-md flex flex-col gap-3"
            style={{ top: `${coords().top}px`, left: `${coords().left}px` }}
          >
            <div class="flex gap-2">
              <div ref={hoursContainerRef} class={COLUMN_CLASS}>
                <List aria-label="Hour" density="compact">
                  <For each={hours}>
                    {(h) => (
                      <ListItem
                        label={h}
                        isSelected={h === selectedHour()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          updateTime(h, selectedMinute());
                        }}
                      />
                    )}
                  </For>
                </List>
              </div>
              <div class="w-px bg-border" />
              <div ref={minutesContainerRef} class={COLUMN_CLASS}>
                <List aria-label="Minute" density="compact">
                  <For each={minutes}>
                    {(m) => (
                      <ListItem
                        label={m}
                        isSelected={m === selectedMinute()}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          updateTime(selectedHour(), m);
                        }}
                      />
                    )}
                  </For>
                </List>
              </div>
            </div>
            <Button
              variant="primary"
              label="Done"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                close({ refocus: true });
              }}
            />
          </div>
        </Portal>
      </Show>
    </div>
  );
}

export default TimePicker;
