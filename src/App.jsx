import { onMount, Switch, Match, Show } from 'solid-js';
import { AppShell } from './components/kit';
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
import AddListModal from './components/tasks/AddListModal';
import EventViewModal from './components/shared/EventViewModal';
import ToastProvider from './components/ui/ToastProvider';
import { uiStore } from './stores/uiStore';
import { syncEngine } from './stores/syncEngine';

// Each view fills the content region; no directional slide animation (retired
// in Phase 3 — the store's viewDirection field is kept for contract stability
// but intentionally unused).
const VIEW_WRAPPER_CLASS = 'flex h-full min-h-0 flex-1 flex-col overflow-hidden';

function App() {
  const { state: uiState } = uiStore;

  onMount(() => {
    syncEngine.hydrate();
    syncEngine.subscribe();
    syncEngine.startPeriodicCloudSync();
  });

  return (
    <>
      <AppShell
        sideNav={<Sidebar />}
        sideNavOpen={uiState.sidebarOpen}
        onSideNavClose={() => uiStore.toggleSidebar()}
        contentId="main-content"
      >
        <Switch>
          <Match when={uiState.view === 'timeline'}>
            <div class={VIEW_WRAPPER_CLASS}><TimelineView /></div>
          </Match>
          <Match when={uiState.view === 'calendar'}>
            <div class={VIEW_WRAPPER_CLASS}><CalendarView /></div>
          </Match>
          <Match when={uiState.view === 'tasks'}>
            <div class={VIEW_WRAPPER_CLASS}><TasksView /></div>
          </Match>
          <Match when={uiState.view === 'archive'}>
            <div class={VIEW_WRAPPER_CLASS}><ArchiveView /></div>
          </Match>
          <Match when={uiState.view === 'settings'}>
            <div class={VIEW_WRAPPER_CLASS}><SettingsView /></div>
          </Match>
        </Switch>

        <Show when={!uiState.hasSeenOnboarding}>
          <OnboardingModal />
        </Show>
        <AddItemModal />
        <AddEventModal />
        <AddTaskModal />
        <AddCalendarModal />
        <AddListModal />
        <EventViewModal />
      </AppShell>

      <ToastProvider />
    </>
  );
}

export default App;
