import { createSignal, createEffect, Show } from 'solid-js';
import {
  Dialog, DialogHeader, FormLayout, TextInput, TextArea, Text, Switch,
  Selector, SegmentedControl, SegmentedControlItem, Button,
} from '../kit';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { settingsStore } from '../../stores/settingsStore';
import { uiStore } from '../../stores/uiStore';
import { snapUserColor } from '../../lib/colorTokens';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import DaySchedulePreview from '../calendar/DaySchedulePreview';
import DayTaskListPreview from '../tasks/DayTaskListPreview';

const RECURRENCE_OPTIONS = [
  { value: 'NONE', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
];

const DURATION_PRESETS = [
  { minutes: 15, label: '15m' },
  { minutes: 30, label: '30m' },
  { minutes: 60, label: '1h' },
  { minutes: 120, label: '2h' },
];

// Per-item user color dot for Selector option rows (stored colors are data;
// display snaps to the nearest Astryx hue token).
const colorDot = (color) => (
  <span aria-hidden="true" class="inline-block size-2.5 rounded-full" style={{ background: snapUserColor(color).cssVar }} />
);

function AddItemModal() {
  const [mode, setMode] = createSignal('event'); // 'event' or 'task'
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [date, setDate] = createSignal('');
  const [time, setTime] = createSignal('12:00');
  const [endDate, setEndDate] = createSignal('');
  const [endTime, setEndTime] = createSignal('13:00');
  const [allDay, setAllDay] = createSignal(true);
  const [showRecurrence, setShowRecurrence] = createSignal(false);
  const [recurrence, setRecurrence] = createSignal('NONE');
  const [calendarId, setCalendarId] = createSignal('');
  const [listId, setListId] = createSignal('');
  const [priority, setPriority] = createSignal('normal');
  const [hasTaskDate, setHasTaskDate] = createSignal(false);

  const { state: eventState } = eventStore;
  const { state: taskState } = taskStore;

  createEffect(() => {
    if (uiStore.state.activeModal === 'addItem') {
      const activeStr = uiStore.state.activeDate || new Date().toISOString();
      const st = new Date(activeStr);
      setDate(st.toISOString().split('T')[0]);
      setTime(st.getHours().toString().padStart(2, '0') + ':00');

      const defaultDur = settingsStore.state.defaultDuration || 60;
      const en = new Date(st.getTime() + defaultDur * 60000);
      setEndDate(en.toISOString().split('T')[0]);
      setEndTime(en.getHours().toString().padStart(2, '0') + ':' + en.getMinutes().toString().padStart(2, '0'));

      setAllDay(true);
      setHasTaskDate(false);

      if (eventState.calendars.length > 0) {
        setCalendarId(eventState.calendars[0].id);
      }
      if (taskState.lists.length > 0) {
        setListId(taskState.lists[0].id);
      }
    }
  });

  let touchStartX = 0;
  let touchEndX = 0;

  const handleTouchStart = (e) => {
    touchStartX = e.changedTouches[0].screenX;
  };

  const handleTouchEnd = (e) => {
    touchEndX = e.changedTouches[0].screenX;
    if (touchEndX < touchStartX - 50) setMode('task');
    if (touchEndX > touchStartX + 50) setMode('event');
  };

  createEffect(() => {
    // When start date/time changes, auto-update end date/time to maintain a 1-hour minimum if end is before start
    if (date() && time()) {
      const st = new Date(`${date()}T${time()}:00`);
      if (endDate() && endTime()) {
        const en = new Date(`${endDate()}T${endTime()}:00`);
        if (en <= st) {
          const newEn = new Date(st.getTime() + 60 * 60000);
          setEndDate(newEn.toISOString().split('T')[0]);
          setEndTime(newEn.getHours().toString().padStart(2, '0') + ':' + newEn.getMinutes().toString().padStart(2, '0'));
        }
      }
    }
  });

  const setDurationPill = (mins) => {
    if (!date() || !time()) return;
    const st = new Date(`${date()}T${time()}:00`);
    const en = new Date(st.getTime() + mins * 60000);
    setEndDate(en.toISOString().split('T')[0]);
    setEndTime(en.getHours().toString().padStart(2, '0') + ':' + en.getMinutes().toString().padStart(2, '0'));
  };

  const currentDurationMins = () => {
    if (!date() || !time() || !endDate() || !endTime()) return null;
    const st = new Date(`${date()}T${time()}:00`);
    const en = new Date(`${endDate()}T${endTime()}:00`);
    return Math.round((en - st) / 60000);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title().trim()) return;

    let rruleStr = null;
    if (showRecurrence() && recurrence() !== 'NONE') {
      const dtStart = date() ? new Date(`${date()}T12:00:00`).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : '';
      rruleStr = `DTSTART:${dtStart}\nRRULE:FREQ=${recurrence()}`;
    }

    if (mode() === 'event') {
      const startObj = new Date(`${date() || new Date().toISOString().split('T')[0]}T${time()}:00`);
      const validStart = isNaN(startObj.getTime()) ? new Date() : startObj;
      const endObj = new Date(`${endDate() || date() || new Date().toISOString().split('T')[0]}T${endTime()}:00`);
      const validEnd = isNaN(endObj.getTime()) ? new Date(validStart.getTime() + 60*60000) : endObj;

      eventStore.addEvent(title(), validStart.toISOString(), validEnd.toISOString(), calendarId() || null, description(), rruleStr, allDay());
    } else {
      let targetDateStr = null;
      if (hasTaskDate() && date()) {
        if (allDay()) {
          targetDateStr = new Date(`${date()}T00:00:00`).toISOString();
        } else {
          const timeStr = time() || '12:00';
          targetDateStr = new Date(`${date()}T${timeStr}`).toISOString();
        }
      }

      taskStore.addTask(title(), listId() || null, targetDateStr, priority(), description(), rruleStr, hasTaskDate() ? allDay() : false);
    }

    setTitle('');
    setDescription('');
    setRecurrence('NONE');
    setShowRecurrence(false);
    uiStore.setActiveModal(null);
  };

  const dateField = (label, value, onChange, endSlot) => (
    <div class="flex flex-1 flex-col gap-1">
      <div class="flex items-center justify-between gap-2">
        <Text as="span" type="label" color="secondary">{label}</Text>
        {endSlot}
      </div>
      <DatePicker value={value()} onChange={onChange} />
    </div>
  );

  const timeField = (label, value, onChange) => (
    <div class="flex flex-1 flex-col gap-1 sm:min-w-[140px]">
      <Text as="span" type="label" color="secondary">{label}</Text>
      <TimePicker value={value()} onChange={onChange} />
    </div>
  );

  return (
    <Dialog
      open={uiStore.state.activeModal === 'addItem'}
      onClose={() => uiStore.setActiveModal(null)}
      size="lg"
    >
      <DialogHeader title={mode() === 'event' ? 'New Event' : 'New Task'} />
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
        {/* Left pane — form */}
        <div class="flex min-h-0 flex-1 flex-col border-border sm:border-r">
          <div class="shrink-0 px-6 pt-4" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <SegmentedControl
              label="Item type"
              layout="fill"
              value={mode()}
              onChange={(v) => setMode(v)}
            >
              <SegmentedControlItem value="event" label="Event" />
              <SegmentedControlItem value="task" label="Task" />
            </SegmentedControl>
          </div>

          <form onSubmit={handleSubmit} class="flex min-h-0 flex-1 flex-col">
            <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              <FormLayout>
                <TextInput
                  label="Title"
                  placeholder={mode() === 'event' ? 'Event Title' : 'Task Title'}
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

                <Show when={mode() === 'event' || (mode() === 'task' && hasTaskDate())}>
                  <Switch
                    label="All-Day"
                    value={allDay()}
                    onChange={(checked) => setAllDay(checked)}
                  />
                </Show>

                <Show when={mode() === 'task' && hasTaskDate()}>
                  <div class="flex flex-col gap-4 sm:flex-row">
                    {dateField('Due Date', date, (v) => setDate(v), (
                      <Button
                        variant="ghost"
                        size="sm"
                        label="Remove"
                        class="text-accent"
                        onClick={() => setHasTaskDate(false)}
                      />
                    ))}
                    <Show when={!allDay()}>
                      {timeField('Time', time, (v) => setTime(v))}
                    </Show>
                  </div>
                </Show>

                <Show when={mode() === 'event'}>
                  <Show when={allDay()}>
                    <div class="flex flex-col gap-4 sm:flex-row">
                      {dateField('Start Date', date, (v) => setDate(v))}
                      {dateField('End Date', endDate, (v) => setEndDate(v))}
                    </div>
                  </Show>

                  <Show when={!allDay()}>
                    <div class="flex flex-col gap-4 sm:flex-row">
                      {dateField('Start Date', date, (v) => setDate(v))}
                      {timeField('Start Time', time, (v) => setTime(v))}
                    </div>

                    <div class="flex flex-col gap-4 sm:flex-row">
                      {dateField('End Date', endDate, (v) => setEndDate(v))}
                      {timeField('End Time', endTime, (v) => setEndTime(v))}
                    </div>

                    <div class="flex flex-col gap-1">
                      <Text as="span" type="label" color="secondary">Duration</Text>
                      <SegmentedControl
                        label="Duration"
                        size="sm"
                        value={String(currentDurationMins())}
                        onChange={(v) => setDurationPill(Number(v))}
                      >
                        {DURATION_PRESETS.map((preset) => (
                          <SegmentedControlItem value={String(preset.minutes)} label={preset.label} />
                        ))}
                      </SegmentedControl>
                    </div>
                  </Show>
                </Show>

                <Show when={mode() === 'task' && !hasTaskDate()}>
                  <Button
                    variant="secondary"
                    label="Add Due Date"
                    class="w-full"
                    onClick={() => {
                      setHasTaskDate(true);
                      if (!date()) {
                        setDate(new Date().toISOString().split('T')[0]);
                      }
                    }}
                    icon={
                      <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-4 w-4">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 11v6m-3-3h6" />
                      </svg>
                    }
                  />
                </Show>

                <Show when={mode() === 'event'}>
                  <Selector
                    label="Calendar"
                    value={calendarId()}
                    onChange={(v) => setCalendarId(v || '')}
                    options={eventState.calendars.map((cal) => ({
                      value: cal.id,
                      label: cal.name,
                      icon: colorDot(cal.color),
                    }))}
                    placeholder="Select..."
                  />
                </Show>

                <Show when={mode() === 'task'}>
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
                </Show>

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
              <Button
                type="submit"
                variant="primary"
                label={mode() === 'event' ? 'Add Event' : 'Add Task'}
                class="w-full"
              />
            </div>
          </form>
        </div>

        {/* Right pane — schedule/task preview */}
        <div class="hidden sm:block">
          <Show
            when={mode() === 'event'}
            fallback={
              <DayTaskListPreview
                date={hasTaskDate() ? date() : new Date().toISOString().split('T')[0]}
                ghostTask={{
                  title: title() || 'New Task',
                  color: taskState.lists.find((l) => l.id === listId())?.color || '#6B5BDB',
                }}
              />
            }
          >
            <DaySchedulePreview
              mode="event"
              date={date() || new Date().toISOString().split('T')[0]}
              ghostEvent={{
                title: title() || 'New Event',
                startTime: `${date()}T${time()}:00`,
                endTime: `${endDate()}T${endTime()}:00`,
                type: 'event',
                allDay: allDay(),
                color: eventState.calendars.find((c) => c.id === calendarId())?.color || '#E8942A',
              }}
            />
          </Show>
        </div>
      </div>
    </Dialog>
  );
}

export default AddItemModal;
