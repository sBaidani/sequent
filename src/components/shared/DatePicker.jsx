// DatePicker — calendar dropdown rebuilt on kit primitives.
//
// Public contract unchanged: `value` is a 'yyyy-MM-dd' string (or empty),
// `onChange(dateString)` fires on day selection, optional `class` overrides
// the trigger styling (used by e.g. TasksView for a borderless inline
// trigger). The panel keeps the pre-kit portal behavior (fixed positioning
// under the trigger at the dialog z layer so it works inside modals).
//
// Internals: kit IconButton for month navigation, kit Text for the header
// and weekday captions, tokens for every color/radius/duration, standard
// focus rings, Escape closes and refocuses the trigger. Outside-dismiss and
// Escape ownership are delegated to the kit's shared overlay primitives
// (see src/components/kit/overlayStack.js) so this picker dismisses
// correctly on touch too, and so Escape doesn't wrongly cascade to close an
// ancestor Dialog when the picker is opened from inside one.
import { createSignal, createMemo, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import {
  format, addMonths, subMonths, startOfMonth, endOfMonth,
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-solid';
import { IconButton, Text, cx, EscapeLayer, useOutsideDismiss } from '../kit';

const TRIGGER_DEFAULT_CLASS = cx(
  'w-full box-border flex items-center justify-between gap-2 py-2 px-3 cursor-pointer',
  'rounded-md bg-surface text-primary font-sans text-base leading-[var(--text-label-leading)]',
  'border-(length:--border-width) border-solid border-border-strong',
  'focus:border-(--color-accent) transition-[border-color] duration-[var(--duration-fast)] ease-out',
  'motion-reduce:transition-none outline-none',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
);

function DatePicker(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [currentMonth, setCurrentMonth] = createSignal(props.value ? parseISO(props.value) : new Date());
  const [coords, setCoords] = createSignal({ top: 0, left: 0 });

  let containerRef;
  let popoverRef;
  let triggerRef;

  // Upgrades the previous mousedown-only outside-click handling to also
  // dismiss on touchstart (the shared hook's fuller behavior).
  useOutsideDismiss({
    isOpen,
    refs: [() => containerRef, () => popoverRef],
    onDismiss: () => setIsOpen(false),
  });

  const monthDays = createMemo(() => {
    const monthStart = startOfMonth(currentMonth());
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  });

  const nextMonth = () => setCurrentMonth(addMonths(currentMonth(), 1));
  const prevMonth = () => setCurrentMonth(subMonths(currentMonth(), 1));

  const close = ({ refocus = false } = {}) => {
    setIsOpen(false);
    if (refocus) triggerRef?.focus();
  };

  const handleSelect = (date) => {
    props.onChange(format(date, 'yyyy-MM-dd'));
    close({ refocus: true });
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

  const selectedDate = () => (props.value ? parseISO(props.value) : null);

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
        <span>{props.value ? format(parseISO(props.value), 'MMM d, yyyy') : 'Select date'}</span>
        <CalendarIcon aria-hidden="true" class="size-4 shrink-0 text-secondary" />
      </button>

      <Show when={isOpen()}>
        {/* Joins the shared overlay stack for as long as the panel is open,
            so a nested Escape doesn't wrongly cascade to close an ancestor
            Dialog (e.g. this picker opened from inside AddEventModal). */}
        <EscapeLayer onEscape={() => close({ refocus: true })} />
        <Portal>
          <div
            ref={popoverRef}
            role="dialog"
            aria-label="Choose date"
            class="fixed z-[var(--z-dialog,70)] w-max p-3 rounded-lg border border-border bg-popover shadow-md"
            style={{ top: `${coords().top}px`, left: `${coords().left}px` }}
          >
            <div class="flex justify-between items-center mb-3">
              <IconButton
                variant="ghost"
                size="sm"
                label="Previous month"
                icon={<ChevronLeft />}
                onClick={prevMonth}
              />
              <Text type="label" weight="semibold" aria-live="polite">
                {format(currentMonth(), 'MMMM yyyy')}
              </Text>
              <IconButton
                variant="ghost"
                size="sm"
                label="Next month"
                icon={<ChevronRight />}
                onClick={nextMonth}
              />
            </div>

            <div class="grid grid-cols-7 mb-1" aria-hidden="true">
              <For each={['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']}>
                {(day) => (
                  <Text type="supporting" color="secondary" weight="medium" justify="center" display="block" class="uppercase">
                    {day}
                  </Text>
                )}
              </For>
            </div>

            <div class="grid grid-cols-7 gap-1">
              <For each={monthDays()}>
                {(date) => {
                  const isSelected = selectedDate() && isSameDay(date, selectedDate());
                  const isCurrentMonth = isSameMonth(date, currentMonth());
                  const isToday = isSameDay(date, new Date());

                  return (
                    <button
                      type="button"
                      onClick={() => handleSelect(date)}
                      aria-label={format(date, 'MMMM d, yyyy')}
                      aria-pressed={isSelected ? 'true' : 'false'}
                      aria-current={isToday ? 'date' : undefined}
                      class={cx(
                        'size-8 rounded-full flex items-center justify-center cursor-pointer p-0',
                        'border-0 bg-transparent font-sans text-sm font-medium leading-[var(--text-supporting-leading)]',
                        'transition-colors duration-[var(--duration-fast)] ease-out motion-reduce:transition-none',
                        'outline-none focus-visible:outline-2 focus-visible:outline-(--color-accent)',
                        isSelected
                          ? 'bg-accent-bg text-on-accent'
                          : isToday
                            ? 'bg-neutral text-accent hover:bg-overlay-hover'
                            : 'text-primary hover:bg-overlay-hover',
                        !isCurrentMonth && !isSelected ? 'opacity-30' : 'opacity-100',
                      )}
                    >
                      {format(date, 'd')}
                    </button>
                  );
                }}
              </For>
            </div>
          </div>
        </Portal>
      </Show>
    </div>
  );
}

export default DatePicker;
