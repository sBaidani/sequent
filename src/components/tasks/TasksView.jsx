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
      <div class="h-[60px] min-h-[60px] border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div class="text-xl font-bold text-white tracking-wide">Tasks</div>
        <div class="flex items-center gap-3">
          <button class="w-9 h-9 rounded-full bg-white/5 border-none text-white flex items-center justify-center cursor-pointer transition-colors hover:bg-white/20" onClick={() => uiStore.setActiveModal('addItem')}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"></path></svg>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 relative">


        <div class="columns-[300px] gap-6 space-y-6 max-w-[1200px] mx-auto" ref={listsGridRef}>
          <For each={taskState.lists}>
            {(list) => {
              const listTasks = () => taskState.tasks.filter(t => t.listId === list.id);
              
              return (
                 <div class="break-inside-avoid rounded-xl p-4 text-white shadow-lg" style={{ "background-color": list.color || '#333' }}>
                  <div class="text-xl font-extrabold tracking-wide">{list.name}</div>
                  
                  <div class="mt-3">
                    {listTasks().length === 0 ? (
                      <EmptyState type="tasks" message="Hooray! No tasks here." />
                    ) : (
                      <For each={listTasks()}>
                        {(task) => (
                          <div 
                            class={`flex items-center justify-between py-2 border-b border-white/10 last:border-b-0 ${task.completed ? 'opacity-50' : 'opacity-100'}`}
                          >
                            <div class="flex flex-col">
                              <span class={task.completed ? "task-strike-animate text-white/40" : ""}>{task.title}</span>
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
                                class="bg-transparent border-none text-white/50 text-[11px] outline-none mt-0.5 cursor-pointer"
                              />
                            </div>
                            <div class="flex gap-2 items-center">
                              <input 
                                type="checkbox" 
                                checked={task.completed} 
                                onChange={() => toggleTask(task.id)}
                                class="task-checkbox-animate cursor-pointer"
                              />
                              <button onClick={() => deleteTask(task.id)} class="text-[#ff4d4f] font-bold bg-transparent border-none cursor-pointer">×</button>
                            </div>
                          </div>
                        )}
                      </For>
                    )}
                    <button class="w-full mt-2 py-1.5 rounded-md bg-black/20 hover:bg-black/40 border-none text-white/70 hover:text-white cursor-pointer font-bold transition-colors" onClick={() => uiStore.setActiveModal('addItem')}>+</button>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
      
      <button class="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-accent text-white border-none shadow-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 z-[100]" onClick={() => uiStore.setActiveModal('addItem')}>
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4"></path></svg>
      </button>
    </>
  );
}

export default TasksView;
