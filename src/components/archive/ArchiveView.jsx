import { createSignal, createMemo, For } from 'solid-js';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { format, isPast } from 'date-fns';
import EmptyState from '../ui/EmptyState';

function ArchiveView() {
  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;
  
  const [filter, setFilter] = createSignal('all'); // all, tasks, events

  const archiveItems = createMemo(() => {
    let items = [];
    
    if (filter() === 'all' || filter() === 'events') {
      const pastEvents = eventState.events.filter(e => {
        if (!e.end_time) return false;
        const d = new Date(e.end_time);
        return !isNaN(d.getTime()) && isPast(d);
      });
      items = [...items, ...pastEvents.map(e => ({ ...e, _type: 'event', _date: new Date(e.end_time) }))];
    }
    
    if (filter() === 'all' || filter() === 'tasks') {
      const completedTasks = taskState.tasks.filter(t => t.completed);
      items = [...items, ...completedTasks.map(t => {
        const d = t.updated_at ? new Date(t.updated_at) : new Date();
        const validDate = isNaN(d.getTime()) ? new Date() : d;
        return { ...t, _type: 'task', _date: validDate };
      })];
    }
    
    // Sort descending (newest first)
    return items.sort((a, b) => b._date - a._date);
  });

  const groupedArchive = createMemo(() => {
    const items = archiveItems();
    const groups = [];
    
    items.forEach(item => {
      const groupHeader = format(item._date, 'MMMM yyyy');
      let group = groups.find(g => g.header === groupHeader);
      if (!group) {
        group = { header: groupHeader, items: [] };
        groups.push(group);
      }
      group.items.push(item);
    });
    
    return groups;
  });

  return (
    <>
      <div class="h-[60px] min-h-[60px] border-b border-white/10 flex items-center justify-between px-6 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div class="text-xl font-bold text-white tracking-wide">Archive</div>
      </div>

      <div class="overflow-y-auto p-6 flex flex-col gap-6 max-w-[800px] mx-auto w-full">
        
        <div class="flex gap-2 bg-white/5 p-1 rounded-lg self-start">
          <button 
            onClick={() => setFilter('all')}
            class={`px-3 py-1.5 rounded-md border-none font-semibold cursor-pointer transition-colors ${filter() === 'all' ? 'bg-white/15 text-white' : 'bg-transparent text-text-secondary hover:text-white'}`}
          >All</button>
          <button 
            onClick={() => setFilter('events')}
            class={`px-3 py-1.5 rounded-md border-none font-semibold cursor-pointer transition-colors ${filter() === 'events' ? 'bg-white/15 text-white' : 'bg-transparent text-text-secondary hover:text-white'}`}
          >Events</button>
          <button 
            onClick={() => setFilter('tasks')}
            class={`px-3 py-1.5 rounded-md border-none font-semibold cursor-pointer transition-colors ${filter() === 'tasks' ? 'bg-white/15 text-white' : 'bg-transparent text-text-secondary hover:text-white'}`}
          >Tasks</button>
        </div>

        {groupedArchive().length === 0 ? (
          <EmptyState type="tasks" message="Your archive is empty." />
        ) : (
          <For each={groupedArchive()}>
            {(group) => (
              <div class="flex flex-col gap-3">
                <div class="text-lg font-extrabold text-white">{group.header}</div>
                <div class="flex flex-col gap-2">
                  <For each={group.items}>
                    {(item) => (
                      <div class="bg-card border border-border rounded-xl p-3.5 flex items-center justify-between transition-all opacity-70">
                        <div class="flex flex-col gap-1">
                          <div class="text-[15px] font-bold text-white/90">{item.title}</div>
                          <div class="text-xs font-semibold text-text-muted flex items-center gap-1.5">
                            {item._type === 'event' ? (
                              <span>Event • {(() => {
                                const d = new Date(item.start_time);
                                return isNaN(d.getTime()) ? 'No Date' : format(d, 'MMM d, h:mm a');
                              })()}</span>
                            ) : (
                              <span>Completed Task • {(() => {
                                const d = new Date(item._date);
                                return isNaN(d.getTime()) ? 'No Date' : format(d, 'MMM d');
                              })()}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
        )}
      </div>
    </>
  );
}

export default ArchiveView;
