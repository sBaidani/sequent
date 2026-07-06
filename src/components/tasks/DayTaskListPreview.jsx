import { createMemo, For, Show, createSignal } from 'solid-js';
import { format, isSameDay } from 'date-fns';
import { taskStore } from '../../stores/taskStore';
import { expandRecurringItems } from '../../lib/recurrenceEngine';
import { IconButton, List, ListItem, CheckboxInput, Text, EmptyState, cx, Section } from '../kit';
import { snapUserColor } from '../../lib/colorTokens';

// Stored per-item user colors are snapped to the nearest Astryx hue token and
// rendered through the CheckboxInput `color` prop (its documented token
// exception); missing colors fall back to the theme accent token.
const FALLBACK_COLOR = 'var(--color-accent)';
const snappedColor = (stored) => (stored ? snapUserColor(stored).cssVar : FALLBACK_COLOR);

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
        color: snappedColor(taskState.lists.find(l => l.id === t.listId)?.color),
      };
    });

    // Add ghost task if valid
    if (props.ghostTask && props.ghostTask.title) {
      tasks.push({
        id: 'ghost-1',
        title: props.ghostTask.title || 'New Task',
        color: snappedColor(props.ghostTask.color),
        isGhost: true,
        completed: false
      });
    }

    return tasks;
  });

  return (
    <Section
      variant="transparent"
      padding={0}
      width={collapsed() ? 48 : 350}
      minHeight={500}
      class={`flex flex-col h-full border-l border-border !bg-body/50 transition-all duration-300 ease-in-out ${collapsed() ? 'min-w-[48px]' : 'min-w-[350px]'}`}
    >

      <div class="flex items-center p-4 border-b border-border gap-3">
        <IconButton
          variant="ghost"
          size="sm"
          label={collapsed() ? 'Expand Preview' : 'Collapse Preview'}
          title={collapsed() ? 'Expand Preview' : 'Collapse Preview'}
          icon={
            <svg class={`w-4 h-4 transition-transform duration-300 ${collapsed() ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" /></svg>
          }
          class={cx('shrink-0', collapsed() && 'mx-auto')}
          onClick={() => setCollapsed(!collapsed())}
        />
        <Show when={!collapsed()}>
          <div class="flex items-center justify-between w-full min-w-0">
            <Text type="body" weight="bold" maxLines={1} class="tracking-wide pr-2">
              {`${format(new Date(props.date.includes('T') ? props.date : props.date + 'T12:00:00'), 'eeee')} Tasks`}
            </Text>
            <Text type="supporting" color="disabled" weight="bold" class="shrink-0">
              {format(new Date(props.date.includes('T') ? props.date : props.date + 'T12:00:00'), 'MMM d')}
            </Text>
          </div>
        </Show>
      </div>

      <div class={`flex-1 overflow-y-auto p-4 ${collapsed() ? 'hidden' : 'block'}`}>
        <Show when={dayTasks().length === 0}>
          <EmptyState isCompact title="No tasks scheduled for this day." />
        </Show>
        <Show when={dayTasks().length > 0}>
          <List hasDividers density="balanced" aria-label="Tasks for this day">
            <For each={dayTasks()}>
              {(item) => (
                <ListItem
                  class={cx(
                    item.isGhost &&
                      'rounded-md border border-dashed border-primary/40 bg-primary/5 animate-pulse',
                    item.completed && !item.isGhost && 'opacity-50',
                  )}
                  startContent={
                    <CheckboxInput
                      size="sm"
                      isLabelHidden
                      isReadOnly
                      label={item.title || 'Untitled Task'}
                      value={!!(item.completed && !item.isGhost)}
                      color={item.color}
                    />
                  }
                  label={
                    <Text
                      type="body"
                      weight="medium"
                      maxLines={1}
                      color={item.completed && !item.isGhost ? 'disabled' : 'primary'}
                      hasStrikethrough={!!(item.completed && !item.isGhost)}
                    >
                      {item.title || 'Untitled Task'}
                    </Text>
                  }
                />
              )}
            </For>
          </List>
        </Show>
      </div>
    </Section>
  );
}

export default DayTaskListPreview;
