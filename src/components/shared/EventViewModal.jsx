import { createMemo, Show } from 'solid-js';
import Modal from '../ui/Modal';
import { uiStore } from '../../stores/uiStore';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { format, parseISO } from 'date-fns';

function EventViewModal() {
  const { state: uiState } = uiStore;
  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;

  const item = createMemo(() => {
    if (uiState.activeEventType === 'event') {
      const ev = eventState.events.find(e => e.id === uiState.activeEventId);
      if (!ev) return null;
      const calendar = eventState.calendars.find(c => c.id === ev.calendarId);
      return { ...ev, color: calendar?.color || '#E8942A', calName: calendar?.name || 'Default' };
    } else if (uiState.activeEventType === 'task') {
      const task = taskState.tasks.find(t => t.id === uiState.activeEventId);
      if (!task) return null;
      const list = taskState.lists.find(l => l.id === task.listId);
      return { ...task, color: list?.color || '#6B5BDB', listName: list?.name || 'Tasks' };
    }
    return null;
  });

  const handleDelete = () => {
    if (uiState.activeEventType === 'event') {
      eventStore.deleteEvent(uiState.activeEventId);
    } else {
      taskStore.deleteTask(uiState.activeEventId);
    }
    uiStore.setActiveModal(null);
  };

  const handleEdit = () => {
    // For now, close modal. Could map to AddItemModal with populated data later.
    alert("Edit functionality coming soon!");
  };

  return (
    <Modal id="viewEvent" compact>
      <Show when={item()}>
        {(i) => {
          const type = uiState.activeEventType;
          return (
            <div class="flex flex-col p-2">
              <div class="flex items-center gap-3 mb-6">
                <div class="w-4 h-4 rounded-full shadow-sm" style={{ background: i().color }} />
                <span class="text-xs font-bold uppercase tracking-wider text-text-muted">
                  {type === 'event' ? i().calName : i().listName}
                </span>
              </div>
              
              <h2 class="text-3xl font-extrabold text-text-primary leading-tight mb-6">
                {i().title} {i().rrule && '🔄'}
              </h2>
              
              <div class="flex flex-col gap-5 text-[15px] text-text-secondary">
                <Show when={type === 'event'}>
                  <div class="flex items-start gap-4">
                    <svg class="w-5 h-5 text-text-muted mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                    <div class="flex flex-col">
                      <span class="font-semibold text-text-primary">
                        {(() => {
                          const start = parseISO(i().start_time);
                          return !isNaN(start.getTime()) ? format(start, 'EEEE, MMMM d, yyyy') : '';
                        })()}
                      </span>
                      <span>
                        {(() => {
                          const start = parseISO(i().start_time);
                          const end = parseISO(i().end_time);
                          if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
                          return `${format(start, 'h:mm a')} - ${format(end, 'h:mm a')}`;
                        })()}
                      </span>
                    </div>
                  </div>
                </Show>

                <Show when={type === 'task'}>
                  <div class="flex items-start gap-4">
                    <svg class="w-5 h-5 text-text-muted mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                    <div class="flex flex-col">
                      <Show when={i().scheduled_date} fallback={<span class="font-semibold text-text-primary">No due date</span>}>
                        <span class="font-semibold text-text-primary">
                          {(() => {
                            const d = parseISO(i().scheduled_date);
                            return !isNaN(d.getTime()) ? format(d, 'EEEE, MMMM d, yyyy') : '';
                          })()}
                        </span>
                        <Show when={!i().allDay}>
                          <span>
                            {(() => {
                              const d = parseISO(i().scheduled_date);
                              return !isNaN(d.getTime()) ? format(d, 'h:mm a') : '';
                            })()}
                          </span>
                        </Show>
                      </Show>
                    </div>
                  </div>
                  
                  <div class="flex items-start gap-4">
                    <svg class="w-5 h-5 text-text-muted mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                    <div class="flex flex-col">
                      <span class="font-semibold text-text-primary capitalize">{i().priority} Priority</span>
                    </div>
                  </div>
                </Show>

                <Show when={i().description}>
                  <div class="flex items-start gap-4 mt-2">
                    <svg class="w-5 h-5 text-text-muted mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"></path></svg>
                    <div class="flex flex-col w-full text-text-primary/90 whitespace-pre-wrap leading-relaxed">
                      {i().description}
                    </div>
                  </div>
                </Show>
              </div>

              <div class="flex items-center gap-3 mt-10 pt-4 border-t border-border-theme">
                <button 
                  onClick={handleEdit}
                  class="flex-1 bg-text-primary/5 hover:bg-text-primary/10 text-text-primary border-none p-3 rounded-xl text-[14px] font-bold cursor-pointer transition-colors"
                >
                  Edit
                </button>
                <button 
                  onClick={() => { if(confirm('Delete this item?')) handleDelete(); }}
                  class="flex-1 bg-red-500/10 hover:bg-red-500/20 text-[#ff4d4f] border-none p-3 rounded-xl text-[14px] font-bold cursor-pointer transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        }}
      </Show>
    </Modal>
  );
}

export default EventViewModal;
