import { createEffect, onMount } from 'solid-js';
import { createAutoAnimate } from '@formkit/auto-animate/solid';
import Sidebar from './components/layout/Sidebar';
import TimelineView from './components/timeline/TimelineView';
import CalendarView from './components/calendar/CalendarView';
import TasksView from './components/tasks/TasksView';
import ArchiveView from './components/archive/ArchiveView';
import SettingsView from './components/settings/SettingsView';
import OnboardingModal from './components/onboarding/OnboardingModal';
import AddItemModal from './components/shared/AddItemModal';
import AddEventModal from './components/shared/AddEventModal';
import AddTaskModal from './components/shared/AddTaskModal';
import AddCalendarModal from './components/calendar/AddCalendarModal';
import ToastProvider from './components/ui/ToastProvider';
import { uiStore } from './stores/uiStore';
import { syncEngine } from './stores/syncEngine';

function App() {
  const { state: uiState } = uiStore;
  let viewContainerRef;
  
  createAutoAnimate(() => viewContainerRef);

  onMount(() => {
    syncEngine.hydrate();
    syncEngine.subscribe();
  });

  return (
    <div class="w-full h-full flex">
      <Sidebar />
      
      {/* Click overlay for closing sidebar on mobile viewports */}
      <Show when={uiState.sidebarOpen}>
        <div 
          onClick={() => uiStore.toggleSidebar()} 
          class="fixed inset-0 bg-black/40 backdrop-blur-sm z-[90] lg:hidden"
        />
      </Show>
      
      <div id="main-content" class="flex-1 h-screen flex flex-col relative overflow-hidden bg-bg-theme text-text-primary">
        <div ref={viewContainerRef} class="flex-1 flex flex-col overflow-hidden h-full">
          {uiState.view === 'timeline' && <div class="view-enter flex-1 flex flex-col overflow-hidden h-full"><TimelineView /></div>}
          {uiState.view === 'calendar' && <div class="view-enter flex-1 flex flex-col overflow-hidden h-full"><CalendarView /></div>}
          {uiState.view === 'tasks' && <div class="view-enter flex-1 flex flex-col overflow-hidden h-full"><TasksView /></div>}
          {uiState.view === 'archive' && <div class="view-enter flex-1 flex flex-col overflow-hidden h-full"><ArchiveView /></div>}
          {uiState.view === 'settings' && <div class="view-enter flex-1 flex flex-col overflow-hidden h-full"><SettingsView /></div>}
        </div>
      </div>
      
      {!uiState.hasSeenOnboarding && <OnboardingModal />}
      <AddItemModal />
      <AddEventModal />
      <AddTaskModal />
      <AddCalendarModal />
      <ToastProvider />
    </div>
  );
}

export default App;
