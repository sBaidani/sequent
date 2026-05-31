import { createSignal, createEffect } from 'solid-js';
import { createAutoAnimate } from '@formkit/auto-animate/solid';
import Sidebar from './components/layout/Sidebar';
import TimelineView from './components/timeline/TimelineView';
import CalendarView from './components/calendar/CalendarView';
import TasksView from './components/tasks/TasksView';
import { uiStore } from './stores/uiStore';

function App() {
  const [view, setView] = createSignal('timeline');
  let viewContainerRef;
  
  createAutoAnimate(() => viewContainerRef);

  return (
    <div id="app" class="theme-default" style={{ "--app-theme": uiStore.state.theme }}>
      <Sidebar />
      
      <div id="main-content" class="main-content">
        <div id="topbar">
          <h2>Sequent</h2>
        </div>
        
        <div class="view-container" ref={viewContainerRef}>
          {view() === 'timeline' && <TimelineView />}
          {view() === 'calendar' && <CalendarView />}
          {view() === 'tasks' && <TasksView />}
        </div>
      </div>
    </div>
  );
}

export default App;
