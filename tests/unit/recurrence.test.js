import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { expandRecurringItems } from '../../src/lib/recurrenceEngine';

// PRE-REFACTOR CHARACTERIZATION TESTS for expandRecurringItems.
//
// IMPORTANT QUIRK PINNED HERE: the engine builds the rule via
// RRule.fromString(item.rrule) and only afterwards mutates
// rule.options.dtstart. Because rrule bakes derived defaults
// (byhour/byminute/bysecond, and byweekday for FREQ=WEEKLY without BYDAY)
// from `new Date()` at construction time, the raw occurrence timestamps —
// and for a bare FREQ=WEEKLY rule, even the weekday chosen — depend on the
// wall clock at the moment of expansion. The engine then overwrites the
// time-of-day on each instance from the original item, which masks the
// time drift but NOT the weekday drift. To keep these tests deterministic
// we freeze the system clock; any rewrite must at minimum keep the
// clock-frozen behavior asserted below.
//
// Frozen "now" = Monday 2026-07-06 14:30 UTC (test env runs in UTC).
const FROZEN_NOW = new Date('2026-07-06T14:30:00.000Z');

const MINUTE = 60 * 1000;

describe('expandRecurringItems', () => {
  let consoleErrorSpy;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FROZEN_NOW);
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    vi.useRealTimers();
  });

  describe('daily expansion of events', () => {
    const dailyEvent = {
      id: 'evt-1',
      type: 'event',
      title: 'Standup',
      start_time: '2026-07-01T09:00:00.000Z',
      end_time: '2026-07-01T10:30:00.000Z', // 90 minutes long
      rrule: 'FREQ=DAILY',
    };

    test('produces one instance per day inside the view window', () => {
      const result = expandRecurringItems(
        [dailyEvent],
        '2026-07-01T00:00:00.000Z',
        '2026-07-05T23:59:59.000Z'
      );

      expect(result).toHaveLength(5);
      const startDays = result.map(i => new Date(i.start_time).getUTCDate());
      expect(startDays).toEqual([1, 2, 3, 4, 5]);
    });

    test('instances get derived ids, originalId and isInstance flag', () => {
      const result = expandRecurringItems(
        [dailyEvent],
        '2026-07-01T00:00:00.000Z',
        '2026-07-03T23:59:59.000Z'
      );

      expect(result.map(i => i.id)).toEqual(['evt-1-r0', 'evt-1-r1', 'evt-1-r2']);
      result.forEach(instance => {
        expect(instance.originalId).toBe('evt-1');
        expect(instance.isInstance).toBe(true);
        expect(instance.title).toBe('Standup');
        expect(instance.type).toBe('event');
      });
    });

    test('preserves the event start time-of-day and duration on every instance', () => {
      const result = expandRecurringItems(
        [dailyEvent],
        '2026-07-01T00:00:00.000Z',
        '2026-07-05T23:59:59.000Z'
      );

      result.forEach(instance => {
        const start = new Date(instance.start_time);
        const end = new Date(instance.end_time);
        // Time of day copied from the original event (test env is UTC)
        expect(start.getUTCHours()).toBe(9);
        expect(start.getUTCMinutes()).toBe(0);
        // Duration preserved exactly: 90 minutes
        expect(end.getTime() - start.getTime()).toBe(90 * MINUTE);
      });

      // Exact ISO strings for the first and last instances
      expect(result[0].start_time).toBe('2026-07-01T09:00:00.000Z');
      expect(result[0].end_time).toBe('2026-07-01T10:30:00.000Z');
      expect(result[4].start_time).toBe('2026-07-05T09:00:00.000Z');
      expect(result[4].end_time).toBe('2026-07-05T10:30:00.000Z');
    });

    test('excludes occurrences outside the view window', () => {
      const result = expandRecurringItems(
        [dailyEvent],
        '2026-07-03T00:00:00.000Z',
        '2026-07-04T23:59:59.000Z'
      );

      expect(result).toHaveLength(2);
      expect(result.map(i => new Date(i.start_time).getUTCDate())).toEqual([3, 4]);
      // Index (and thus id suffix) restarts at 0 for the window, it is not
      // an absolute occurrence number.
      expect(result[0].id).toBe('evt-1-r0');
    });
  });

  describe('weekly expansion of tasks', () => {
    const weeklyTask = {
      id: 'task-1',
      type: 'task',
      title: 'Water plants',
      scheduled_date: '2026-07-06T14:30:00.000Z', // Monday 14:30 UTC
      created_at: '2026-06-01T08:00:00.000Z',
      rrule: 'FREQ=WEEKLY;BYDAY=MO',
    };

    test('produces one instance per matching weekday inside the window', () => {
      const result = expandRecurringItems(
        [weeklyTask],
        '2026-07-06T00:00:00.000Z',
        '2026-07-26T00:00:00.000Z'
      );

      expect(result).toHaveLength(3);
      const dates = result.map(i => new Date(i.scheduled_date));
      // Mondays: Jul 6, Jul 13, Jul 20
      expect(dates.map(d => d.getUTCDate())).toEqual([6, 13, 20]);
      dates.forEach(d => expect(d.getUTCDay()).toBe(1)); // Monday
      expect(result.map(i => i.id)).toEqual(['task-1-r0', 'task-1-r1', 'task-1-r2']);
      result.forEach(i => {
        expect(i.originalId).toBe('task-1');
        expect(i.isInstance).toBe(true);
      });
    });

    test('preserves the task scheduled time-of-day on every instance', () => {
      const result = expandRecurringItems(
        [weeklyTask],
        '2026-07-06T00:00:00.000Z',
        '2026-07-26T00:00:00.000Z'
      );

      result.forEach(instance => {
        const d = new Date(instance.scheduled_date);
        expect(d.getUTCHours()).toBe(14);
        expect(d.getUTCMinutes()).toBe(30);
        expect(d.getUTCSeconds()).toBe(0);
      });
      expect(result[1].scheduled_date).toBe('2026-07-13T14:30:00.000Z');
    });

    test('task without scheduled_date anchors on created_at and lands at midnight', () => {
      const unscheduled = {
        id: 'task-2',
        type: 'task',
        title: 'Weekly review',
        scheduled_date: null,
        created_at: '2026-07-06T14:30:00.000Z',
        rrule: 'FREQ=WEEKLY;BYDAY=MO',
      };

      const result = expandRecurringItems(
        [unscheduled],
        '2026-07-06T00:00:00.000Z',
        '2026-07-20T00:00:00.000Z'
      );

      expect(result.length).toBeGreaterThan(0);
      result.forEach(instance => {
        const d = new Date(instance.scheduled_date);
        expect(d.getUTCHours()).toBe(0);
        expect(d.getUTCMinutes()).toBe(0);
        expect(d.getUTCDay()).toBe(1);
        expect(instance.isInstance).toBe(true);
      });
    });
  });

  describe('invalid rrule fallback', () => {
    test('an unparseable rrule passes the original item through unchanged', () => {
      const broken = {
        id: 'evt-bad',
        type: 'event',
        title: 'Broken recurrence',
        start_time: '2026-07-01T09:00:00.000Z',
        end_time: '2026-07-01T10:00:00.000Z',
        rrule: 'FREQ=NONSENSE',
      };

      const result = expandRecurringItems(
        [broken],
        '2026-07-01T00:00:00.000Z',
        '2026-07-31T00:00:00.000Z'
      );

      expect(result).toHaveLength(1);
      // The very same object is returned — no instance metadata added
      expect(result[0]).toBe(broken);
      expect(result[0].isInstance).toBeUndefined();
      expect(result[0].originalId).toBeUndefined();
      expect(result[0].id).toBe('evt-bad');
      // The failure is logged, not thrown
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    test('completely garbled rrule text also falls back gracefully', () => {
      const garbled = {
        id: 'task-bad',
        type: 'task',
        title: 'Garbled',
        scheduled_date: '2026-07-06T14:30:00.000Z',
        rrule: 'total garbage !!!',
      };

      const result = expandRecurringItems(
        [garbled],
        '2026-07-01T00:00:00.000Z',
        '2026-07-31T00:00:00.000Z'
      );

      expect(result).toEqual([garbled]);
      expect(result[0]).toBe(garbled);
      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });

  describe('non-recurring items', () => {
    test('items without an rrule pass through untouched', () => {
      const plainEvent = {
        id: 'evt-plain',
        type: 'event',
        title: 'One-off meeting',
        start_time: '2026-07-02T11:00:00.000Z',
        end_time: '2026-07-02T12:00:00.000Z',
      };
      const plainTask = {
        id: 'task-plain',
        type: 'task',
        title: 'One-off task',
        scheduled_date: '2026-07-03T09:00:00.000Z',
        rrule: null,
      };

      const result = expandRecurringItems(
        [plainEvent, plainTask],
        '2026-07-01T00:00:00.000Z',
        '2026-07-31T00:00:00.000Z'
      );

      expect(result).toHaveLength(2);
      expect(result[0]).toBe(plainEvent);
      expect(result[1]).toBe(plainTask);
      expect(result[0].isInstance).toBeUndefined();
      expect(result[1].isInstance).toBeUndefined();
    });

    test('non-recurring items pass through even when outside the window', () => {
      const outside = {
        id: 'evt-outside',
        type: 'event',
        title: 'Last year',
        start_time: '2025-01-01T09:00:00.000Z',
        end_time: '2025-01-01T10:00:00.000Z',
      };

      const result = expandRecurringItems(
        [outside],
        '2026-07-01T00:00:00.000Z',
        '2026-07-31T00:00:00.000Z'
      );

      // The engine does no window filtering for non-recurring items
      expect(result).toEqual([outside]);
    });

    test('mixed input keeps plain items and expands recurring ones', () => {
      const plain = {
        id: 'task-plain-2',
        type: 'task',
        title: 'Plain',
        scheduled_date: '2026-07-02T10:00:00.000Z',
      };
      const daily = {
        id: 'evt-daily-2',
        type: 'event',
        title: 'Daily',
        start_time: '2026-07-01T08:00:00.000Z',
        end_time: '2026-07-01T08:15:00.000Z',
        rrule: 'FREQ=DAILY',
      };

      const result = expandRecurringItems(
        [plain, daily],
        '2026-07-01T00:00:00.000Z',
        '2026-07-03T23:59:59.000Z'
      );

      // 1 pass-through + 3 daily instances (Jul 1, 2, 3)
      expect(result).toHaveLength(4);
      expect(result.filter(i => !i.isInstance)).toEqual([plain]);
      expect(result.filter(i => i.isInstance)).toHaveLength(3);
    });

    test('empty input returns an empty array', () => {
      expect(
        expandRecurringItems([], '2026-07-01T00:00:00.000Z', '2026-07-31T00:00:00.000Z')
      ).toEqual([]);
    });
  });
});
