import { createMemo, For, Show, createSignal } from 'solid-js';
import { format, isSameDay } from 'date-fns';
import { taskStore } from '../../stores/taskStore';
import { expandRecurringItems } from '../../lib/recurrenceEngine';

function DayTaskListPreview(props) {
  const { state: taskState } = taskStore;
  const [collapsed, setCollapsed] = createSignal(false);

  const dayTasks = createMemo(() => {
    if (!props.date) return [];
    const dStr = props.date.includes('T') ? props.date : `${props.date}T12:00:00`;
    const d = new Date(dStr);
    if (isNaN(d.getTime())) return [];

    const expandedTasks = expandRecurringItems(taskState.tasks, d, d);
    let tasks = expandedTasks.filter(t => t.scheduled_date && isSameDay(new Date(t.scheduled_date), d)).map(t => {
      return {
        ...t,
        color: taskState.lists.find(l => l.id === t.listId)?.color || '#6B5BDB',
      };
    });

    // Add ghost task if valid
    if (props.ghostTask && props.ghostTask.title) {
      tasks.push({
        id: 'ghost-1',
        title: props.ghostTask.title || 'New Task',
        color: props.ghostTask.color || '#6B5BDB',
        isGhost: true,
        completed: false
      });
    }

    return tasks;
  });

  return (
    <div class={`flex flex-col h-full min-h-[500px] border-l border-border-theme bg-bg-theme/50 transition-all duration-300 ease-in-out ${collapsed() ? 'w-12 min-w-[48px]' : 'w-[350px] min-w-[350px]'}`}>
      
      <div class="flex items-center p-4 border-b border-border-theme gap-3">
        <button 
          onClick={() => setCollapsed(!collapsed())}
          class={`flex items-center justify-center w-6 h-6 rounded border-none bg-transparent cursor-pointer hover:bg-text-primary/10 text-text-muted hover:text-text-primary transition-colors ${collapsed() ? 'mx-auto' : ''} shrink-0`}
          title={collapsed() ? "Expand Preview" : "Collapse Preview"}
        >
          <svg class={`w-4 h-4 transition-transform duration-300 ${collapsed() ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
        </button>
        <Show when={!collapsed()}>
          <div class="flex items-center justify-between w-full min-w-0">
            <div class="text-[14px] font-bold text-text-primary tracking-wide truncate pr-2">
              {`${format(new Date(props.date.includes('T') ? props.date : props.date + 'T12:00:00'), 'eeee')} Tasks`}
            </div>
            <div class="text-[12px] font-bold text-text-muted shrink-0">
              {format(new Date(props.date.includes('T') ? props.date : props.date + 'T12:00:00'), 'MMM d')}
            </div>
          </div>
        </Show>
      </div>

      <div class={`flex-1 overflow-y-auto p-4 flex flex-col gap-2 ${collapsed() ? 'hidden' : 'block'}`}>
        <Show when={dayTasks().length === 0}>
          <div class="text-sm font-semibold text-text-muted italic py-4 text-center">No tasks scheduled for this day.</div>
        </Show>
        <For each={dayTasks()}>
          {(item) => (
            <div 
              class={`flex items-start gap-3 p-3 rounded-xl border ${item.isGhost ? 'border-dashed border-text-primary/40 bg-text-primary/5 animate-pulse' : 'border-border-theme bg-card hover:border-text-primary/20 transition-colors'}`}
              style={{ opacity: item.completed && !item.isGhost ? 0.5 : 1 }}
            >
              <div 
                class="w-5 h-5 rounded-full border-[2px] mt-0.5 flex items-center justify-center shrink-0 bg-transparent"
                style={{ "border-color": item.color }}
              >
                <Show when={item.completed && !item.isGhost}>
                  <div class="w-2.5 h-2.5 rounded-full" style={{ background: item.color }} />
                </Show>
              </div>
              <div class="flex-1 min-w-0">
                <div class={`text-[14px] font-medium text-text-primary/90 leading-tight ${item.completed && !item.isGhost ? 'line-through text-text-muted' : ''} truncate`}>
                  {item.title || 'Untitled Task'}
                </div>
              </div>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}

export default DayTaskListPreview;
