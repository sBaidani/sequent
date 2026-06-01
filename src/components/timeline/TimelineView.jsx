import { createSignal, For, onMount, onCleanup } from 'solid-js';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { uiStore } from '../../stores/uiStore';
import { format, addDays, isSameDay } from 'date-fns';
import EmptyState from '../ui/EmptyState';

function TimelineView() {
  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;
  const { state: uiState } = uiStore;

  const today = new Date();
  // Start with 15 days before and 30 days after
  const [days, setDays] = createSignal(Array.from({ length: 45 }).map((_, i) => addDays(today, i - 15)));

  let topSentinel;
  let bottomSentinel;

  onMount(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (entry.target === topSentinel) {
            // Load past
            setDays(prev => {
              const firstDay = prev[0];
              const pastDays = Array.from({ length: 15 }).map((_, i) => addDays(firstDay, -(15 - i)));
              return [...pastDays, ...prev];
            });
          } else if (entry.target === bottomSentinel) {
            // Load future
            setDays(prev => {
              const lastDay = prev[prev.length - 1];
              const futureDays = Array.from({ length: 15 }).map((_, i) => addDays(lastDay, i + 1));
              return [...prev, ...futureDays];
            });
          }
        }
      });
    }, { rootMargin: '1000px' });

    if (topSentinel) observer.observe(topSentinel);
    if (bottomSentinel) observer.observe(bottomSentinel);

    // Initial scroll to today
    setTimeout(() => {
      const todayEl = document.querySelector('.day-section.is-today');
      if (todayEl) todayEl.scrollIntoView({ block: 'start' });
    }, 100);

    onCleanup(() => observer.disconnect());
  });

  return (
    <>
      <div class="h-[60px] min-h-[60px] border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <button 
          onClick={() => uiStore.toggleSidebar()}
          class="flex w-9 h-9 rounded-full bg-white/5 border-none text-white items-center justify-center cursor-pointer transition-colors hover:bg-white/20"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
        <div class="flex flex-col">
          <div class="text-xl font-bold text-white tracking-wide leading-tight">Timeline</div>
          <div class="text-[11px] font-bold text-text-muted uppercase tracking-widest leading-none mt-0.5">Upcoming Schedule</div>
        </div>
        <button class="w-9 h-9 rounded-full bg-white/5 border-none text-white flex items-center justify-center cursor-pointer transition-colors hover:bg-white/20" onClick={() => uiStore.setActiveModal('addItem')}>
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
        </button>
      </div>

      <div class="flex-1 overflow-y-auto overflow-x-hidden relative scroll-smooth" id="timelineScroll">
        <div ref={topSentinel} style={{ height: '1px' }}></div>
        <For each={days()}>
          {(day) => {
            const isDayToday = isSameDay(day, today);
            const dateStr = format(day, 'yyyy-MM-dd');
            const eventsForDay = () => eventState.events.filter(e => e.start_time && isSameDay(new Date(e.start_time), day));
            const tasksForDay = () => taskState.tasks.filter(t => t.scheduled_date && isSameDay(new Date(t.scheduled_date), day));

            return (
              <div class={`day-section timeline-row-enter flex border-b border-white/5 min-h-[250px] transition-colors relative ${isDayToday ? 'bg-accent/5 is-today' : ''}`} data-date={dateStr}>
                <div class="w-20 min-w-20 border-r border-white/5 p-4 flex flex-col items-center sticky top-0">
                  {day.getDate() === 1 && (
                    <div class="text-xs font-bold text-text-secondary uppercase mb-2">{format(day, 'MMMM')}</div>
                  )}
                  <div class="text-[10px] font-bold text-text-muted uppercase mb-1">{format(day, 'EEE')}</div>
                  <div class={`flex items-center justify-center ${isDayToday ? 'w-9 h-9 rounded-full bg-accent text-white shadow-[0_0_15px_var(--color-accent)]' : ''}`}>
                    <div class="text-2xl font-bold text-white">{format(day, 'd')}</div>
                  </div>
                </div>
                
                <div class="flex-1 flex flex-col md:flex-row p-4 gap-6 relative">
                  <div class="flex-1 flex flex-col gap-3 min-w-0">
                    <div class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Schedule</div>
                    {eventsForDay().length === 0 ? (
                      <div class="text-sm font-semibold text-text-muted italic">A clear schedule.</div>
                    ) : (
                      <For each={eventsForDay()}>
                        {(ev) => (
                          <div class="relative pl-3 bg-card border border-border rounded-lg p-3.5 flex items-center justify-between transition-all overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[var(--cal-color)] timeline-card cursor-pointer" style={{ "--cal-color": "#E8942A" }}>
                            <div class="flex flex-col gap-1 min-w-0">
                              <div class="text-[15px] font-bold text-white/90 truncate">{ev.title}</div>
                              <div class="text-xs font-semibold text-text-muted truncate">
                                <span>{format(new Date(ev.start_time), 'h:mm a')}</span> - {format(new Date(ev.end_time), 'h:mm a')}
                              </div>
                            </div>
                          </div>
                        )}
                      </For>
                    )}
                  </div>
                  <div class="flex-1 flex flex-col gap-3 min-w-0">
                    <div class="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">Tasks</div>
                    {tasksForDay().length === 0 ? (
                      <div class="text-sm font-semibold text-text-muted italic">No tasks scheduled.</div>
                    ) : (
                      <For each={tasksForDay()}>
                        {(task) => (
                          <div class="relative pl-3 bg-card border border-border rounded-lg p-3.5 flex items-center justify-between transition-all overflow-hidden before:content-[''] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-[var(--cal-color)] timeline-card cursor-pointer" style={{ "--cal-color": "#6B5BDB", opacity: task.completed ? 0.5 : 1 }}>
                            <div class="flex flex-col gap-1 min-w-0">
                              <div class="text-[15px] font-bold text-white/90 truncate">{task.title}</div>
                              <div class="text-xs font-semibold text-text-muted truncate">Scheduled Task</div>
                            </div>
                          </div>
                        )}
                      </For>
                    )}
                  </div>
                </div>
              </div>
            );
          }}
        </For>
        <div ref={bottomSentinel} style={{ height: '1px' }}></div>
      </div>
      
      <button class="fixed bottom-8 right-8 w-12 h-12 rounded-full bg-white/10 text-white border-none backdrop-blur-md shadow-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 z-[100]" onClick={() => {
        const todayEl = document.querySelector('.day-section.is-today');
        if (todayEl) todayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}>
        <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
      </button>
    </>
  );
}

export default TimelineView;
