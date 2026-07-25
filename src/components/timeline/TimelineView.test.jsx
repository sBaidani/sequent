/**
 * Regression test for the modal-state FSM bug found while cataloging
 * uiStore.activeModal's transitions: TimelineView's openItem() called
 * uiStore.setActiveEvent(id, 'event') — which internally sets
 * activeModal to 'viewEvent' — and then immediately overwrote it with
 * uiStore.setActiveModal('eventView'), a different string EventViewModal
 * never checks for. Clicking an event (not a task) in the Timeline
 * silently did nothing. Query by role/text only.
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, beforeEach, vi } from 'vitest';
import TimelineView from './TimelineView';
import { eventStore } from '../../stores/eventStore';
import { taskStore } from '../../stores/taskStore';
import { uiStore } from '../../stores/uiStore';

vi.mock('../../stores/syncEngine', () => ({
  syncEngine: { enqueue: vi.fn() },
}));

vi.mock('../../services/weatherService', () => ({
  weatherService: { fetchWeather: vi.fn(() => Promise.resolve(null)) },
}));

beforeEach(() => {
  global.IntersectionObserver = global.IntersectionObserver || class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  eventStore.setCalendars([]);
  eventStore.setEvents([]);
  taskStore.setLists([]);
  taskStore.setTasks([]);
  uiStore.setActiveModal(null);
  uiStore.setActiveEvent(null, null);
});

function seedTodayAllDayEvent() {
  eventStore.setCalendars([{ id: 'cal-1', name: 'Work', color: '#3B6ED6' }]);
  eventStore.setEvents([
    {
      id: 'event-1',
      title: 'Design review',
      calendarId: 'cal-1',
      allDay: true,
      start_time: new Date().toISOString(),
      end_time: new Date().toISOString(),
    },
  ]);
}

describe('TimelineView openItem', () => {
  // openItem() backs the all-day chip, the overlap sub-item, and the
  // today-pane list row — all three share this one function, so covering
  // it here covers all three call sites.
  test('clicking an all-day event sets activeModal to viewEvent, not a mismatched string', async () => {
    seedTodayAllDayEvent();
    render(() => <TimelineView />);

    // Both the main day-list row (already wired via a direct
    // setActiveEvent call, not the buggy openItem) and the today-pane
    // all-day chip render "Design review" as a button — the chip is the
    // one under test, distinguished by its shadow/color-mix background.
    const candidates = await screen.findAllByRole('button', { name: /design review/i });
    const chip = candidates.find((el) => el.className.includes('shadow-'));
    expect(chip).toBeTruthy();
    fireEvent.click(chip);

    expect(uiStore.state.activeModal).toBe('viewEvent');
    expect(uiStore.state.activeEventId).toBe('event-1');
    expect(uiStore.state.activeEventType).toBe('event');
  });
});
