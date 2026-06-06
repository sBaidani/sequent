import { createSignal, createMemo, For } from 'solid-js';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isSameDay, 
  addMonths, subMonths, isToday 
} from 'date-fns';
import { eventStore } from '../../stores/eventStore';
import { uiStore } from '../../stores/uiStore';
import { expandRecurringItems } from '../../lib/recurrenceEngine';

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
    if (count === 0) return 'bg-transparent text-white/70';
    if (count <= 2) return 'bg-accent/40 text-white';
    if (count <= 4) return 'bg-accent/70 text-white';
    return 'bg-accent text-white shadow-[0_0_8px_var(--color-accent)]';
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
        <button onClick={prevMonth} class="font-display lowercase text-white/40 hover:text-white bg-transparent border-none text-xl cursor-pointer px-1 transition-colors">‹</button>
        <span class="text-[11px] font-extrabold text-white/90 uppercase tracking-[0.15em]">{format(currentMonth(), 'MMMM yyyy')}</span>
        <button onClick={nextMonth} class="font-display lowercase text-white/40 hover:text-white bg-transparent border-none text-xl cursor-pointer px-1 transition-colors">›</button>
      </div>
      
      <div class="grid grid-cols-7 mb-3 gap-1">
        <For each={['S', 'M', 'T', 'W', 'T', 'F', 'S']}>{d => (
          <div class="text-[9px] font-bold text-white/30 text-center uppercase">{d}</div>
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
                  class={`w-[26px] h-[26px] sm:w-[28px] sm:h-[28px] rounded-full text-[10px] font-bold flex items-center justify-center cursor-pointer transition-all hover:bg-white/20 hover:text-white hover:scale-110 ${isCurrentMonth ? '' : 'opacity-30'} ${isDayToday ? 'ring-2 ring-red-500/80 z-10' : ''} ${heatClass()}`}

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
