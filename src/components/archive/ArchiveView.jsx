// ArchiveView — Phase 4 pilot migration onto the kit (Astryx spec).
// Retired here: the hand-rolled filter pill buttons (kit SegmentedControl),
// Card-wrapped archive rows (kit List/ListItem, edge-to-edge with dividers),
// the plain-div page/group headings (kit Heading), and the legacy ui/EmptyState
// (kit EmptyState). Restore/delete row actions ride the existing store APIs
// (taskStore.toggleTask/deleteTask, eventStore.deleteEvent) via kit MoreMenu.
import { createSignal, createMemo, For, Show } from 'solid-js';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { format, isPast } from 'date-fns';
import { settingsStore } from '../../stores/settingsStore';
import {
  Heading,
  SegmentedControl,
  SegmentedControlItem,
  List,
  ListItem,
  Token,
  MoreMenu,
  EmptyState,
} from '../kit';

const ArchiveIcon = () => (
  <svg
    class="size-16 text-secondary"
    fill="none"
    stroke="currentColor"
    stroke-width="1.5"
    stroke-linecap="round"
    stroke-linejoin="round"
    viewBox="0 0 24 24"
    aria-hidden="true"
  >
    <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
  </svg>
);

function ArchiveView() {
  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;
  const { state: settings } = settingsStore;

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

  // The list/calendar the item came from (drives the origin Token).
  const originOf = (item) =>
    item._type === 'event'
      ? eventState.calendars.find(c => c.id === item.calendarId)
      : taskState.lists.find(l => l.id === item.listId);

  const itemMeta = (item) => {
    if (item._type === 'event') {
      const d = new Date(item.start_time);
      const when = isNaN(d.getTime())
        ? 'No Date'
        : format(d, settings.use24HourClock ? 'MMM d, H:mm' : 'MMM d, h:mm a');
      return `Event • ${when}`;
    }
    const d = new Date(item._date);
    const when = isNaN(d.getTime()) ? 'No Date' : format(d, 'MMM d');
    return `Completed Task • ${when}`;
  };

  // Restore/delete through the existing store contracts. Past events cannot be
  // "restored" (they are past by definition), so events only offer delete.
  const itemActions = (item) =>
    item._type === 'event'
      ? [{ label: 'Delete', onClick: () => eventStore.deleteEvent(item.id) }]
      : [
          { label: 'Restore', onClick: () => taskStore.toggleTask(item.id) },
          { label: 'Delete', onClick: () => taskStore.deleteTask(item.id) },
        ];

  return (
    <>
      <header class="h-[60px] min-h-[60px] border-b border-border flex items-center justify-between px-6 bg-body/40 backdrop-blur-md sticky top-0 z-50">
        <Heading level={1} class="lowercase tracking-wide">Archive</Heading>
      </header>

      <div class="overflow-y-auto p-6 flex flex-col gap-6 max-w-[800px] mx-auto w-full">
        <SegmentedControl
          label="Filter archive"
          value={filter()}
          onChange={setFilter}
          class="self-start"
        >
          <SegmentedControlItem value="all" label="All" />
          <SegmentedControlItem value="events" label="Events" />
          <SegmentedControlItem value="tasks" label="Tasks" />
        </SegmentedControl>

        <Show
          when={groupedArchive().length > 0}
          fallback={<EmptyState title="Your archive is empty." icon={<ArchiveIcon />} />}
        >
          <For each={groupedArchive()}>
            {(group) => (
              <List
                hasDividers
                header={<Heading level={2}>{group.header}</Heading>}
              >
                <For each={group.items}>
                  {(item) => (
                    <ListItem
                      label={item.title}
                      description={itemMeta(item)}
                      startContent={
                        <Show when={originOf(item)}>
                          {(origin) => (
                            <Token
                              label={origin().name}
                              size="sm"
                              // TODO(colorTokens): route through snapUserColor()
                              // once src/lib/colorTokens.js lands (wave 2) so
                              // stored hex maps to the nearest Astryx hue token.
                              customColor={origin().color}
                            />
                          )}
                        </Show>
                      }
                      endContent={
                        <MoreMenu
                          label={`Actions for ${item.title}`}
                          size="sm"
                          items={itemActions(item)}
                        />
                      }
                    />
                  )}
                </For>
              </List>
            )}
          </For>
        </Show>
      </div>
    </>
  );
}

export default ArchiveView;
