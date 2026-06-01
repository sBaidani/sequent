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
  });

  return (
    <div class={`w-full h-full flex ${uiState.theme}`}>
      <Show when={uiState.sidebarOpen}>
        <Sidebar />
      </Show>
      
      <div id="main-content" class="flex-1 h-screen flex flex-col relative overflow-hidden bg-bg-theme text-text-primary">
        <div ref={viewContainerRef} class="flex-1 flex flex-col overflow-hidden h-full">
          {uiState.view === 'timeline' && <TimelineView />}
          {uiState.view === 'calendar' && <CalendarView />}
          {uiState.view === 'tasks' && <TasksView />}
          {uiState.view === 'archive' && <ArchiveView />}
          {uiState.view === 'settings' && <SettingsView />}
        </div>
      </div>
      
      {!uiState.hasSeenOnboarding && <OnboardingModal />}
      <AddItemModal />
      <AddCalendarModal />
      <ToastProvider />
    </div>
  );
}

export default App;
