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
      const pastEvents = eventState.events.filter(e => e.end_time && isPast(new Date(e.end_time)));
      items = [...items, ...pastEvents.map(e => ({ ...e, _type: 'event', _date: new Date(e.end_time) }))];
    }
    
    if (filter() === 'all' || filter() === 'tasks') {
      const completedTasks = taskState.tasks.filter(t => t.completed);
      items = [...items, ...completedTasks.map(t => ({ ...t, _type: 'task', _date: new Date(t.updated_at) }))];
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
      <div class="lists-topbar">
        <div class="lists-title">Archive</div>
      </div>

      <div class="lists-layout" style={{ "overflow-y": "auto", "padding": "24px", "display": "flex", "flex-direction": "column", "gap": "24px", "max-width": "800px", "margin": "0 auto", "width": "100%" }}>
        
        <div style={{ "display": "flex", "gap": "8px", "background": "rgba(255,255,255,0.05)", "padding": "4px", "border-radius": "8px", "align-self": "flex-start" }}>
          <button 
            onClick={() => setFilter('all')}
            style={{"padding": "6px 12px", "border-radius": "6px", "border": "none", "background": filter() === 'all' ? "rgba(255,255,255,0.15)" : "transparent", "color": filter() === 'all' ? "#fff" : "var(--text-secondary)", "font-weight": "600", "cursor": "pointer"}}
          >All</button>
          <button 
            onClick={() => setFilter('events')}
            style={{"padding": "6px 12px", "border-radius": "6px", "border": "none", "background": filter() === 'events' ? "rgba(255,255,255,0.15)" : "transparent", "color": filter() === 'events' ? "#fff" : "var(--text-secondary)", "font-weight": "600", "cursor": "pointer"}}
          >Events</button>
          <button 
            onClick={() => setFilter('tasks')}
            style={{"padding": "6px 12px", "border-radius": "6px", "border": "none", "background": filter() === 'tasks' ? "rgba(255,255,255,0.15)" : "transparent", "color": filter() === 'tasks' ? "#fff" : "var(--text-secondary)", "font-weight": "600", "cursor": "pointer"}}
          >Tasks</button>
        </div>

        {groupedArchive().length === 0 ? (
          <EmptyState type="tasks" message="Your archive is empty." />
        ) : (
          <For each={groupedArchive()}>
            {(group) => (
              <div style={{"display": "flex", "flex-direction": "column", "gap": "12px"}}>
                <div style={{"font-size": "18px", "font-weight": "800", "color": "#fff"}}>{group.header}</div>
                <div style={{"display": "flex", "flex-direction": "column", "gap": "8px"}}>
                  <For each={group.items}>
                    {(item) => (
                      <div class="event-card" style={{ "--cal-color": item._type === 'event' ? '#E8942A' : '#6B5BDB', "opacity": "0.7", "background": "var(--card)", "border": "1px solid var(--border)", "cursor": "default" }}>
                        <div class="event-card-body">
                          <div class="event-card-title">{item.title}</div>
                          <div class="event-card-meta">
                            {item._type === 'event' ? (
                              <span>Event • {format(new Date(item.start_time), 'MMM d, h:mm a')}</span>
                            ) : (
                              <span>Completed Task • {format(item._date, 'MMM d')}</span>
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
