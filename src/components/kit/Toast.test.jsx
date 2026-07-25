/**
 * Tests for the kit Toast + ToastRegion (Astryx Toast re-implemented for Solid).
 * Queries by role/text/label only. Covers rendering (status variants, message
 * alias, action slot, dismiss button), the interaction contract (manual
 * dismiss, auto-hide timing, hover/focus pause) and a11y attributes
 * (role=status/alert, aria-live, aria-atomic, region labeling).
 */
import { render, screen, fireEvent, within } from '@solidjs/testing-library';
import { describe, test, expect, vi, afterEach } from 'vitest';
import { Toast, ToastRegion } from './Toast';

/**
 * The toast root has role="status" for non-error types, but the kit Button
 * inside (dismiss) also carries an sr-only role="status" live region — so
 * pick the status element that actually contains the message.
 */
const getToastByText = (text) =>
  screen.getAllByRole('status').find((el) => el.textContent.includes(text));

describe('Toast', () => {
  describe('rendering', () => {
    test('renders the body as a polite, atomic status', () => {
      render(() => <Toast body="Changes saved" />);
      const toast = getToastByText('Changes saved');
      expect(toast).toBeInTheDocument();
      expect(toast).toHaveAttribute('aria-live', 'polite');
      expect(toast).toHaveAttribute('aria-atomic', 'true');
    });

    test('accepts `message` as an alias for body (toastStore contract)', () => {
      render(() => <Toast message="Copied to clipboard" type="success" />);
      expect(screen.getByText('Copied to clipboard')).toBeInTheDocument();
    });

    test('defaults to the info variant', () => {
      render(() => <Toast body="FYI" />);
      expect(getToastByText('FYI')).toHaveAttribute('data-type', 'info');
    });

    test('success and warning variants expose their type and stay role=status', () => {
      render(() => (
        <>
          <Toast body="Saved" type="success" />
          <Toast body="Careful" type="warning" />
        </>
      ));
      expect(getToastByText('Saved')).toHaveAttribute('data-type', 'success');
      expect(getToastByText('Careful')).toHaveAttribute('data-type', 'warning');
    });

    test('error variant renders an assertive alert', () => {
      render(() => <Toast body="Save failed" type="error" />);
      const toast = screen.getByRole('alert');
      expect(toast).toHaveTextContent('Save failed');
      expect(toast).toHaveAttribute('aria-live', 'assertive');
      expect(toast).toHaveAttribute('data-type', 'error');
    });

    test('unknown type falls back to the info variant', () => {
      render(() => <Toast body="Mystery" type="celebration" />);
      expect(getToastByText('Mystery')).toHaveAttribute('data-type', 'info');
    });

    test('always renders a labeled dismiss button', () => {
      render(() => <Toast body="Dismissable" />);
      expect(
        screen.getByRole('button', { name: 'Dismiss notification' }),
      ).toBeInTheDocument();
    });

    test('endContent renders a working trailing action', () => {
      const onUndo = vi.fn();
      render(() => (
        <Toast
          body="Item deleted"
          endContent={
            <button type="button" onClick={onUndo}>
              Undo
            </button>
          }
        />
      ));
      fireEvent.click(screen.getByRole('button', { name: 'Undo' }));
      expect(onUndo).toHaveBeenCalledTimes(1);
    });
  });

  describe('dismiss interaction', () => {
    test('clicking the dismiss button calls onDismiss with "manual"', () => {
      const onDismiss = vi.fn();
      render(() => <Toast body="Bye" onDismiss={onDismiss} />);
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledWith('manual');
    });

    test('error toasts can still be dismissed manually', () => {
      const onDismiss = vi.fn();
      render(() => <Toast body="Broken" type="error" onDismiss={onDismiss} />);
      fireEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
      expect(onDismiss).toHaveBeenCalledWith('manual');
    });
  });

  describe('auto-hide', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

    test('info toasts auto-dismiss after the default 5000ms', () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      render(() => <Toast body="Auto" onDismiss={onDismiss} />);
      vi.advanceTimersByTime(4999);
      expect(onDismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onDismiss).toHaveBeenCalledTimes(1);
      expect(onDismiss).toHaveBeenCalledWith('auto');
    });

    test('autoHideDuration overrides the default', () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      render(() => <Toast body="Quick" autoHideDuration={1000} onDismiss={onDismiss} />);
      vi.advanceTimersByTime(999);
      expect(onDismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onDismiss).toHaveBeenCalledWith('auto');
    });

    test('error toasts persist until dismissed by default', () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      render(() => <Toast body="Stays" type="error" onDismiss={onDismiss} />);
      vi.advanceTimersByTime(60000);
      expect(onDismiss).not.toHaveBeenCalled();
    });

    test('isAutoHide=false disables auto-dismiss for info toasts', () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      render(() => <Toast body="Pinned" isAutoHide={false} onDismiss={onDismiss} />);
      vi.advanceTimersByTime(60000);
      expect(onDismiss).not.toHaveBeenCalled();
    });

    test('isAutoHide=true opts an error toast into auto-dismiss', () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      render(() => <Toast body="Brief error" type="error" isAutoHide onDismiss={onDismiss} />);
      vi.advanceTimersByTime(5000);
      expect(onDismiss).toHaveBeenCalledWith('auto');
    });

    test('hover pauses the timer and leaving resumes it', () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      render(() => <Toast body="Hover me" onDismiss={onDismiss} />);
      const toast = getToastByText('Hover me');
      vi.advanceTimersByTime(3000);
      fireEvent.mouseEnter(toast);
      vi.advanceTimersByTime(60000);
      expect(onDismiss).not.toHaveBeenCalled();
      fireEvent.mouseLeave(toast);
      // 2000ms of the original 5000 remained when the pointer entered.
      vi.advanceTimersByTime(1999);
      expect(onDismiss).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(onDismiss).toHaveBeenCalledWith('auto');
    });

    test('focus inside pauses the timer and blur resumes it', () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      render(() => <Toast body="Focus me" onDismiss={onDismiss} />);
      const toast = getToastByText('Focus me');
      fireEvent.focusIn(toast);
      vi.advanceTimersByTime(60000);
      expect(onDismiss).not.toHaveBeenCalled();
      fireEvent.focusOut(toast);
      vi.advanceTimersByTime(5000);
      expect(onDismiss).toHaveBeenCalledWith('auto');
    });
  });
});

describe('ToastRegion', () => {
  test('renders a polite live region named Notifications', () => {
    render(() => <ToastRegion />);
    const region = screen.getByRole('region', { name: 'Notifications' });
    expect(region).toHaveAttribute('aria-live', 'polite');
  });

  test('label prop customizes the accessible name', () => {
    render(() => <ToastRegion label="Alerts" />);
    expect(screen.getByRole('region', { name: 'Alerts' })).toBeInTheDocument();
  });

  test('stacks toast children inside the region', () => {
    render(() => (
      <ToastRegion>
        <Toast body="First" isAutoHide={false} />
        <Toast body="Second" isAutoHide={false} />
      </ToastRegion>
    ));
    const region = screen.getByRole('region', { name: 'Notifications' });
    const toasts = within(region)
      .getAllByRole('status')
      .filter((el) => el.textContent.length > 0);
    expect(toasts).toHaveLength(2);
    expect(toasts[0]).toHaveTextContent('First');
    expect(toasts[1]).toHaveTextContent('Second');
  });

  test('defaults to the bottomEnd position and accepts alternatives', () => {
    render(() => (
      <>
        <ToastRegion label="Default corner" />
        <ToastRegion label="Top corner" position="topStart" />
      </>
    ));
    expect(screen.getByRole('region', { name: 'Default corner' })).toHaveAttribute(
      'data-position',
      'bottomEnd',
    );
    expect(screen.getByRole('region', { name: 'Top corner' })).toHaveAttribute(
      'data-position',
      'topStart',
    );
  });
});
