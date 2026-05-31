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

  createAutoAnimate(() => listsGridRef);

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
                            style={{"opacity": task.completed ? "0.5" : "1"}}
                          >
                            <div style={{"display":"flex", "flex-direction":"column"}}>
                              <span>{task.title}</span>
                              <input 
                                type="date" 
                                value={task.scheduled_date ? format(new Date(task.scheduled_date), 'yyyy-MM-dd') : ''}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    taskStore.updateTaskDate(task.id, new Date(e.target.value).toISOString());
                                  } else {
                                    // Handle clear date
                                    taskStore.updateTaskDate(task.id, null);
                                  }
                                }}
                                style={{"background":"transparent", "border":"none", "color":"rgba(255,255,255,0.5)", "font-size":"11px", "outline":"none", "margin-top":"2px", "cursor":"pointer"}}
                              />
                            </div>
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
