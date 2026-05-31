import { createEffect } from 'solid-js';
import { createAutoAnimate } from '@formkit/auto-animate/solid';
import Sidebar from './components/layout/Sidebar';
import TimelineView from './components/timeline/TimelineView';
import CalendarView from './components/calendar/CalendarView';
import TasksView from './components/tasks/TasksView';
import SettingsView from './components/settings/SettingsView';
import OnboardingModal from './components/onboarding/OnboardingModal';
import AddEventModal from './components/events/AddEventModal';
import AddTaskModal from './components/tasks/AddTaskModal';
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
    <div id="app" class="theme-default" style={{ "--app-theme": uiState.theme, "display": "flex", "width": "100%", "height": "100%" }}>
      <Sidebar />
      
      <div id="main-content" class="main-content">
        <div class="view active" ref={viewContainerRef} style={{ "flex": "1", "display": "flex", "flex-direction": "column" }}>
          {uiState.view === 'timeline' && <TimelineView />}
          {uiState.view === 'calendar' && <CalendarView />}
          {uiState.view === 'tasks' && <TasksView />}
          {uiState.view === 'archive' && <div style={{"padding":"20px"}}><h2 style={{"color":"#fff"}}>Archive</h2><p style={{"color":"#888"}}>No archived items.</p></div>}
          {uiState.view === 'settings' && <SettingsView />}
        </div>
      </div>
      
      {!uiState.hasSeenOnboarding && <OnboardingModal />}
      <AddEventModal />
      <AddTaskModal />
      <AddCalendarModal />
      <ToastProvider />
    </div>
  );
}

export default App;
