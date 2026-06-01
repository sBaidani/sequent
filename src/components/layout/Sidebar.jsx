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
    <aside class="w-[280px] min-w-[280px] h-screen bg-black border-r border-white/10 flex flex-col py-6 overflow-y-auto overflow-x-hidden z-[100] sidebar-transition">
      <div class="flex items-center gap-2.5 px-5 pb-6 border-b border-white/10 mb-5">
        <div class="w-8 h-8 rounded-[10px] bg-accent flex items-center justify-center font-bold text-lg text-white shadow-[0_0_15px_var(--color-accent)]">S</div>
        <div class="flex flex-col">
          <div class="font-bold text-lg text-white tracking-wide">Sequent</div>
          <div class="flex items-center gap-1.5 mt-0.5">
            <div class={`w-2 h-2 rounded-full ${uiState.isOnline ? "bg-[#52c41a]" : "bg-[#ff4d4f]"}`}></div>
            <span class="text-[10px] text-text-muted font-bold uppercase tracking-widest">
              {uiState.isOnline ? "Cloud" : "Offline"}
            </span>
          </div>
        </div>
      </div>

      <SidebarHeatmap />

      <nav class="flex flex-col gap-1 px-3 flex-1 mt-5">
        <button class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none w-full text-left ${uiState.view === 'timeline' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`} onClick={() => setView('timeline')}>
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Timeline
        </button>
        
        <div class="flex flex-col">
          <button class={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none w-full text-left ${uiState.view === 'calendar' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`} onClick={() => setView('calendar')}>
            <div class="flex items-center gap-3">
              <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
              Calendar
            </div>
            {uiState.view === 'calendar' && (
              <svg 
                onClick={(e) => { e.stopPropagation(); setCalendarsExpanded(!calendarsExpanded()); }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24" 
                class={`w-4 h-4 transition-transform duration-200 ${calendarsExpanded() ? "rotate-180" : "rotate-0"}`}
              >
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
              </svg>
            )}
          </button>
          
          <div class={`accordion-menu ${(uiState.view === 'calendar' && calendarsExpanded()) ? "open" : ""}`}>
            <div class="accordion-content">
              <div class="flex flex-col gap-0.5 pt-2 px-3 pl-9">
                {eventState.calendars.map(cal => (
                  <button class="w-full flex items-center gap-2 px-2 py-1.5 bg-transparent border-none text-text-secondary text-[13px] cursor-pointer rounded-md hover:bg-white/5 hover:text-white transition-colors text-left">
                    <span class="w-2 h-2 rounded-full" style={{ "background-color": cal.color }}></span>
                    {cal.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none w-full text-left ${uiState.view === 'tasks' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`} onClick={() => setView('tasks')}>
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
          Tasks
        </button>
        <button class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none w-full text-left ${uiState.view === 'archive' ? 'bg-accent text-white' : 'text-text-secondary hover:bg-white/5 hover:text-white'}`} onClick={() => setView('archive')}>
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
          Archive
        </button>
      </nav>



      <div class="mt-auto px-3 pt-5 border-t border-white/10 flex flex-col gap-3">
        <div class="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
          <div class="text-[11px] font-bold text-text-muted uppercase tracking-widest">Theme</div>
          <div class="flex items-center gap-2">
            {themes.map(t => (
              <button 
                class={`w-5 h-5 rounded-full cursor-pointer border-none p-0 transition-transform hover:scale-110 active:scale-95 ${uiState.theme === t.color ? 'ring-2 ring-white ring-offset-2 ring-offset-black' : ''}`}
                style={{ "background-color": t.color }}
                onClick={() => uiStore.setTheme(t.color)}
                title={t.name}
              />
            ))}
          </div>
        </div>
        
        <button class="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white/5 rounded-lg text-xs font-semibold text-text-secondary cursor-pointer transition-colors border-none hover:bg-white/10 hover:text-white" onClick={() => setView('settings')}>
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          Settings
        </button>

        {deferredPrompt() && (
          <button class="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white/5 rounded-lg text-xs font-semibold text-text-secondary cursor-pointer transition-colors border-none hover:bg-white/10 hover:text-white mt-2" onClick={handleInstallClick}>
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Install App
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
