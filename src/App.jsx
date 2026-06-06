import { createEffect, onMount, Show } from 'solid-js';
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
import AddListModal from './components/tasks/AddListModal';
import EventViewModal from './components/shared/EventViewModal';
import ToastProvider from './components/ui/ToastProvider';
import { uiStore } from './stores/uiStore';
import { syncEngine } from './stores/syncEngine';

import { Transition } from 'solid-transition-group';

function App() {
  const { state: uiState } = uiStore;
  
  onMount(() => {
    syncEngine.hydrate();
    syncEngine.subscribe();
    syncEngine.startPeriodicCloudSync();
  });

  return (
    <div class="w-full h-full flex bg-black relative overflow-hidden">
      {/* Aurora Glow Orbs for Glassmorphism (Dynamic to Theme) */}
      <div class="absolute top-[-5%] left-[-5%] w-[400px] h-[400px] bg-[rgba(var(--accent-rgb),0.25)] rounded-full blur-[100px] pointer-events-none" />
      <div class="absolute top-[35%] left-[-10%] w-[350px] h-[350px] bg-[rgba(var(--secondary-rgb),0.2)] rounded-full blur-[100px] pointer-events-none" />
      <div class="absolute bottom-[-10%] left-[0%] w-[500px] h-[500px] bg-[rgba(var(--accent-rgb),0.25)] rounded-full blur-[120px] pointer-events-none" />

      <Sidebar />
      
      {/* Click overlay for closing sidebar on mobile viewports */}
      <Show when={uiState.sidebarOpen}>
        <div 
          onClick={() => uiStore.toggleSidebar()} 
          class="fixed inset-0 bg-bg-theme/40 backdrop-blur-sm z-[90] lg:hidden"
        />
      </Show>
      
      <div id="main-content" class="flex-1 h-[calc(100vh-16px)] my-2 mx-2 lg:ml-0 rounded-[32px] flex flex-col relative overflow-hidden bg-bg-theme text-text-primary shadow-[0_0_40px_rgba(0,0,0,0.5)]">
        <div class="flex-1 flex flex-col overflow-hidden h-full relative">
          <Transition 
            onEnter={(el, done) => {
              const dir = uiState.viewDirection === 'up' ? 100 : -100;
              el.animate(
                [{ transform: `translateY(${dir}%)`, opacity: 0 }, { transform: 'translateY(0)', opacity: 1 }],
                { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
              ).onfinish = done;
            }}
            onExit={(el, done) => {
              const dir = uiState.viewDirection === 'up' ? -100 : 100;
              el.animate(
                [{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${dir}%)`, opacity: 0 }],
                { duration: 400, easing: 'cubic-bezier(0.16, 1, 0.3, 1)', fill: 'forwards' }
              ).onfinish = done;
            }}
          >
            <Show when={uiState.view === 'timeline'}><div class="flex-1 flex flex-col overflow-hidden h-full absolute inset-0"><TimelineView /></div></Show>
            <Show when={uiState.view === 'calendar'}><div class="flex-1 flex flex-col overflow-hidden h-full absolute inset-0"><CalendarView /></div></Show>
            <Show when={uiState.view === 'tasks'}><div class="flex-1 flex flex-col overflow-hidden h-full absolute inset-0"><TasksView /></div></Show>
            <Show when={uiState.view === 'archive'}><div class="flex-1 flex flex-col overflow-hidden h-full absolute inset-0"><ArchiveView /></div></Show>
            <Show when={uiState.view === 'settings'}><div class="flex-1 flex flex-col overflow-hidden h-full absolute inset-0"><SettingsView /></div></Show>
          </Transition>
        </div>
        
        {!uiState.hasSeenOnboarding && <OnboardingModal />}
        <AddItemModal />
        <AddEventModal />
        <AddTaskModal />
        <AddCalendarModal />
        <AddListModal />
        <EventViewModal />
      </div>
      
      <ToastProvider />
    </div>
  );
}

export default App;
