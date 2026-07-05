import { createSignal, createEffect, Show } from 'solid-js';
import {
  Dialog, DialogHeader, FormLayout, TextInput, TextArea, Text, Switch,
  Selector, SegmentedControl, SegmentedControlItem, Button,
} from '../kit';
import { eventStore } from '../../stores/eventStore';
import { uiStore } from '../../stores/uiStore';
import { snapUserColor } from '../../lib/colorTokens';
import { settingsStore } from '../../stores/settingsStore';
import DatePicker from './DatePicker';
import TimePicker from './TimePicker';
import DaySchedulePreview from '../calendar/DaySchedulePreview';

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

function AddEventModal() {
  const [title, setTitle] = createSignal('');
  const [description, setDescription] = createSignal('');
  const [date, setDate] = createSignal('');
  const [time, setTime] = createSignal('12:00');
  const [endDate, setEndDate] = createSignal('');
  const [endTime, setEndTime] = createSignal('13:00');
  const [calendarId, setCalendarId] = createSignal('');
  const [showRecurrence, setShowRecurrence] = createSignal(false);
  const [recurrence, setRecurrence] = createSignal('NONE'); // NONE, DAILY, WEEKLY, MONTHLY
  const [allDay, setAllDay] = createSignal(false);

  const { state: eventState } = eventStore;

  createEffect(() => {
    if (uiStore.state.activeModal === 'addEvent') {
      const activeDateStr = uiStore.state.activeDate;
      const dateObj = new Date(activeDateStr);

      const localDateStr = `${dateObj.getFullYear()}-${(dateObj.getMonth() + 1).toString().padStart(2, '0')}-${dateObj.getDate().toString().padStart(2, '0')}`;
      setDate(localDateStr);

      if (dateObj.getHours() === 0 && dateObj.getMinutes() === 0) {
        setTime('12:00');
      } else {
        const hours = dateObj.getHours();
        const mins = dateObj.getMinutes();
        setTime(`${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`);
      }

      const defaultDur = settingsStore.state.defaultDuration || 60;
      const st = new Date(`${localDateStr}T${time()}:00`);
      const en = new Date(st.getTime() + defaultDur * 60000);
      setEndDate(en.toISOString().split('T')[0]);
      setEndTime(en.getHours().toString().padStart(2, '0') + ':' + en.getMinutes().toString().padStart(2, '0'));

      if (eventState.calendars.length > 0) {
        setCalendarId(eventState.calendars[0].id);
      }
    }
  });

  createEffect(() => {
    // When start date/time changes, auto-update end date/time
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

    const dateStr = date() || new Date().toISOString().split('T')[0];
    const timeStr = time() || '12:00';
    const startObj = new Date(`${dateStr}T${timeStr}`);
    const validStart = isNaN(startObj.getTime()) ? new Date() : startObj;

    const endObj = new Date(`${endDate() || dateStr}T${endTime()}:00`);
    const validEnd = isNaN(endObj.getTime()) ? new Date(validStart.getTime() + 60*60000) : endObj;

    let rruleStr = null;
    if (showRecurrence() && recurrence() !== 'NONE') {
      const dtStart = date() ? new Date(`${date()}T12:00:00`).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z' : '';
      rruleStr = `DTSTART:${dtStart}\nRRULE:FREQ=${recurrence()}`;
    }

    eventStore.addEvent(
      title(),
      validStart.toISOString(),
      validEnd.toISOString(),
      calendarId() || null,
      description(),
      rruleStr,
      allDay()
    );

    setTitle('');
    setDescription('');
    setRecurrence('NONE');
    setShowRecurrence(false);
    setAllDay(false);
    uiStore.setActiveModal(null);
  };

  const dateField = (label, value, onChange) => (
    <div class="flex flex-1 flex-col gap-1">
      <Text as="span" type="label" color="secondary">{label}</Text>
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
      open={uiStore.state.activeModal === 'addEvent'}
      onClose={() => uiStore.setActiveModal(null)}
      size="lg"
    >
      <DialogHeader title="New Event" />
      <div class="flex min-h-0 flex-1 flex-col overflow-hidden sm:flex-row">
        {/* Left pane — form */}
        <form onSubmit={handleSubmit} class="flex min-h-0 flex-1 flex-col border-border sm:border-r">
          <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            <FormLayout>
              <TextInput
                label="Title"
                placeholder="Event Title"
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

              <Switch
                label="All-Day"
                value={allDay()}
                onChange={(checked) => setAllDay(checked)}
              />

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

              {!showRecurrence() ? (
                <div>
                  <Button
                    variant="ghost"
                    size="sm"
                    label="Add Repeating Rule"
                    class="text-accent"
                    onClick={() => setShowRecurrence(true)}
                    icon={
                      <svg aria-hidden="true" fill="none" stroke="currentColor" viewBox="0 0 24 24" class="h-4 w-4">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    }
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
            <Button type="submit" variant="primary" label="Add Event" class="w-full" />
          </div>
        </form>

        {/* Right pane — schedule preview */}
        <div class="hidden sm:block">
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
        </div>
      </div>
    </Dialog>
  );
}

export default AddEventModal;
