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
      <div class="timeline-topbar">
        <button class="topbar-menu">
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
        </button>
        <div class="topbar-title-block">
          <div class="topbar-today-label">Timeline</div>
          <div class="topbar-week-label">Upcoming Schedule</div>
        </div>
        <button class="topbar-add" onClick={() => uiStore.setActiveModal('addEvent')}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
        </button>
      </div>

      <div class="timeline-scroll" id="timelineScroll">
        <div ref={topSentinel} style={{ height: '1px' }}></div>
        <For each={days()}>
          {(day) => {
            const isDayToday = isSameDay(day, today);
            const dateStr = format(day, 'yyyy-MM-dd');
            const eventsForDay = () => eventState.events.filter(e => e.start_time && isSameDay(new Date(e.start_time), day));
            const tasksForDay = () => taskState.tasks.filter(t => t.scheduled_date && isSameDay(new Date(t.scheduled_date), day));

            return (
              <div class={`day-section ${isDayToday ? 'is-today' : ''}`} data-date={dateStr}>
                <div class="day-gutter">
                  {day.getDate() === 1 && (
                    <div class="day-gutter-month">{format(day, 'MMMM')}</div>
                  )}
                  <div class="day-gutter-dow">{format(day, 'EEE')}</div>
                  <div class="day-gutter-num-wrap">
                    <div class="day-gutter-num">{format(day, 'd')}</div>
                  </div>
                </div>
                
                <div class="day-content">
                  <div class="day-col-events">
                    <div class="section-label">Schedule</div>
                    {eventsForDay().length === 0 && tasksForDay().length === 0 ? (
                      <div class="day-empty">A clear day ahead.</div>
                    ) : (
                      <>
                        <For each={eventsForDay()}>
                          {(ev) => (
                            <div class="event-card" style={{ "--cal-color": "#E8942A" }}>
                              <div class="event-card-body">
                                <div class="event-card-title">{ev.title}</div>
                                <div class="event-card-meta">
                                  <span class="event-card-time">{format(new Date(ev.start_time), 'h:mm a')}</span> - {format(new Date(ev.end_time), 'h:mm a')}
                                </div>
                              </div>
                            </div>
                          )}
                        </For>
                        <For each={tasksForDay()}>
                          {(task) => (
                            <div class="event-card task-scheduled-card" style={{ "--cal-color": "#6B5BDB", opacity: task.completed ? 0.5 : 1 }}>
                              <div class="event-card-body">
                                <div class="event-card-title">{task.title}</div>
                                <div class="event-card-meta">Scheduled Task</div>
                              </div>
                            </div>
                          )}
                        </For>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          }}
        </For>
        <div ref={bottomSentinel} style={{ height: '1px' }}></div>
      </div>
      
      <button class="scroll-to-today-fab" onClick={() => {
        const todayEl = document.querySelector('.day-section.is-today');
        if (todayEl) todayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path></svg>
      </button>
    </>
  );
}

export default TimelineView;
