/**
 * Characterization tests for form-submit wiring of AddTaskModal and
 * AddEventModal (src/components/shared/) — POST-REFACTOR (Phase 4, kit
 * Dialog + FormLayout/TextInput/TextArea/Switch/SegmentedControl).
 *
 * Pins BEHAVIOR only — queries by role / accessible name / label text,
 * never by class or DOM structure. Store methods (taskStore.addTask,
 * eventStore.addEvent) are spied so we assert the exact call shape the
 * modals produce; syncEngine is mocked at the module boundary (same
 * pattern as src/stores/taskStore.test.js) so supabase/idb never load.
 *
 * Contract pinned here:
 *  - AddTaskModal submit → taskStore.addTask(title, listId, scheduledDate,
 *    priority, description, rrule, allDay) and closes the modal
 *    (uiStore.setActiveModal(null)).
 *    QUIRK: with no due date toggled on, scheduledDate is null AND the
 *    allDay argument is forced to false (hasTaskDate() ? allDay() : false),
 *    even though the visible All-day toggle defaults to ON.
 *  - AddEventModal submit → eventStore.addEvent(title, startISO, endISO,
 *    calendarId, description, rrule, allDay) and closes the modal. Start
 *    comes from uiStore.activeDate; end defaults to start + 60min
 *    (settingsStore defaultDuration).
 *  - Both modals: whitespace-only title is rejected — no store call, modal
 *    stays open.
 *
 * Refactor upgrades applied to the queries (as the pre-refactor comments
 * called for):
 *  - Title/Description are now REAL label-associated kit fields →
 *    getByLabelText replaces the old placeholder queries.
 *  - The All-Day toggle is an accessible kit Switch (role="switch") →
 *    replaces the old hidden-checkbox query (getByRole('checkbox',
 *    { hidden: true })).
 *  - Priority is a kit SegmentedControl (role="radio" items) → replaces the
 *    old getByRole('button', { name: 'High' }) query.
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, beforeAll, beforeEach, afterEach, vi } from 'vitest';

vi.mock('../../src/stores/syncEngine', () => ({
  syncEngine: {
    enqueue: vi.fn().mockResolvedValue(true),
    init: vi.fn(),
  },
}));

import AddTaskModal from '../../src/components/shared/AddTaskModal';
import AddEventModal from '../../src/components/shared/AddEventModal';
import { taskStore } from '../../src/stores/taskStore';
import { eventStore } from '../../src/stores/eventStore';
import { uiStore } from '../../src/stores/uiStore';

const pad = (n) => n.toString().padStart(2, '0');

beforeAll(() => {
  // jsdom has no Web Animations API; Dialog's transitions call el.animate().
  if (!Element.prototype.animate) {
    Element.prototype.animate = vi.fn(() => ({
      onfinish: null,
      cancel: vi.fn(),
      finished: Promise.resolve(),
    }));
  }
  // jsdom has no Element scrollTo; DaySchedulePreview calls it on mount.
  if (!Element.prototype.scrollTo) {
    Element.prototype.scrollTo = vi.fn();
  }
});

beforeEach(() => {
  uiStore.setActiveModal(null);
  uiStore.setActiveListId('');
  taskStore.setTasks([]);
  taskStore.setLists([{ id: 'list-1', name: 'Personal', color: '#6B5BDB' }]);
  eventStore.setEvents([]);
  eventStore.setCalendars([{ id: 'cal-1', name: 'Home', color: '#E8942A' }]);
  vi.spyOn(taskStore, 'addTask').mockImplementation(() => {});
  vi.spyOn(eventStore, 'addEvent').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AddTaskModal form-submit wiring (characterization)', () => {
  const openTaskModal = (activeDate = new Date(2026, 6, 10, 0, 0, 0)) => {
    uiStore.setActiveDate(activeDate.toISOString());
    uiStore.setActiveModal('addTask');
    return render(() => <AddTaskModal />);
  };

  test('renders the New Task form while activeModal === "addTask"', () => {
    openTaskModal();
    expect(screen.getByRole('heading', { name: /new task/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/^Title/)).toBeRequired();
    expect(screen.getByRole('button', { name: 'Add Task' })).toBeInTheDocument();
  });

  test('submit calls taskStore.addTask with the pinned shape and closes the modal', () => {
    openTaskModal();

    fireEvent.input(screen.getByLabelText(/^Title/), {
      target: { value: 'Buy groceries' },
    });
    fireEvent.input(screen.getByLabelText('Description'), {
      target: { value: 'milk and eggs' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    // QUIRK pinned: no due date toggled on → scheduledDate null AND
    // allDay arg false, despite the visible All-day toggle defaulting ON.
    expect(taskStore.addTask).toHaveBeenCalledTimes(1);
    expect(taskStore.addTask).toHaveBeenCalledWith(
      'Buy groceries', // title
      'list-1',        // listId (falls back to first list)
      null,            // scheduledDate — hasTaskDate defaults false
      'normal',        // priority default
      'milk and eggs', // description
      null,            // rrule — recurrence defaults NONE
      false            // allDay — forced false when no date is set
    );
    expect(uiStore.state.activeModal).toBe(null);
  });

  test('selected priority is passed through to addTask', () => {
    openTaskModal();

    fireEvent.input(screen.getByLabelText(/^Title/), {
      target: { value: 'Urgent thing' },
    });
    // Priority is a SegmentedControl (radiogroup) post-refactor.
    fireEvent.click(screen.getByRole('radio', { name: 'High' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(taskStore.addTask).toHaveBeenCalledWith(
      'Urgent thing',
      'list-1',
      null,
      'high',
      '',
      null,
      false
    );
    expect(uiStore.state.activeModal).toBe(null);
  });

  test('active list from uiStore wins over the first-list fallback', () => {
    taskStore.setLists([
      { id: 'list-1', name: 'Personal', color: '#6B5BDB' },
      { id: 'list-2', name: 'Work', color: '#1FA7A7' },
    ]);
    uiStore.setActiveListId('list-2');
    openTaskModal();

    fireEvent.input(screen.getByLabelText(/^Title/), {
      target: { value: 'File report' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(taskStore.addTask).toHaveBeenCalledWith(
      'File report', 'list-2', null, 'normal', '', null, false
    );
  });

  test('whitespace-only title is rejected: no addTask call, modal stays open', () => {
    openTaskModal();

    fireEvent.input(screen.getByLabelText(/^Title/), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Task' }));

    expect(taskStore.addTask).not.toHaveBeenCalled();
    expect(uiStore.state.activeModal).toBe('addTask');
  });
});

describe('AddEventModal form-submit wiring (characterization)', () => {
  // Non-midnight active date so the modal adopts its time (midnight → 12:00).
  const ACTIVE = new Date(2026, 6, 10, 9, 30, 0);

  const openEventModal = () => {
    uiStore.setActiveDate(ACTIVE.toISOString());
    uiStore.setActiveModal('addEvent');
    return render(() => <AddEventModal />);
  };

  // Mirrors the component's start/end construction so the expectation is
  // timezone-safe: start = local activeDate date+time; end = start + 60min
  // (settingsStore.defaultDuration default), rebuilt from local date/time
  // strings.
  const expectedStartISO = () =>
    new Date(
      `${ACTIVE.getFullYear()}-${pad(ACTIVE.getMonth() + 1)}-${pad(ACTIVE.getDate())}T${pad(ACTIVE.getHours())}:${pad(ACTIVE.getMinutes())}`
    ).toISOString();

  const expectedEndISO = () => {
    const en = new Date(new Date(expectedStartISO()).getTime() + 60 * 60000);
    const endDateStr = en.toISOString().split('T')[0];
    return new Date(`${endDateStr}T${pad(en.getHours())}:${pad(en.getMinutes())}:00`).toISOString();
  };

  test('renders the event form while activeModal === "addEvent"', () => {
    openEventModal();
    expect(screen.getByLabelText(/^Title/)).toBeRequired();
    expect(screen.getByRole('button', { name: 'Add Event' })).toBeInTheDocument();
  });

  test('submit calls eventStore.addEvent with the pinned shape and closes the modal', () => {
    openEventModal();

    fireEvent.input(screen.getByLabelText(/^Title/), {
      target: { value: 'Team standup' },
    });
    fireEvent.input(screen.getByLabelText('Description'), {
      target: { value: 'daily sync' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Event' }));

    expect(eventStore.addEvent).toHaveBeenCalledTimes(1);
    expect(eventStore.addEvent).toHaveBeenCalledWith(
      'Team standup',     // title
      expectedStartISO(), // start: activeDate's local date + time
      expectedEndISO(),   // end: start + defaultDuration (60min)
      'cal-1',            // calendarId (falls back to first calendar)
      'daily sync',       // description
      null,               // rrule — recurrence defaults NONE
      false               // allDay default
    );
    expect(uiStore.state.activeModal).toBe(null);
  });

  test('All-Day toggle is passed through as the allDay argument', () => {
    openEventModal();

    fireEvent.input(screen.getByLabelText(/^Title/), {
      target: { value: 'Conference' },
    });
    // The toggle is an accessible kit Switch post-refactor (the old markup
    // hid the checkbox with class="hidden" and needed a hidden-role query).
    fireEvent.click(screen.getByRole('switch', { name: 'All-Day' }));
    fireEvent.click(screen.getByRole('button', { name: 'Add Event' }));

    expect(eventStore.addEvent).toHaveBeenCalledTimes(1);
    const args = eventStore.addEvent.mock.calls[0];
    expect(args[0]).toBe('Conference');
    expect(args[6]).toBe(true); // allDay
    expect(uiStore.state.activeModal).toBe(null);
  });

  test('whitespace-only title is rejected: no addEvent call, modal stays open', () => {
    openEventModal();

    fireEvent.input(screen.getByLabelText(/^Title/), {
      target: { value: '   ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Add Event' }));

    expect(eventStore.addEvent).not.toHaveBeenCalled();
    expect(uiStore.state.activeModal).toBe('addEvent');
  });
});
