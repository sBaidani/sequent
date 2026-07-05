import { createSignal, createEffect } from 'solid-js';
import {
  Dialog, DialogHeader, FormLayout, TextInput, TextArea, Text, Switch,
  Selector, SegmentedControl, SegmentedControlItem, Button,
} from '../kit';
import { taskStore } from '../../stores/taskStore';
import { uiStore } from '../../stores/uiStore';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import DayTaskListPreview from '../tasks/DayTaskListPreview';

const RECURRENCE_OPTIONS = [
  { value: 'NONE', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

// Per-item user color dot for Selector option rows (stored colors are data;
// route through src/lib/colorTokens.js snapUserColor once it lands).
const colorDot = (color) => (
  <span aria-hidden="true" class="inline-block size-2.5 rounded-full" style={{ background: color }} />
);

function AddTaskModal() {
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [date, setDate] = createSignal('');
  const [time, setTime] = createSignal('');
  const [allDay, setAllDay] = createSignal(true);
  const [listId, setListId] = createSignal('');
  const [priority, setPriority] = createSignal('normal');
  const [showRecurrence, setShowRecurrence] = createSignal(false);
  const [recurrence, setRecurrence] = createSignal('NONE');
  const [hasTaskDate, setHasTaskDate] = createSignal(false);

  const { state: taskState } = taskStore;

  createEffect(() => {
    if (uiStore.state.activeModal === 'addTask') {
      const dateObj = new Date(uiStore.state.activeDate);
      const localDateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
      setDate(localDateStr);
      setHasTaskDate(false);

      if (dateObj.getHours() !== 0 || dateObj.getMinutes() !== 0) {
        setAllDay(false);
        setTime(`${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`);
      } else {
        setAllDay(true);
        setTime('12:00');
      }

      if (uiStore.state.activeListId) {
        setListId(uiStore.state.activeListId);
      } else if (taskState.lists.length > 0) {
        setListId(taskState.lists[0].id);
      }
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title().trim()) return;

    let targetDateStr = null;
    if (hasTaskDate() && date()) {
      if (allDay()) {
        targetDateStr = new Date(`${date()}T00:00:00`).toISOString();
      } else {
        const timeStr = time() || '12:00';
        targetDateStr = new Date(`${date()}T${timeStr}`).toISOString();
      }
    }

    let rruleStr = null;
    if (recurrence() === 'DAILY') rruleStr = 'FREQ=DAILY';
    else if (recurrence() === 'WEEKLY') rruleStr = 'FREQ=WEEKLY';
    else if (recurrence() === 'MONTHLY') rruleStr = 'FREQ=MONTHLY';

    taskStore.addTask(
      title(),
      listId() || null,
      targetDateStr,
      priority(),
      description(),
      rruleStr,
      hasTaskDate() ? allDay() : false
    );

    setTitle('');
    setDescription('');
    setRecurrence('NONE');
    setShowRecurrence(false);
    uiStore.setActiveModal(null);
  };

  return (
    <Dialog
      open={uiStore.state.activeModal === 'addTask'}
      onClose={() => uiStore.setActiveModal(null)}
      size="lg"
    >
      <DialogHeader title="New Task" />
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
        {/* Left pane — form */}
        <form onSubmit={handleSubmit} class="flex min-h-0 flex-1 flex-col border-border sm:border-r">
          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <FormLayout>
              <TextInput
                label="Title"
                placeholder="Buy groceries..."
                value={title()}
                onChange={(v) => setTitle(v)}
                hasAutoFocus
              />

              <TextArea
                label="Description"
                placeholder="Add details..."
                value={description()}
                onChange={(v) => setDescription(v)}
                rows={2}
              />

              <div class="flex flex-col gap-4 sm:flex-row">
                <div class="flex flex-1 flex-col gap-1">
                  <Text as="span" type="label" color="secondary">Due Date</Text>
                  <DatePicker value={date()} onChange={(v) => setDate(v)} />
                </div>
                <div class="flex flex-1 flex-col gap-1 sm:min-w-[140px]">
                  <div class="flex items-center justify-between gap-2">
                    <Text as="span" type="label" color="secondary">Time</Text>
                    <Switch
                      label="All-day"
                      labelPosition="start"
                      value={allDay()}
                      onChange={(checked) => setAllDay(checked)}
                    />
                  </div>
                  {allDay() ? (
                    <div class="flex h-(--size-element-md) w-full items-center rounded-md border-(length:--border-width) border-solid border-border bg-surface px-2 text-disabled">
                      --:--
                    </div>
                  ) : (
                    <TimePicker value={time()} onChange={(v) => setTime(v)} />
                  )}
                </div>
              </div>

              <Selector
                label="List"
                value={listId()}
                onChange={(v) => setListId(v || '')}
                options={taskState.lists.map((list) => ({
                  value: list.id,
                  label: list.name,
                  icon: colorDot(list.color),
                }))}
                placeholder="Select..."
              />

              <div class="flex flex-col gap-1">
                <Text as="span" type="label" color="secondary">Priority</Text>
                <SegmentedControl
                  label="Priority"
                  layout="fill"
                  value={priority()}
                  onChange={(v) => setPriority(v)}
                >
                  <SegmentedControlItem value="low" label="Low" />
                  <SegmentedControlItem value="normal" label="Normal" />
                  <SegmentedControlItem value="high" label="High" />
                </SegmentedControl>
              </div>

              {!showRecurrence() ? (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    label="+ Add Repeat"
                    class="text-accent"
                    onClick={() => setShowRecurrence(true)}
                  />
                </div>
              ) : (
                <div class="flex items-end gap-2">
                  <div class="min-w-0 flex-1">
                    <Selector
                      label="Repeat"
                      value={recurrence()}
                      onChange={(v) => setRecurrence(v || 'NONE')}
                      options={RECURRENCE_OPTIONS}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    label="Remove"
                    class="text-accent"
                    onClick={() => { setShowRecurrence(false); setRecurrence('NONE'); }}
                  />
                </div>
              )}
            </FormLayout>
          </div>
          <div class="shrink-0 border-t border-border px-6 py-4">
            <Button type="submit" variant="primary" label="Add Task" class="w-full" />
          </div>
        </form>

        {/* Right pane — task list preview */}
        <div class="hidden sm:block">
          <DayTaskListPreview
            date={date() || new Date().toISOString().split('T')[0]}
            ghostTask={{
              title: title() || 'New Task',
              color: taskState.lists.find((l) => l.id === listId())?.color || '#6B5BDB',
            }}
          />
        </div>
      </div>
    </Dialog>
  );
}

export default AddTaskModal;
