import { createSignal, createMemo, For } from 'solid-js';
import { 
  startOfMonth, endOfMonth, startOfWeek, endOfWeek, 
  eachDayOfInterval, format, isSameMonth, isSameDay, 
  addMonths, subMonths, isToday 
} from 'date-fns';
import { eventStore } from '../../stores/eventStore';
import { uiStore } from '../../stores/uiStore';

function SidebarHeatmap() {
  const { state: eventState } = eventStore;
  const [currentMonth, setCurrentMonth] = createSignal(new Date());

  const daysInMonth = createMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth()));
    const end = endOfWeek(endOfMonth(currentMonth()));
    return eachDayOfInterval({ start, end });
  });

  const getHeatmapClass = (day) => {
    // SolidJS reactivity: we access eventState.events to trigger re-renders
    const eventsOnDay = eventState.events.filter(e => 
      e.start_time && isSameDay(new Date(e.start_time), day)
    );
    
    const count = eventsOnDay.length;
    if (count === 0) return '';
    if (count <= 2) return 'heatmap-1';
    if (count <= 4) return 'heatmap-2';
    return 'heatmap-3';
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
    <div class="sidebar-heatmap">
      <div class="heatmap-header">
        <button onClick={prevMonth} class="heatmap-nav-btn">‹</button>
        <span class="heatmap-month-title">{format(currentMonth(), 'MMMM yyyy')}</span>
        <button onClick={nextMonth} class="heatmap-nav-btn">›</button>
      </div>
      
      <div class="heatmap-grid-header">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
          <div class="heatmap-dow">{d}</div>
        ))}
      </div>

      <div class="heatmap-grid">
        <For each={daysInMonth()}>
          {(day) => {
            // Must be a function or directly evaluated in JSX to track reactivity for events
            const heatClass = () => getHeatmapClass(day);
            const isCurrentMonth = isSameMonth(day, currentMonth());
            const isDayToday = isToday(day);

            return (
              <button 
                class={`heatmap-day ${isCurrentMonth ? '' : 'other-month'} ${isDayToday ? 'is-today' : ''} ${heatClass()}`}
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
