import { createSignal } from 'solid-js';
import { uiStore } from '../../stores/uiStore';
import { eventStore } from '../../stores/eventStore';

function Sidebar() {
  const { state: uiState, setView, toggleSidebar } = uiStore;
  const { state: eventState } = eventStore;

  const themes = [
    { name: 'Amber', color: '#E8942A' },
    { name: 'Crimson', color: '#C0185A' },
    { name: 'Teal', color: '#1FA7A7' },
    { name: 'Purple', color: '#6B5BDB' },
    { name: 'Blue', color: '#3B6ED6' }
  ];

  return (
    <aside class={`sidebar ${uiState.sidebarOpen ? 'open' : 'closed'}`}>
      <div class="sidebar-header">
        <div class="app-brand">
          <div class="brand-icon" style={{ "background-color": uiState.theme }}>S</div>
          <h2>Sequent</h2>
        </div>
      </div>

      <nav class="sidebar-nav">
        <ul>
          <li class={uiState.view === 'timeline' ? 'active' : ''} onClick={() => setView('timeline')}>
            <span>Timeline</span>
          </li>
          <li class={uiState.view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>
            <span>Calendars</span>
          </li>
          <li class={uiState.view === 'tasks' ? 'active' : ''} onClick={() => setView('tasks')}>
            <span>Tasks</span>
          </li>
          <li class={uiState.view === 'archive' ? 'active' : ''} onClick={() => setView('archive')}>
            <span>Archive</span>
          </li>
        </ul>
      </nav>

      <div class="sidebar-calendars">
        <h3>My Calendars</h3>
        <ul class="calendar-list">
          {eventState.calendars.map(cal => (
            <li class="calendar-item">
              <span class="cal-color" style={{ "background-color": cal.color }}></span>
              <span class="cal-name">{cal.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <div class="sidebar-footer">
        <div class="theme-selector">
          <p>THEME</p>
          <div class="theme-swatches">
            {themes.map(t => (
              <button 
                class={`swatch ${uiState.theme === t.color ? 'active' : ''}`}
                style={{ "background-color": t.color }}
                onClick={() => uiStore.setTheme(t.color)}
                title={t.name}
              />
            ))}
          </div>
        </div>
        <div class="settings-btn" onClick={() => uiStore.setView('settings')}>
          <span>Settings</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
