import { createSignal, onMount, onCleanup, Show, createEffect, For } from 'solid-js';
import { Portal } from 'solid-js/web';
import { uiStore } from '../../stores/uiStore';
import { eventStore } from '../../stores/eventStore';
import SidebarHeatmap from './SidebarHeatmap';
import SidebarAtAGlance from './SidebarAtAGlance';
import PomodoroWidget from './PomodoroWidget';

function Sidebar() {
  const { state: uiState, setView } = uiStore;
  const { state: eventState } = eventStore;
  const [deferredPrompt, setDeferredPrompt] = createSignal(null);
  const [calendarsExpanded, setCalendarsExpanded] = createSignal(false);
  
  let calendarBtnRef;
  const [menuPos, setMenuPos] = createSignal({ top: 0, left: 0 });

  const updateMenuPos = () => {
    if (calendarBtnRef && calendarsExpanded()) {
      const rect = calendarBtnRef.getBoundingClientRect();
      setMenuPos({ top: rect.top, left: rect.right + 12 });
    }
  };

  createEffect(() => {
    if (calendarsExpanded()) {
      updateMenuPos();
      window.addEventListener('resize', updateMenuPos);
      const sidebarContainer = calendarBtnRef?.closest('.overflow-y-auto');
      if (sidebarContainer) {
        sidebarContainer.addEventListener('scroll', updateMenuPos);
      }
      onCleanup(() => {
        window.removeEventListener('resize', updateMenuPos);
        if (sidebarContainer) {
          sidebarContainer.removeEventListener('scroll', updateMenuPos);
        }
      });
    }
  });

  const navigateTo = (view) => {
    uiStore.setView(view);
    uiStore.setActiveModal(null);
  };

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
    <aside class={`fixed lg:relative top-0 bottom-0 left-0 h-screen glass-sidebar border-white/10 flex flex-col py-6 z-[100] transition-[width,min-width,max-width,transform,opacity] duration-300 ease-in-out ${uiState.sidebarOpen ? 'border-r translate-x-0 w-[280px] lg:w-[20vw] lg:min-w-[20vw] lg:max-w-[20vw]' : 'border-none -translate-x-full w-[280px] lg:translate-x-0 lg:w-0 lg:min-w-0 lg:max-w-0 lg:px-0 lg:opacity-0'}`}>
      <div class="flex flex-col h-full overflow-y-auto overflow-x-visible">
        <div class="pt-5">
        <SidebarAtAGlance />
      </div>
      <SidebarHeatmap />
      <div class="px-3 mt-4">
        <PomodoroWidget />
      </div>

      <div class="flex-1" />

      <nav class="flex flex-col gap-1 px-3 mt-5">
        <button class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none w-full text-left ${uiState.view === 'timeline' ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`} onClick={() => navigateTo('timeline')}>
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          Timeline
        </button>
        
        <div class="flex flex-col relative group">
          <button ref={calendarBtnRef} class={`flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none w-full text-left ${uiState.view === 'calendar' ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`} onClick={() => navigateTo('calendar')}>
            <div class="flex items-center gap-3">
              <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
              Calendar
            </div>
            {uiState.view === 'calendar' && (
              <div 
                onClick={(e) => { e.stopPropagation(); setCalendarsExpanded(!calendarsExpanded()); }}
                class="w-6 h-6 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors"
              >
                <svg 
                  fill="none" stroke="currentColor" viewBox="0 0 24 24" 
                  class={`w-4 h-4 transition-transform duration-200 ${calendarsExpanded() ? "rotate-180" : "rotate-0"}`}
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            )}
          </button>
          
          <Portal>
            <div 
              class={`fixed w-[240px] bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl transition-all duration-300 origin-left z-[1000] overflow-hidden ${calendarsExpanded() && uiState.view === 'calendar' ? 'opacity-100 scale-100 translate-x-0' : 'opacity-0 scale-95 -translate-x-4 pointer-events-none'}`}
              style={{ top: `${menuPos().top}px`, left: `${menuPos().left}px` }}
            >
              <div class="max-h-[300px] overflow-y-auto p-2 flex flex-col gap-1">
                <For each={eventState.calendars}>{cal => (
                  <label class="w-full flex items-center justify-between px-2 py-1.5 bg-transparent border-none text-white/70 text-[13px] cursor-pointer rounded-md hover:bg-white/5 hover:text-white transition-colors text-left group/cal">
                     <div class="flex items-center gap-2">
                       <span class="w-2 h-2 rounded-full" style={{ "background-color": cal.color }} />
                       {cal.name}
                     </div>
                     <div class="relative flex items-center justify-center w-4 h-4 rounded border border-white/20 transition-colors group-hover/cal:border-white/40" classList={{ '!bg-accent !border-accent': cal.visible !== false }}>
                       <Show when={cal.visible !== false}>
                         <svg class="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M5 13l4 4L19 7" /></svg>
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
                )}</For>
              </div>
            </div>
          </Portal>
        </div>

        <button class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none w-full text-left ${uiState.view === 'tasks' ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`} onClick={() => navigateTo('tasks')}>
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
          Tasks
        </button>
        <button class={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-colors border-none w-full text-left ${uiState.view === 'archive' ? 'bg-accent text-white' : 'text-white/70 hover:bg-white/5 hover:text-white'}`} onClick={() => navigateTo('archive')}>
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" /></svg>
          Archive
        </button>
      </nav>

      <div class="mt-4 px-3 pt-5 border-t border-white/5 flex flex-col gap-3">
        <div class="flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-accent flex items-center justify-center font-bold text-sm text-white shadow-[0_0_10px_var(--color-accent)]">S</div>
          <div class="flex flex-col flex-1">
            <div class="font-bold text-sm text-white tracking-wide">Sequent</div>
            <div class="flex items-center gap-1.5">
              <div class={`w-1.5 h-1.5 rounded-full ${uiState.isOnline ? "bg-[#52c41a]" : "bg-[#ff4d4f]"}`} />
              <span class="font-display lowercase text-[9px] text-white/40 font-bold tracking-widest">
                {uiState.isOnline ? "Cloud" : "Offline"}
              </span>
            </div>
          </div>
        </div>
        <button class="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white/5 rounded-lg text-xs font-semibold text-white/70 cursor-pointer transition-colors border-none hover:bg-white/10 hover:text-white" onClick={() => navigateTo('settings')}>
          <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          Settings
        </button>

        {deferredPrompt() && (
          <button class="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-white/5 rounded-lg text-xs font-semibold text-white/70 cursor-pointer transition-colors border-none hover:bg-white/10 hover:text-white mt-2" onClick={handleInstallClick}>
            <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Install App
          </button>
        )}
      </div>
      </div>
    </aside>
  );
}

export default Sidebar;
