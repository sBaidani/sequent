import { createSignal, onMount, onCleanup, Show } from 'solid-js';
import { uiStore } from '../../stores/uiStore';
import { eventStore } from '../../stores/eventStore';
import SidebarHeatmap from './SidebarHeatmap';
import SidebarAtAGlance from './SidebarAtAGlance';

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
    <aside class={`fixed lg:relative top-0 bottom-0 left-0 h-screen bg-black border-white/10 flex flex-col py-6 overflow-y-auto overflow-x-hidden z-[100] transition-[width,min-width,max-width,transform,opacity] duration-300 ease-in-out ${uiState.sidebarOpen ? 'border-r translate-x-0 w-[280px] lg:w-[20vw] lg:min-w-[20vw] lg:max-w-[20vw]' : 'border-none -translate-x-full w-[280px] lg:translate-x-0 lg:w-0 lg:min-w-0 lg:max-w-0 lg:px-0 lg:opacity-0'}`}>
      <div class="pt-5">
        <SidebarAtAGlance />
      </div>
      <SidebarHeatmap />

      <nav class="flex flex-col gap-1 px-3 flex-1 mt-5">
        <button class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none w-full text-left ${uiState.view === 'timeline' ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`} onClick={() => setView('timeline')}>
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
          Timeline
        </button>
        
        <div class="flex flex-col">
          <button class={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none w-full text-left ${uiState.view === 'calendar' ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`} onClick={() => setView('calendar')}>
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
                  <label class="w-full flex items-center justify-between px-2 py-1.5 bg-transparent border-none text-white/70 text-[13px] cursor-pointer rounded-md hover:bg-white/5 hover:text-white transition-colors text-left group">
                     <div class="flex items-center gap-2">
                       <span class="w-2 h-2 rounded-full" style={{ "background-color": cal.color }}></span>
                       {cal.name}
                     </div>
                     <div class="relative flex items-center justify-center w-4 h-4 rounded border border-white/20 transition-colors group-hover:border-white/40" classList={{ '!bg-accent !border-accent': cal.visible !== false }}>
                       <Show when={cal.visible !== false}>
                         <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7"></path></svg>
                       </Show>
                       <input 
                         type="checkbox" 
                         class="hidden" 
                         checked={cal.visible !== false} 
                         onChange={(e) => {
                           const newCals = eventState.calendars.map(c => c.id === cal.id ? { ...c, visible: e.target.checked } : c);
                           eventStore.setCalendars(newCals);
                         }}
                       />
                     </div>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>

        <button class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none w-full text-left ${uiState.view === 'tasks' ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`} onClick={() => setView('tasks')}>
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
          Tasks
        </button>
        <button class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none w-full text-left ${uiState.view === 'archive' ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`} onClick={() => setView('archive')}>
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"></path></svg>
          Archive
        </button>
      </nav>



      <div class="mt-auto px-3 pt-5 border-t border-white/10 flex flex-col gap-3">
        <div class="flex items-center justify-between px-3 py-2 bg-white/5 rounded-lg">
          <div class="flex items-center gap-2">
            <div class="text-[11px] font-bold text-white/40 uppercase tracking-widest">Theme</div>
            <button 
              class="w-6 h-6 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white/70 hover:text-white transition-colors cursor-pointer border-none p-0"
              onClick={() => uiStore.setMode(uiState.mode === 'dark' ? 'light' : 'dark')}
              title="Toggle Light/Dark Mode"
            >
              <Show when={uiState.mode === 'dark'} fallback={
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"></path></svg>
              }>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
              </Show>
            </button>
          </div>
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
        
        <div class="flex items-center gap-2.5 px-3 py-2 bg-white/5 rounded-lg mt-1">
          <div class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-sm text-white shadow-[0_0_10px_var(--color-accent)]">S</div>
          <div class="flex flex-col flex-1">
            <div class="font-bold text-sm text-white tracking-wide">Sequent</div>
            <div class="flex items-center gap-1.5">
              <div class={`w-1.5 h-1.5 rounded-full ${uiState.isOnline ? "bg-[#52c41a]" : "bg-[#ff4d4f]"}`}></div>
              <span class="text-[9px] text-white/40 font-bold uppercase tracking-widest">
                {uiState.isOnline ? "Cloud" : "Offline"}
              </span>
            </div>
          </div>
        </div>

        <button class="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white/5 rounded-lg text-xs font-semibold text-white/70 cursor-pointer transition-colors border-none hover:bg-white/10 hover:text-white" onClick={() => setView('settings')}>
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
          Settings
        </button>

        {deferredPrompt() && (
          <button class="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white/5 rounded-lg text-xs font-semibold text-white/70 cursor-pointer transition-colors border-none hover:bg-white/10 hover:text-white mt-2" onClick={handleInstallClick}>
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
            Install App
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
