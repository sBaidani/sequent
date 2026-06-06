import { createMemo, Show } from 'solid-js';
import DOMPurify from 'dompurify';
import Modal from '../ui/Modal';
import { uiStore } from '../../stores/uiStore';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { settingsStore } from '../../stores/settingsStore';
import { format, parseISO } from 'date-fns';

function EventViewModal() {
  const { state: uiState } = uiStore;
  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;
  const { state: settings } = settingsStore;

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
                <span class="font-display lowercase text-xs font-bold tracking-wider text-text-muted">
                  {type === 'event' ? i().calName : i().listName}
                </span>
              </div>
              
              <h2 class="font-display lowercase text-3xl font-extrabold text-text-primary leading-tight mb-6">
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
                      <Show when={!i().allDay}>
                        <span>
                          {(() => {
                            const start = parseISO(i().start_time);
                            const end = parseISO(i().end_time);
                            if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
                            return `${format(start, settings.use24HourClock ? 'H:mm' : 'h:mm a')} - ${format(end, settings.use24HourClock ? 'H:mm' : 'h:mm a')}`;
                          })()}
                        </span>
                      </Show>
                      <Show when={i().allDay}>
                        <span>All Day</span>
                      </Show>
                    </div>
                  </div>
                  
                  <Show when={i().location}>
                    <div class="flex items-start gap-4">
                      <svg class="w-5 h-5 text-text-muted mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                      <div class="flex flex-col">
                        <span class="text-text-primary">{i().location}</span>
                      </div>
                    </div>
                  </Show>
                  
                  <Show when={i().meeting_url}>
                    <div class="flex items-start gap-4">
                      <svg class="w-5 h-5 text-text-muted mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                      <div class="flex flex-col">
                        <a href={i().meeting_url} target="_blank" rel="noopener noreferrer" class="bg-accent text-text-primary px-3 py-1.5 rounded-lg text-sm font-semibold hover:bg-accent/80 transition-colors inline-block text-center w-max">
                          Join Meeting
                        </a>
                      </div>
                    </div>
                  </Show>
                  
                  <Show when={i().attendees && i().attendees.length > 0}>
                    <div class="flex items-start gap-4">
                      <svg class="w-5 h-5 text-text-muted mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
                      <div class="flex flex-col">
                        <span class="text-text-primary mb-1">{i().attendees.length} Attendees</span>
                        <div class="flex flex-col gap-1">
                          {i().attendees.map(a => (
                            <span class="text-sm text-text-secondary truncate max-w-[250px]" title={a.email}>
                              {a.name || a.email} {a.status === 'accepted' ? '✓' : a.status === 'declined' ? '✗' : '?'}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </Show>
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
                              return !isNaN(d.getTime()) ? format(d, settings.use24HourClock ? 'H:mm' : 'h:mm a') : '';
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
                    <div 
                      class="flex flex-col w-full text-text-primary/90 whitespace-pre-wrap leading-relaxed prose prose-invert max-w-none"
                      innerHTML={DOMPurify.sanitize(i().description, { USE_PROFILES: { html: true } })}
                    />
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
