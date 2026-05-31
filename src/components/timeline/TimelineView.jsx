import { createSignal, createEffect, onCleanup, For } from 'solid-js';
import { eventStore } from '../../stores/eventStore';
import { uiStore } from '../../stores/uiStore';
import { format, addDays, isSameDay } from 'date-fns';

function TimelineView() {
  const { state: eventState } = eventStore;
  const { state: uiState } = uiStore;

  // Simple static 30 days for now
  const today = new Date();
  const days = Array.from({ length: 30 }).map((_, i) => addDays(today, i));

  return (
    <div class="timeline-container">
      <div class="timeline-scroll" id="timelineScroll">
        <For each={days}>
          {(day) => {
            const isToday = isSameDay(day, today);
            const eventsForDay = eventState.events.filter(e => isSameDay(new Date(e.startTime), day));

            return (
              <div class={`day-section ${isToday ? 'is-today' : ''}`}>
                <div class="day-header">
                  <div class="day-date">{format(day, 'MMM d')}</div>
                  <div class="day-name">{format(day, 'EEEE')}</div>
                </div>
                
                <div class="day-content">
                  {eventsForDay.length === 0 ? (
                    <div class="empty-state-micro">No events</div>
                  ) : (
                    <For each={eventsForDay}>
                      {(ev) => (
                        <div class="event-card">
                          <div class="event-card-color" style={{ "background-color": "#E8942A" }}></div>
                          <div class="event-card-body">
                            <h4>{ev.title}</h4>
                            <p class="event-time">
                              {format(new Date(ev.startTime), 'h:mm a')} - {format(new Date(ev.endTime), 'h:mm a')}
                            </p>
                          </div>
                        </div>
                      )}
                    </For>
                  )}
                </div>
              </div>
            );
          }}
        </For>
      </div>
      
      <button class="fab" id="scrollToTodayFab" onClick={() => {
        const todayEl = document.querySelector('.day-section.is-today');
        if (todayEl) todayEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }}>
        <span>Today</span>
      </button>
    </div>
  );
}

export default TimelineView;
