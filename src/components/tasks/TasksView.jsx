import { For, Show } from 'solid-js';
import { createAutoAnimate } from '@formkit/auto-animate/solid';
import { taskStore } from '../../stores/taskStore';
import { uiStore } from '../../stores/uiStore';
import {
  Button,
  IconButton,
  Heading,
  List,
  ListItem,
  CheckboxInput,
  EmptyState,
  cx,
} from '../kit';
import { format } from 'date-fns';
import { snapUserColor } from '../../lib/colorTokens';
import DatePicker from '../shared/DatePicker';
import { Menu as MenuIcon, Plus, Pencil, X, ClipboardCheck } from 'lucide-solid';

function TasksView() {
  const { state: taskState, toggleTask, deleteTask } = taskStore;
  let listsGridRef;

  createAutoAnimate(() => listsGridRef);

  return (
    <>
      <div class="h-[60px] min-h-[60px] border-b border-border flex items-center justify-between px-6 bg-body/40 backdrop-blur-md sticky top-0 z-50">
        <div class="flex items-center gap-4">
          <IconButton
            variant="ghost"
            label="Toggle sidebar"
            icon={<MenuIcon />}
            class="rounded-full"
            onClick={() => uiStore.toggleSidebar()}
          />
          <Heading level={1} class="lowercase">Tasks</Heading>
        </div>
        <div class="flex items-center gap-3">
          <IconButton
            variant="ghost"
            label="Add task"
            icon={<Plus />}
            class="rounded-full"
            onClick={() => { uiStore.setActiveListId(''); uiStore.setActiveModal('addTask'); }}
          />
        </div>
      </div>

      <div class="flex-1 overflow-y-auto p-6 relative">
        <div class="columns-[300px] gap-6 space-y-6 max-w-[1200px] mx-auto" ref={listsGridRef}>
          <For each={taskState.lists}>
            {(list) => {
              const listTasks = () => taskState.tasks.filter(t => t.listId === list.id);
              // Per-list user color snapped to the nearest Astryx hue token;
              // rendered through the CheckboxInput `color` prop (its
              // documented token exception).
              const listColor = () =>
                list.color ? snapUserColor(list.color).cssVar : 'var(--color-accent)';

              return (
                <section class="break-inside-avoid rounded-lg border border-border bg-card p-4 shadow-[var(--shadow-low)]">
                  <Heading level={2} class="lowercase" maxLines={1}>{list.name}</Heading>

                  <div class="mt-3">
                    <Show
                      when={listTasks().length > 0}
                      fallback={
                        <EmptyState
                          isCompact
                          icon={<ClipboardCheck aria-hidden="true" class="size-8 text-success" />}
                          title="Hooray! No tasks here."
                        />
                      }
                    >
                      <List hasDividers density="balanced" class="-mx-2" aria-label={`${list.name} tasks`}>
                        <For each={listTasks()}>
                          {(task) => (
                            <ListItem
                              class={cx('group', task.completed && 'opacity-50')}
                              startContent={
                                <CheckboxInput
                                  size="sm"
                                  isLabelHidden
                                  label={task.title}
                                  value={!!task.completed}
                                  color={listColor()}
                                  onChange={() => toggleTask(task.id)}
                                />
                              }
                              label={
                                <span
                                  class={cx(
                                    'block overflow-hidden text-ellipsis whitespace-nowrap font-medium',
                                    task.completed && 'task-strike-animate opacity-60',
                                  )}
                                >
                                  {task.title}
                                </span>
                              }
                              description={
                                <DatePicker
                                  value={task.scheduled_date ? format(new Date(task.scheduled_date), 'yyyy-MM-dd') : ''}
                                  onChange={(v) => {
                                    if (v) {
                                      taskStore.updateTaskDate(task.id, new Date(v).toISOString());
                                    } else {
                                      taskStore.updateTaskDate(task.id, null);
                                    }
                                  }}
                                  class="bg-transparent border-none text-sm text-secondary hover:text-primary outline-none mt-0.5 cursor-pointer flex items-center gap-1 p-0 transition-colors"
                                />
                              }
                              endContent={
                                <span class="flex items-center gap-1">
                                  <IconButton
                                    variant="ghost"
                                    size="sm"
                                    label={`Edit task: ${task.title}`}
                                    icon={<Pencil />}
                                    class="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity"
                                    onClick={() => uiStore.setActiveEvent(task.id, 'task')}
                                  />
                                  <IconButton
                                    variant="ghost"
                                    size="sm"
                                    label={`Delete task: ${task.title}`}
                                    icon={<X />}
                                    onClick={() => deleteTask(task.id)}
                                  />
                                </span>
                              }
                            />
                          )}
                        </For>
                      </List>
                    </Show>
                    <Button
                      variant="ghost"
                      size="sm"
                      label={`Add task to ${list.name}`}
                      icon={<Plus />}
                      class="w-full mt-2"
                      onClick={() => { uiStore.setActiveListId(list.id); uiStore.setActiveModal('addTask'); }}
                    >
                      Add task
                    </Button>
                  </div>
                </section>
              );
            }}
          </For>
        </div>
      </div>

      <IconButton
        variant="primary"
        size="lg"
        label="Add task"
        icon={<Plus />}
        class="fixed bottom-8 right-8 rounded-full shadow-[var(--shadow-high)] z-[var(--z-popover,60)]"
        onClick={() => { uiStore.setActiveListId(''); uiStore.setActiveModal('addTask'); }}
      />
    </>
  );
}

export default TasksView;
