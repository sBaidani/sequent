import { For } from 'solid-js';
import { createAutoAnimate } from '@formkit/auto-animate/solid';
import { taskStore } from '../../stores/taskStore';

function TasksView() {
  const { state: taskState, toggleTask, deleteTask } = taskStore;
  let listsBoardRef;
  
  createAutoAnimate(() => listsBoardRef);

  return (
    <div class="tasks-container">
      <div class="lists-board" ref={listsBoardRef}>
        <For each={taskState.lists}>
          {(list) => {
            const listTasks = taskState.tasks.filter(t => t.listId === list.id);
            
            return (
              <div class="task-list-panel">
                <div class="list-header" style={{ "border-left-color": list.color }}>
                  <h3>{list.name}</h3>
                  <span class="task-count">{listTasks.length}</span>
                </div>
                
                <div class="list-body">
                  {listTasks.length === 0 ? (
                    <div class="empty-state-micro">No tasks</div>
                  ) : (
                    <For each={listTasks}>
                      {(task) => (
                        <div class={`task-card ${task.completed ? 'completed' : ''}`}>
                          <button 
                            class="checkbox-btn" 
                            onClick={() => toggleTask(task.id)}
                          >
                            <div class={`checkbox-inner ${task.completed ? 'checked' : ''}`}></div>
                          </button>
                          
                          <div class="task-content">
                            <h4>{task.title}</h4>
                            {task.priority === 'urgent' && <span class="priority-icon">🔥</span>}
                          </div>
                          
                          <button class="delete-btn" onClick={() => deleteTask(task.id)}>×</button>
                        </div>
                      )}
                    </For>
                  )}
                </div>
              </div>
            );
          }}
        </For>
      </div>
    </div>
  );
}

export default TasksView;
