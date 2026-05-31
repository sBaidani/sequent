import { createSignal, For } from 'solid-js';
import { eventStore } from '../../stores/eventStore';
import { uiStore } from '../../stores/uiStore';
import { format, addDays, isSameDay } from 'date-fns';
import EmptyState from '../ui/EmptyState';

function TimelineView() {
  const { state: eventState } = eventStore;
  const { state: uiState } = uiStore;

  // Simple static 30 days for now
  const today = new Date();
  const days = Array.from({ length: 30 }).map((_, i) => addDays(today, i - 2));

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
        <For each={days}>
          {(day) => {
            const isToday = isSameDay(day, today);
            const eventsForDay = () => eventState.events.filter(e => e.start_time && isSameDay(new Date(e.start_time), day));

            return (
              <div class={`day-section ${isToday ? 'is-today' : ''}`}>
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
                    {eventsForDay().length === 0 ? (
                      <div class="day-empty">A clear day ahead.</div>
                    ) : (
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
                    )}
                  </div>
                </div>
              </div>
            );
          }}
        </For>
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
