/**
 * PRE-REFACTOR characterization tests for the toast system.
 *
 * Pins the BEHAVIOR of src/stores/toastStore.js + src/components/ui/ToastProvider.jsx
 * before the UI is rewritten (Astryx Toast). Queries by text only — never by
 * class or DOM structure.
 *
 * Contract pinned here:
 *  - toastStore.add(message) pushes a toast into state; ToastProvider renders its message
 *  - a toast auto-dismisses after its duration (default 3000ms, custom durations honored)
 *  - multiple toasts stack: all visible at once, each dismissed on its own clock
 *  - store-level add/remove: add assigns unique ids, remove(id) drops exactly that toast,
 *    remove of an unknown id is a no-op
 *
 * Note: toastStore is a module-level singleton, so tests drain leftover
 * toasts in beforeEach rather than re-importing the module.
 */
import { render, screen } from '@solidjs/testing-library';
import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import ToastProvider from '../../src/components/ui/ToastProvider';
import { toastStore } from '../../src/stores/toastStore';

beforeEach(() => {
  vi.useFakeTimers();
  // Singleton store: drop anything left over from a previous test and
  // flush any pending auto-dismiss timers so they can't fire mid-test.
  for (const t of [...toastStore.state.toasts]) toastStore.remove(t.id);
  vi.clearAllTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('toast system (pre-refactor characterization)', () => {
  describe('rendering', () => {
    test('adding a toast renders its message', () => {
      render(() => <ToastProvider />);
      toastStore.add('Task saved');
      expect(screen.getByText('Task saved')).toBeInTheDocument();
    });

    test('renders no messages when the store is empty', () => {
      render(() => <ToastProvider />);
      expect(screen.queryByText('Task saved')).not.toBeInTheDocument();
      expect(toastStore.state.toasts).toHaveLength(0);
    });

    test('error toasts render their message too (type does not affect visibility)', () => {
      render(() => <ToastProvider />);
      toastStore.add('Something went wrong', 'error');
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('auto-dismiss', () => {
    test('a toast auto-dismisses after the default 3000ms duration', () => {
      render(() => <ToastProvider />);
      toastStore.add('Ephemeral');
      expect(screen.getByText('Ephemeral')).toBeInTheDocument();

      // Just before the deadline it is still visible.
      vi.advanceTimersByTime(2999);
      expect(screen.getByText('Ephemeral')).toBeInTheDocument();

      // At the deadline it is gone.
      vi.advanceTimersByTime(1);
      expect(screen.queryByText('Ephemeral')).not.toBeInTheDocument();
      expect(toastStore.state.toasts).toHaveLength(0);
    });

    test('a custom duration is honored', () => {
      render(() => <ToastProvider />);
      toastStore.add('Slow toast', 'success', 10000);

      vi.advanceTimersByTime(3000); // default duration passes — still there
      expect(screen.getByText('Slow toast')).toBeInTheDocument();

      vi.advanceTimersByTime(7000);
      expect(screen.queryByText('Slow toast')).not.toBeInTheDocument();
    });
  });

  describe('stacking', () => {
    test('multiple toasts are all visible at once', () => {
      render(() => <ToastProvider />);
      toastStore.add('First');
      toastStore.add('Second');
      toastStore.add('Third');

      expect(screen.getByText('First')).toBeInTheDocument();
      expect(screen.getByText('Second')).toBeInTheDocument();
      expect(screen.getByText('Third')).toBeInTheDocument();
      expect(toastStore.state.toasts).toHaveLength(3);
    });

    test('stacked toasts dismiss independently, each on its own clock', () => {
      render(() => <ToastProvider />);
      toastStore.add('Quick', 'success', 1000);
      vi.advanceTimersByTime(500);
      toastStore.add('Steady', 'success', 1000);

      // 500ms later: Quick (age 1000) is gone, Steady (age 500) remains.
      vi.advanceTimersByTime(500);
      expect(screen.queryByText('Quick')).not.toBeInTheDocument();
      expect(screen.getByText('Steady')).toBeInTheDocument();

      vi.advanceTimersByTime(500);
      expect(screen.queryByText('Steady')).not.toBeInTheDocument();
    });
  });

  describe('store-level add/remove', () => {
    test('add pushes a toast with message, type, and a unique id', () => {
      toastStore.add('Hello', 'error');
      expect(toastStore.state.toasts).toHaveLength(1);
      const toast = toastStore.state.toasts[0];
      expect(toast.message).toBe('Hello');
      expect(toast.type).toBe('error');
      expect(toast.id).toEqual(expect.any(Number));
    });

    test('add defaults type to success', () => {
      toastStore.add('Defaulted');
      expect(toastStore.state.toasts[0].type).toBe('success');
    });

    test('ids are unique across toasts', () => {
      toastStore.add('One');
      toastStore.add('Two');
      const [a, b] = toastStore.state.toasts;
      expect(a.id).not.toBe(b.id);
    });

    test('remove(id) removes exactly that toast, leaving others', () => {
      toastStore.add('Keep me');
      toastStore.add('Remove me');
      const target = toastStore.state.toasts.find((t) => t.message === 'Remove me');

      toastStore.remove(target.id);

      expect(toastStore.state.toasts).toHaveLength(1);
      expect(toastStore.state.toasts[0].message).toBe('Keep me');
    });

    test('remove of an unknown id is a no-op', () => {
      toastStore.add('Survivor');
      toastStore.remove(999999);
      expect(toastStore.state.toasts).toHaveLength(1);
      expect(toastStore.state.toasts[0].message).toBe('Survivor');
    });

    test('manual remove before the duration elapses does not throw when the timer later fires', () => {
      render(() => <ToastProvider />);
      toastStore.add('Removed early');
      const id = toastStore.state.toasts[0].id;
      toastStore.remove(id);
      expect(screen.queryByText('Removed early')).not.toBeInTheDocument();

      // The auto-dismiss timer still fires later; it must be harmless.
      expect(() => vi.advanceTimersByTime(3000)).not.toThrow();
      expect(toastStore.state.toasts).toHaveLength(0);
    });
  });
});
