import { For } from 'solid-js';
import { eventStore } from '../../stores/eventStore';

function CalendarView() {
  const { state: eventState } = eventStore;

  return (
    <>
      <div class="lists-topbar">
        <div class="lists-title">Calendars</div>
        <div class="lists-topbar-actions">
          <button class="topbar-icon-btn">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          </button>
        </div>
      </div>

      <div class="lists-layout">
        <div class="schedule-pane">
          <div class="schedule-pane-title">Sync</div>
          <p style={{"color":"#888","font-size":"12px"}}>Google Calendar & Outlook sync coming soon.</p>
        </div>

        <div class="lists-grid">
          <For each={eventState.calendars}>
            {(cal) => {
              return (
                <div class="list-card" style={{ "background-color": cal.color }}>
                  <div class="list-card-name">{cal.name}</div>
                  
                  <div class="list-card-tasks" style={{"margin-top":"12px"}}>
                    <div class="list-card-task" style={{"background": "rgba(0,0,0,0.15)"}}>
                      <span>Edit Calendar Settings</span>
                    </div>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
      
      <button class="lists-add-fab">
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
      </button>
    </>
  );
}

export default CalendarView;
