import { createMemo, Show, For } from 'solid-js';
import DOMPurify from 'dompurify';
import {
  Dialog, DialogHeader, DialogBody, DialogFooter, Text, Token, StatusDot, Button,
} from '../kit';
import { uiStore } from '../../stores/uiStore';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { settingsStore } from '../../stores/settingsStore';
import { format, parseISO } from 'date-fns';

// Task priority → Token hue (enumerated state).
const PRIORITY_TOKEN_COLOR = { low: 'teal', normal: 'gray', high: 'red' };

// Attendee RSVP → StatusDot variant + label.
const ATTENDEE_STATUS = {
  accepted: { variant: 'success', label: 'Accepted' },
  declined: { variant: 'error', label: 'Declined' },
};

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

  const detailRow = (icon, children) => (
    <div class="flex items-start gap-4">
      <span aria-hidden="true" class="mt-0.5 shrink-0 text-disabled">{icon}</span>
      <div class="flex min-w-0 flex-1 flex-col">{children}</div>
    </div>
  );

  return (
    <Dialog
      open={uiState.activeModal === 'viewEvent'}
      onClose={() => uiStore.setActiveModal(null)}
      size="sm"
    >
      <Show when={item()}>
        {(i) => {
          const type = uiState.activeEventType;
          return (
            <>
              <DialogHeader title={i().title} />
              <DialogBody class="flex flex-col gap-5">
                <div class="flex flex-wrap items-center gap-2">
                  {/* Per-item user color rendered through Token's customColor
                      escape hatch (snap to colorTokens.js once it lands). */}
                  <Token
                    label={type === 'event' ? i().calName : i().listName}
                    customColor={i().color}
                  />
                  <Show when={i().rrule}>
                    <Token label="Repeats" color="default" />
                  </Show>
                  <Show when={type === 'task'}>
                    <Token
                      label={`${(i().priority || 'normal').charAt(0).toUpperCase()}${(i().priority || 'normal').slice(1)} priority`}
                      color={PRIORITY_TOKEN_COLOR[i().priority] || 'gray'}
                    />
                  </Show>
                </div>

                <div class="flex flex-col gap-5">
                  <Show when={type === 'event'}>
                    {detailRow(
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>,
                      <>
                        <Text weight="semibold">
                          {(() => {
                            const start = parseISO(i().start_time);
                            return !isNaN(start.getTime()) ? format(start, 'EEEE, MMMM d, yyyy') : '';
                          })()}
                        </Text>
                        <Show when={!i().allDay}>
                          <Text color="secondary">
                            {(() => {
                              const start = parseISO(i().start_time);
                              const end = parseISO(i().end_time);
                              if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
                              return `${format(start, settings.use24HourClock ? 'H:mm' : 'h:mm a')} - ${format(end, settings.use24HourClock ? 'H:mm' : 'h:mm a')}`;
                            })()}
                          </Text>
                        </Show>
                        <Show when={i().allDay}>
                          <Text color="secondary">All Day</Text>
                        </Show>
                      </>
                    )}

                    <Show when={i().location}>
                      {detailRow(
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
                        <Text>{i().location}</Text>
                      )}
                    </Show>

                    <Show when={i().meeting_url}>
                      {detailRow(
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" /></svg>,
                        <a
                          href={i().meeting_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-block w-max rounded-md bg-accent-bg px-3 py-1.5 text-sm font-semibold text-on-accent transition-colors hover:[background-image:linear-gradient(var(--color-overlay-hover),var(--color-overlay-hover))] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)"
                        >
                          Join Meeting
                        </a>
                      )}
                    </Show>

                    <Show when={i().attendees && i().attendees.length > 0}>
                      {detailRow(
                        <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>,
                        <>
                          <Text weight="semibold" class="mb-1">{`${i().attendees.length} Attendees`}</Text>
                          <div class="flex flex-col gap-1">
                            <For each={i().attendees}>{a => {
                              const status = ATTENDEE_STATUS[a.status] || { variant: 'neutral', label: 'No reply' };
                              return (
                                <span class="flex max-w-[250px] items-center gap-2" title={a.email}>
                                  <StatusDot variant={status.variant} label={status.label} tooltip={status.label} />
                                  <Text type="supporting" maxLines={1} class="min-w-0 flex-1">
                                    {a.name || a.email}
                                  </Text>
                                </span>
                              );
                            }}</For>
                          </div>
                        </>
                      )}
                    </Show>
                  </Show>

                  <Show when={type === 'task'}>
                    {detailRow(
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>,
                      <Show when={i().scheduled_date} fallback={<Text weight="semibold">No due date</Text>}>
                        <Text weight="semibold">
                          {(() => {
                            const d = parseISO(i().scheduled_date);
                            return !isNaN(d.getTime()) ? format(d, 'EEEE, MMMM d, yyyy') : '';
                          })()}
                        </Text>
                        <Show when={!i().allDay}>
                          <Text color="secondary">
                            {(() => {
                              const d = parseISO(i().scheduled_date);
                              return !isNaN(d.getTime()) ? format(d, settings.use24HourClock ? 'H:mm' : 'h:mm a') : '';
                            })()}
                          </Text>
                        </Show>
                      </Show>
                    )}
                  </Show>

                  <Show when={i().description}>
                    {detailRow(
                      <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7" /></svg>,
                      <div
                        class="prose prose-invert w-full max-w-none whitespace-pre-wrap leading-relaxed text-primary"
                        /* eslint-disable-next-line solid/no-innerhtml */
                        innerHTML={DOMPurify.sanitize(i().description, { USE_PROFILES: { html: true } })}
                      />
                    )}
                  </Show>
                </div>
              </DialogBody>
              <DialogFooter>
                <Button variant="secondary" label="Edit" class="flex-1" onClick={handleEdit} />
                <Button
                  variant="destructive"
                  label="Delete"
                  class="flex-1"
                  onClick={() => { if (confirm('Delete this item?')) handleDelete(); }}
                />
              </DialogFooter>
            </>
          );
        }}
      </Show>
    </Dialog>
  );
}

export default EventViewModal;
