// SidebarHeatmap — mini month grid showing event density (Phase 4, kit-based).
// Retired here: bg-accent/NN arbitrary-opacity heat steps (documented 4-step
// token ramp via color-mix below), raw ring-red-500 today marker (--color-error),
// bare ‹/› buttons without accessible names (kit IconButton), and off-scale
// text-[9px]/[10px]/[11px] type (token type scale via the Tailwind bridge).
// The 26/28px day-circle geometry is existing fixed geometry and stays.
import { createSignal, createMemo, For } from 'solid-js';
import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths, isToday
} from 'date-fns';
import { eventStore } from '../../stores/eventStore';
import { uiStore } from '../../stores/uiStore';
import { expandRecurringItems } from '../../lib/recurrenceEngine';
import { IconButton, Text, cx } from '../kit';

const ChevronLeftIcon = () => (
  <svg class="size-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
);
const ChevronRightIcon = () => (
  <svg class="size-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" /></svg>
);

// Documented 4-step accent intensity ramp. Every step is derived from the
// theme accent token (via color-mix against transparent), so the ramp follows
// the active accent and light/dark mode automatically:
//   step 0 (0 events)  — transparent, secondary text
//   step 1 (1–2)       — 30% accent
//   step 2 (3–4)       — 60% accent
//   step 3 (5+)        — full accent (+ token glow), on-accent text
const HEAT_RAMP = [
  'bg-transparent text-secondary',
  'bg-[color-mix(in_srgb,var(--color-accent)_30%,transparent)] text-primary',
  'bg-[color-mix(in_srgb,var(--color-accent)_60%,transparent)] text-primary',
  'bg-accent-bg text-on-accent shadow-[0_0_8px_var(--color-accent)]',
];

function SidebarHeatmap() {
  const { state: eventState } = eventStore;
  const [currentMonth, setCurrentMonth] = createSignal(new Date());

  const daysInMonth = createMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth()));
    const end = endOfWeek(endOfMonth(currentMonth()));
    return eachDayOfInterval({ start, end });
  });

  const monthEvents = createMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth()));
    const end = endOfWeek(endOfMonth(currentMonth()));
    return expandRecurringItems(eventStore.visibleEvents, start, end);
  });

  const getEventCount = (day) => {
    return monthEvents().filter(e =>
      e.start_time && isSameDay(new Date(e.start_time), day)
    ).length;
  };

  const getHeatmapClass = (count) => {
    if (count === 0) return HEAT_RAMP[0];
    if (count <= 2) return HEAT_RAMP[1];
    if (count <= 4) return HEAT_RAMP[2];
    return HEAT_RAMP[3];
  };

  const handleDayClick = (day) => {
    uiStore.setActiveDate(day.toISOString());
    uiStore.setView('timeline');

    // Smooth scroll to the date in Timeline if it's already rendered
    setTimeout(() => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const el = document.querySelector(`[data-date="${dateStr}"]`);
      const scrollContainer = document.getElementById('timelineScroll');
      if (el && scrollContainer) {
        scrollContainer.scrollTo({ top: el.offsetTop, behavior: 'smooth' });
      }
    }, 50);
  };

  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));

  return (
    <div class="px-5 pb-6 mb-4">
      <div class="flex items-center justify-between mb-4">
        <IconButton
          label="Previous month"
          icon={<ChevronLeftIcon />}
          variant="ghost"
          size="sm"
          onClick={prevMonth}
        />
        <Text size="sm" weight="bold" class="uppercase tracking-widest">
          {format(currentMonth(), 'MMMM yyyy')}
        </Text>
        <IconButton
          label="Next month"
          icon={<ChevronRightIcon />}
          variant="ghost"
          size="sm"
          onClick={nextMonth}
        />
      </div>

      <div class="grid grid-cols-7 mb-3 gap-1" aria-hidden="true">
        <For each={['S', 'M', 'T', 'W', 'T', 'F', 'S']}>{d => (
          <Text size="2xs" weight="bold" color="disabled" display="block" justify="center" class="uppercase">
            {d}
          </Text>
        )}</For>
      </div>

      <div class="grid grid-cols-7 gap-x-1 gap-y-1.5">
        <For each={daysInMonth()}>
          {(day) => {
            const count = () => getEventCount(day);
            const heatClass = () => getHeatmapClass(count());
            const isCurrentMonth = isSameMonth(day, currentMonth());
            const isDayToday = isToday(day);

            return (
              <div class="flex items-center justify-center">
                <button
                  type="button"
                  class={cx(
                    // 26/28px circle: existing fixed geometry (kept); type on
                    // the token scale (text-xs = --font-size-xs); hover tint
                    // stacked as a background-image overlay so it composes
                    // with every ramp step (kit Button pattern).
                    'w-[26px] h-[26px] sm:w-[28px] sm:h-[28px] rounded-full text-xs font-bold',
                    'flex items-center justify-center cursor-pointer border-none transition-all',
                    'hover:[background-image:linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))] hover:scale-110',
                    'focus-visible:outline-2 focus-visible:outline-(--color-accent) focus-visible:outline-offset-2',
                    !isCurrentMonth && 'opacity-30',
                    isDayToday && 'ring-2 ring-error/80 z-10',
                    heatClass(),
                  )}
                  aria-label={`${format(day, 'EEEE, MMMM d, yyyy')} — ${count()} event${count() === 1 ? '' : 's'}`}
                  aria-current={isDayToday ? 'date' : undefined}
                  onClick={() => handleDayClick(day)}
                >
                  {format(day, 'd')}
                </button>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}

export default SidebarHeatmap;
