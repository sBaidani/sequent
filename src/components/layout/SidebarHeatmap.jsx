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
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 50);
  };

  const nextMonth = () => setCurrentMonth(prev => addMonths(prev, 1));
  const prevMonth = () => setCurrentMonth(prev => subMonths(prev, 1));

  return (
    <div class="px-5 pb-5 border-b border-white/10">
      <div class="flex items-center justify-between mb-3">
        <button onClick={prevMonth} class="text-white/40 hover:text-white bg-transparent border-none text-lg cursor-pointer px-1">‹</button>
        <span class="text-xs font-bold text-white uppercase tracking-wider">{format(currentMonth(), 'MMMM yyyy')}</span>
        <button onClick={nextMonth} class="text-white/40 hover:text-white bg-transparent border-none text-lg cursor-pointer px-1">›</button>
      </div>
      
      <div class="grid grid-cols-7 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
          <div class="text-[9px] font-bold text-white/30 text-center uppercase">{d}</div>
        ))}
      </div>

      <div class="grid grid-cols-7 gap-1">
        <For each={daysInMonth()}>
          {(day) => {
            const count = () => getEventCount(day);
            const heatClass = () => getHeatmapClass(count());
            const isCurrentMonth = isSameMonth(day, currentMonth());
            const isDayToday = isToday(day);

            return (
              <button 
                class={`w-6 h-6 rounded-full text-[10px] font-bold flex items-center justify-center cursor-pointer transition-colors hover:bg-white/20 hover:text-white ${isCurrentMonth ? '' : 'opacity-30'} ${isDayToday && count() === 0 ? 'text-accent' : ''} ${heatClass()}`}
                onClick={() => handleDayClick(day)}
              >
                {format(day, 'd')}
              </button>
            );
          }}
        </For>
      </div>
    </div>
  );
}

export default SidebarHeatmap;
