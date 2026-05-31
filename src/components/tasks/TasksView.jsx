import { For } from 'solid-js';
import { createAutoAnimate } from '@formkit/auto-animate/solid';
import { taskStore } from '../../stores/taskStore';
import { uiStore } from '../../stores/uiStore';
import EmptyState from '../ui/EmptyState';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';

function TasksView() {
  const { state: taskState, toggleTask, deleteTask } = taskStore;
  let listsGridRef;
  
  createAutoAnimate(() => listsGridRef);

  const upcomingDays = Array.from({ length: 7 }).map((_, i) => addDays(startOfDay(new Date()), i));

  return (
    <>
      <div class="lists-topbar">
        <div class="lists-title">Tasks</div>
        <div class="lists-topbar-actions">
          <button class="topbar-icon-btn" onClick={() => uiStore.setActiveModal('addTask')}>
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          </button>
        </div>
      </div>

      <div class="lists-layout">
        <div class="schedule-pane">
          <div class="schedule-pane-title">Schedule Pad</div>
          <p style={{"color":"var(--text-muted)","font-size":"12px","margin-bottom":"16px"}}>Drag tasks onto a date to schedule them.</p>
          <div style={{"display":"flex", "flex-direction":"column", "gap":"8px"}}>
            <For each={upcomingDays}>
              {(day) => {
                const dayTasks = () => taskState.tasks.filter(t => t.scheduled_date && isSameDay(new Date(t.scheduled_date), day));
                return (
                  <div 
                    class="schedule-pad-day"
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                    onDragLeave={(e) => { e.currentTarget.classList.remove('drag-over'); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('drag-over');
                      const taskId = e.dataTransfer.getData('taskId');
                      if (taskId) {
                        taskStore.updateTaskDate(taskId, day.toISOString());
                      }
                    }}
                  >
                    <div style={{"font-weight":"700", "font-size":"14px", "width":"100px", "color":"var(--text-primary)"}}>{format(day, 'EEE, MMM d')}</div>
                    <div style={{"flex":"1", "display":"flex", "flex-direction":"column", "gap":"4px"}}>
                      <For each={dayTasks()}>
                        {(t) => (
                          <div style={{"font-size":"12px", "background":"var(--card)", "padding":"4px 8px", "border-radius":"4px", "text-overflow":"ellipsis", "overflow":"hidden", "white-space":"nowrap", "border":"1px solid var(--border)"}}>{t.title}</div>
                        )}
                      </For>
                    </div>
                  </div>
                )
              }}
            </For>
          </div>
        </div>

        <div class="lists-grid" ref={listsGridRef}>
          <For each={taskState.lists}>
            {(list) => {
              const listTasks = () => taskState.tasks.filter(t => t.listId === list.id);
              
              return (
                 <div class="list-card" style={{ "background-color": list.color || '#333' }}>
                  <div class="list-card-name">{list.name}</div>
                  
                  <div class="list-card-tasks" style={{"margin-top":"12px"}}>
                    {listTasks().length === 0 ? (
                      <EmptyState type="tasks" message="Hooray! No tasks here." />
                    ) : (
                      <For each={listTasks()}>
                        {(task) => (
                          <div 
                            class="list-card-task" 
                            style={{"opacity": task.completed ? "0.5" : "1", "cursor":"grab"}}
                            draggable="true"
                            onDragStart={(e) => {
                              e.dataTransfer.setData('taskId', task.id);
                              e.currentTarget.style.opacity = '0.5';
                            }}
                            onDragEnd={(e) => {
                              e.currentTarget.style.opacity = task.completed ? '0.5' : '1';
                            }}
                          >
                            <span>{task.title}</span>
                            <div style={{"display":"flex","gap":"8px","align-items":"center"}}>
                              <input 
                                type="checkbox" 
                                checked={task.completed} 
                                onChange={() => toggleTask(task.id)}
                                style={{"cursor":"pointer"}}
                              />
                              <button onClick={() => deleteTask(task.id)} style={{"color":"#ff4d4f","font-weight":"bold"}}>×</button>
                            </div>
                          </div>
                        )}
                      </For>
                    )}
                    <button class="list-card-add" onClick={() => uiStore.setActiveModal('addTask')}>+</button>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
      
      <button class="lists-add-fab" onClick={() => uiStore.setActiveModal('addTask')}>
        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
      </button>
    </>
  );
}

export default TasksView;
