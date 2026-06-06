import { For } from 'solid-js';
import { createAutoAnimate } from '@formkit/auto-animate/solid';
import { taskStore } from '../../stores/taskStore';
import { uiStore } from '../../stores/uiStore';
import EmptyState from '../ui/EmptyState';
import { format, addDays, startOfDay, isSameDay } from 'date-fns';
import DatePicker from '../shared/DatePicker';
import { Circle, CheckCircle2, Pencil } from 'lucide-solid';

const getContrastText = (hexcolor) => {
  if (!hexcolor) return '#ffffff';
  let hex = hexcolor.replace("#", "");
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
  return (yiq >= 128) ? '#000000' : '#ffffff';
};

function TasksView() {
  const { state: taskState, toggleTask, deleteTask } = taskStore;
  let listsGridRef;
  
  createAutoAnimate(() => listsGridRef);

  createAutoAnimate(() => listsGridRef);

  return (
    <>
      <div class="h-[60px] min-h-[60px] border-b border-border-theme flex items-center justify-between px-6 bg-bg-theme/40 backdrop-blur-md sticky top-0 z-50">
        <div class="flex items-center gap-4">
          <button 
            onClick={() => uiStore.toggleSidebar()}
            class="flex w-9 h-9 rounded-full bg-text-primary/5 border-none text-text-primary items-center justify-center cursor-pointer transition-colors hover:bg-text-primary/20"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <div class="font-display lowercase text-xl font-bold text-text-primary tracking-wide">Tasks</div>
        </div>
        <div class="flex items-center gap-3">
          <button class="w-9 h-9 rounded-full bg-text-primary/5 border-none text-text-primary flex items-center justify-center cursor-pointer transition-colors hover:bg-text-primary/20" onClick={() => { uiStore.setActiveListId(''); uiStore.setActiveModal('addTask'); }}>
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" /></svg>
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 relative">


        <div class="columns-[300px] gap-6 space-y-6 max-w-[1200px] mx-auto" ref={listsGridRef}>
          <For each={taskState.lists}>
            {(list) => {
              const listTasks = () => taskState.tasks.filter(t => t.listId === list.id);
              
              const textColor = getContrastText(list.color || '#333333');
              return (
                 <div class="break-inside-avoid rounded-xl p-4 shadow-lg" style={{ "background-color": list.color || '#333', "color": textColor }}>
                  <div class="font-display lowercase text-xl font-extrabold tracking-wide">{list.name}</div>
                  
                  <div class="mt-3">
                    {listTasks().length === 0 ? (
                      <EmptyState type="tasks" message="Hooray! No tasks here." />
                    ) : (
                      <For each={listTasks()}>
                        {(task) => (
                          <div 
                            class={`group flex items-center justify-between py-2 border-b border-border-theme/20 last:border-b-0 ${task.completed ? 'opacity-50' : 'opacity-100'} hover:bg-black/5 rounded-lg px-2 -mx-2 transition-colors`}
                          >
                            <div class="flex flex-col flex-1 min-w-0 pr-2">
                              <span class={`truncate font-medium ${task.completed ? "task-strike-animate opacity-60" : ""}`}>{task.title}</span>
                              <DatePicker 
                                value={task.scheduled_date ? format(new Date(task.scheduled_date), 'yyyy-MM-dd') : ''}
                                onChange={(v) => {
                                  if (v) {
                                    taskStore.updateTaskDate(task.id, new Date(v).toISOString());
                                  } else {
                                    taskStore.updateTaskDate(task.id, null);
                                  }
                                }}
                                class="bg-transparent border-none text-[11px] outline-none mt-0.5 cursor-pointer flex items-center gap-1 p-0 opacity-70 hover:opacity-100"
                                style={{ color: "currentColor" }}
                              />
                            </div>
                            <div class="flex gap-2 items-center shrink-0">
                              <button 
                                onClick={() => {
                                  uiStore.setActiveEvent(task.id, 'task');
                                }}
                                class="bg-transparent border-none cursor-pointer p-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-250 flex items-center justify-center mr-1"
                                style={{ color: "currentColor" }}
                              >
                                <Pencil class="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
                              </button>
                              <button onClick={() => toggleTask(task.id)} class="bg-transparent border-none cursor-pointer p-0 transition-colors" style={{ color: "currentColor" }}>
                                {task.completed ? <CheckCircle2 class="w-4 h-4 opacity-80" /> : <Circle class="w-4 h-4 opacity-80 hover:opacity-100" />}
                              </button>
                              <button onClick={() => deleteTask(task.id)} class="font-display lowercase text-xl font-bold bg-transparent border-none cursor-pointer opacity-30 hover:opacity-100 transition-opacity" style={{ color: "currentColor" }}>×</button>
                            </div>
                          </div>
                        )}
                      </For>
                    )}
                    <button class="w-full mt-2 py-1.5 rounded-md bg-black/10 hover:bg-black/20 border-none cursor-pointer font-bold transition-colors" style={{ color: "currentColor" }} onClick={() => { uiStore.setActiveListId(list.id); uiStore.setActiveModal('addTask'); }}>+</button>
                  </div>
                </div>
              );
            }}
          </For>
        </div>
      </div>
      
      <button class="fixed bottom-8 right-8 w-14 h-14 rounded-full bg-accent text-text-primary border-none shadow-xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 active:scale-95 z-[100]" onClick={() => { uiStore.setActiveListId(''); uiStore.setActiveModal('addTask'); }}>
        <svg class="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" /></svg>
      </button>
    </>
  );
}

export default TasksView;
