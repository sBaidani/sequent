import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { uiStore } from '../../stores/uiStore';
import { eventStore } from '../../stores/eventStore';
import SidebarHeatmap from './SidebarHeatmap';

function Sidebar() {
  const { state: uiState, setView } = uiStore;
  const { state: eventState } = eventStore;
  const [deferredPrompt, setDeferredPrompt] = createSignal(null);
  const [calendarsExpanded, setCalendarsExpanded] = createSignal(true);

  onMount(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    onCleanup(() => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    });
  });

  const handleInstallClick = async () => {
    const promptEvent = deferredPrompt();
    if (promptEvent) {
      promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  const themes = [
    { name: 'Amber', color: '#E8942A' },
    { name: 'Rose', color: '#C0185A' },
    { name: 'Teal', color: '#1FA7A7' },
    { name: 'Purple', color: '#6B5BDB' },
    { name: 'Blue', color: '#3B6ED6' }
  ];

  return (
    <aside class="sidebar">
      <div class="sidebar-logo">
        <div class="logo-mark">S</div>
        <div style={{ "display": "flex", "flex-direction": "column" }}>
          <div class="logo-text">Sequent</div>
          <div style={{ "display": "flex", "align-items": "center", "gap": "6px", "margin-top": "2px" }}>
            <div style={{ "width": "8px", "height": "8px", "border-radius": "50%", "background-color": uiState.isOnline ? "#52c41a" : "#ff4d4f" }}></div>
            <span style={{ "font-size": "10px", "color": "var(--text-muted)", "font-weight": "700", "text-transform": "uppercase", "letter-spacing": "0.05em" }}>
              {uiState.isOnline ? "Cloud" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      <SidebarHeatmap />

      <nav class="sidebar-nav">
        <button class={`nav-item ${uiState.view === 'timeline' ? 'active' : ''}`} onClick={() => setView('timeline')}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Timeline
        </button>
        <button class={`nav-item ${uiState.view === 'tasks' ? 'active' : ''}`} onClick={() => setView('tasks')}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
          Tasks
        </button>
        <button class={`nav-item ${uiState.view === 'archive' ? 'active' : ''}`} onClick={() => setView('archive')}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
          Archive
        </button>
      </nav>

      <div class="sidebar-calendars" style={{ "padding": "0 12px", "margin-top": "20px" }}>
        <button class="accordion-header" onClick={() => setCalendarsExpanded(!calendarsExpanded())}>
          <span>My Calendars</span>
          <svg 
            fill="none" stroke="currentColor" viewBox="0 0 24 24" 
            style={{ width: "16px", height: "16px", transform: calendarsExpanded() ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}
          >
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </button>
        
        <div class="accordion-content" style={{ "max-height": calendarsExpanded() ? "500px" : "0px", "opacity": calendarsExpanded() ? "1" : "0", "transition": "all 0.3s ease" }}>
          <div style={{ "display": "flex", "flex-direction": "column", "gap": "2px", "padding-top": "8px" }}>
            {eventState.calendars.map(cal => (
              <button class="cal-list-item">
                <span class="cal-color-dot" style={{ "background-color": cal.color }}></span>
                {cal.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div class="sidebar-footer">
        <div class="theme-section">
          <div class="theme-label">Theme</div>
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
        
        <button class="sidebar-btn" onClick={() => setView('settings')}>
          <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          Settings
        </button>

        {deferredPrompt() && (
          <button class="sidebar-btn" onClick={handleInstallClick} style={{ "margin-top": "8px" }}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Install App
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
