/**
 * Tests for the kit Dialog (Astryx Dialog re-implemented for Solid).
 * Queries by role/text/label only. Covers the Modal.jsx contract it
 * replaces (backdrop closes, content click doesn't, swipe-to-dismiss)
 * plus the new a11y contract (role/aria wiring, Escape, focus trap,
 * named close button).
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, beforeAll, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { Dialog, DialogHeader, DialogBody, DialogFooter } from './Dialog';
import { Popover } from './Popover';

beforeAll(() => {
  // jsdom has no Web Animations API; solid-transition-group's enter/exit
  // hooks call el.animate(). Stub it so open/close transitions don't throw.
  // The stub's onfinish never fires, so exiting elements are not removed
  // from the DOM — close-path tests assert on onClose being called (the
  // behavioral contract), not on DOM removal.
  if (!Element.prototype.animate) {
    Element.prototype.animate = vi.fn(() => ({
      onfinish: null,
      cancel: vi.fn(),
      finished: Promise.resolve(),
    }));
  }
});

const renderDialog = (props = {}) => {
  const onClose = vi.fn();
  const utils = render(() => (
    <Dialog open={true} onClose={onClose} {...props}>
      <DialogHeader title="Example title" subtitle="Example subtitle" />
      <DialogBody>
        <p>Body content</p>
      </DialogBody>
      <DialogFooter>
        <button type="button">Confirm</button>
      </DialogFooter>
    </Dialog>
  ));
  return { onClose, ...utils };
};

describe('Dialog', () => {
  describe('rendering', () => {
    test('renders dialog with header, body and footer content when open', () => {
      renderDialog();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Example title' })).toBeInTheDocument();
      expect(screen.getByText('Example subtitle')).toBeInTheDocument();
      expect(screen.getByText('Body content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    test('renders nothing when open is false', () => {
      const onClose = vi.fn();
      render(() => (
        <Dialog open={false} onClose={onClose}>
          <DialogHeader title="Hidden title" />
          <DialogBody>Hidden content</DialogBody>
        </Dialog>
      ));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    });

    test('opens reactively when the open prop becomes true', () => {
      const [open, setOpen] = createSignal(false);
      render(() => (
        <Dialog open={open()} onClose={() => setOpen(false)}>
          <DialogHeader title="Reactive title" />
          <DialogBody>Reactive content</DialogBody>
        </Dialog>
      ));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      setOpen(true);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Reactive content')).toBeInTheDocument();
    });

    test.each(['sm', 'md', 'lg'])('renders size="%s" width on the dialog panel', (size) => {
      const widths = { sm: 'sm:w-[400px]', md: 'sm:w-[500px]', lg: 'sm:w-[850px]' };
      const { unmount } = renderDialog({ size });
      expect(screen.getByRole('dialog').className).toContain(widths[size]);
      unmount();
    });
  });

  describe('accessibility attributes', () => {
    test('has aria-modal="true"', () => {
      renderDialog();
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    test('is labelled by the DialogHeader title (aria-labelledby)', () => {
      renderDialog();
      // Accessible-name computation resolves aria-labelledby → this only
      // matches if the wiring to the header title is correct.
      const dialog = screen.getByRole('dialog', { name: 'Example title' });
      const labelId = dialog.getAttribute('aria-labelledby');
      expect(labelId).toBeTruthy();
      expect(screen.getByRole('heading', { level: 2, name: 'Example title' }).id).toBe(labelId);
    });

    test('close button has aria-label="Close"', () => {
      renderDialog();
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });
  });

  describe('close paths', () => {
    test('close button click calls onClose', () => {
      const { onClose } = renderDialog();
      fireEvent.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('backdrop click calls onClose', () => {
      const { onClose } = renderDialog();
      // The backdrop is the dialog's overlay parent; it has no role by design.
      const backdrop = screen.getByRole('dialog').parentElement;
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('clicking dialog content does NOT call onClose', () => {
      const { onClose } = renderDialog();
      fireEvent.click(screen.getByText('Body content'));
      fireEvent.click(screen.getByRole('dialog'));
      expect(onClose).not.toHaveBeenCalled();
    });

    test('Escape calls onClose', () => {
      const { onClose } = renderDialog();
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('Escape does nothing when the dialog is closed', () => {
      const onClose = vi.fn();
      render(() => (
        <Dialog open={false} onClose={onClose}>
          <DialogBody>Never shown</DialogBody>
        </Dialog>
      ));
      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
    });

    test('Escape inside a nested Popover closes only the Popover, not the outer Dialog', () => {
      // Regression test for the root cause: the Dialog and the Popover each
      // used to register their own document keydown listener, and — because
      // same-target listeners fire in registration order — the Dialog
      // (mounted first) always "won" Escape over a Popover opened later
      // inside it. The shared overlay stack instead hands Escape to
      // whichever layer was pushed most recently (the Popover here).
      const onDialogClose = vi.fn();
      let anchor;
      function Harness() {
        const [popoverOpen, setPopoverOpen] = createSignal(false);
        return (
          <Dialog open={true} onClose={onDialogClose}>
            <DialogHeader title="Outer dialog" />
            <DialogBody>
              <button ref={anchor} type="button" onClick={() => setPopoverOpen(true)}>
                Open popover
              </button>
              <Popover
                open={popoverOpen()}
                onClose={() => setPopoverOpen(false)}
                anchorRef={() => anchor}
                label="Nested popover"
              >
                <p>Popover content</p>
              </Popover>
            </DialogBody>
          </Dialog>
        );
      }
      render(() => <Harness />);

      fireEvent.click(screen.getByRole('button', { name: 'Open popover' }));
      expect(screen.getByRole('dialog', { name: 'Nested popover' })).toBeInTheDocument();

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('dialog', { name: 'Nested popover' })).not.toBeInTheDocument();
      expect(onDialogClose).not.toHaveBeenCalled();
      // The outer dialog is untouched by that Escape press.
      expect(screen.getByRole('dialog', { name: 'Outer dialog' })).toBeInTheDocument();

      // A second Escape, with the popover already closed, now reaches the
      // dialog (it's the only — and therefore topmost — layer left).
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onDialogClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('focus management', () => {
    test('focus moves to the dialog on open', () => {
      renderDialog();
      expect(screen.getByRole('dialog')).toHaveFocus();
    });

    test('focus restores to the trigger on close', () => {
      const [open, setOpen] = createSignal(false);
      render(() => (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open dialog
          </button>
          <Dialog open={open()} onClose={() => setOpen(false)}>
            <DialogHeader title="Focus test" />
            <DialogBody>Focus content</DialogBody>
          </Dialog>
        </>
      ));
      const trigger = screen.getByRole('button', { name: 'Open dialog' });
      trigger.focus();
      fireEvent.click(trigger);
      expect(screen.getByRole('dialog')).toHaveFocus();
      setOpen(false);
      expect(trigger).toHaveFocus();
    });

    test('focus restoration is skipped when another element has since claimed focus', () => {
      // FIX #3: onCleanup used to unconditionally call triggerEl.focus(),
      // which could steal focus from a different overlay/control that took
      // it after this dialog opened but before it closed. Restoration
      // should only happen if focus is still "ours to give back" (on the
      // body, or still inside this dialog's panel).
      const [open, setOpen] = createSignal(false);
      render(() => (
        <>
          <button type="button" onClick={() => setOpen(true)}>
            Open dialog
          </button>
          <button type="button">Other overlay control</button>
          <Dialog open={open()} onClose={() => setOpen(false)}>
            <DialogHeader title="Focus skip test" />
            <DialogBody>Focus content</DialogBody>
          </Dialog>
        </>
      ));
      const trigger = screen.getByRole('button', { name: 'Open dialog' });
      trigger.focus();
      fireEvent.click(trigger);
      expect(screen.getByRole('dialog')).toHaveFocus();

      // Simulate another overlay (e.g. a second dialog, or a nested
      // control) claiming focus before this one finishes closing.
      const other = screen.getByRole('button', { name: 'Other overlay control' });
      other.focus();

      setOpen(false);
      expect(other).toHaveFocus();
      expect(trigger).not.toHaveFocus();
    });

    test('Tab on the last focusable element wraps to the first', () => {
      renderDialog();
      const confirm = screen.getByRole('button', { name: 'Confirm' });
      confirm.focus();
      fireEvent.keyDown(confirm, { key: 'Tab' });
      expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
    });

    test('Shift+Tab from the dialog itself wraps to the last focusable element', () => {
      renderDialog();
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveFocus();
      fireEvent.keyDown(dialog, { key: 'Tab', shiftKey: true });
      expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();
    });

    test('Shift+Tab on the first focusable element wraps to the last', () => {
      renderDialog();
      const closeButton = screen.getByRole('button', { name: 'Close' });
      closeButton.focus();
      fireEvent.keyDown(closeButton, { key: 'Tab', shiftKey: true });
      expect(screen.getByRole('button', { name: 'Confirm' })).toHaveFocus();
    });
  });

  describe('mobile bottom-sheet swipe-to-dismiss (ported from Modal.jsx)', () => {
    test('dragging down past the threshold calls onClose', () => {
      const { onClose } = renderDialog();
      const dialog = screen.getByRole('dialog');
      fireEvent.touchStart(dialog, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(dialog, { touches: [{ clientY: 260 }] });
      fireEvent.touchEnd(dialog);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('a small drag does NOT close', () => {
      const { onClose } = renderDialog();
      const dialog = screen.getByRole('dialog');
      fireEvent.touchStart(dialog, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(dialog, { touches: [{ clientY: 150 }] });
      fireEvent.touchEnd(dialog);
      expect(onClose).not.toHaveBeenCalled();
    });

    test('dragging down past the threshold then back up before release does NOT close', () => {
      // FIX #2: handleTouchMove used to only update touchDelta while
      // dragging down (`if (diff > 0) setTouchDelta(diff)`), so reversing
      // the drag left it stuck at its max value. A cancelled swipe (ending
      // back at/above the start) must not close the dialog.
      const { onClose } = renderDialog();
      const dialog = screen.getByRole('dialog');
      fireEvent.touchStart(dialog, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(dialog, { touches: [{ clientY: 260 }] }); // past the 100px threshold
      fireEvent.touchMove(dialog, { touches: [{ clientY: 100 }] }); // dragged back to the start
      fireEvent.touchEnd(dialog);
      expect(onClose).not.toHaveBeenCalled();
    });

    test('reversing a drag tracks the finger back down to 0 instead of clamping at the max', () => {
      const { unmount } = renderDialog();
      const dialog = screen.getByRole('dialog');
      fireEvent.touchStart(dialog, { touches: [{ clientY: 100 }] });
      fireEvent.touchMove(dialog, { touches: [{ clientY: 260 }] });
      expect(dialog.style.transform).toBe('translateY(160px)');
      fireEvent.touchMove(dialog, { touches: [{ clientY: 180 }] });
      expect(dialog.style.transform).toBe('translateY(80px)');
      fireEvent.touchMove(dialog, { touches: [{ clientY: 100 }] });
      expect(dialog.style.transform).toBe('translateY(0px)');
      unmount();
    });

    test('dragging up does NOT close', () => {
      const { onClose } = renderDialog();
      const dialog = screen.getByRole('dialog');
      fireEvent.touchStart(dialog, { touches: [{ clientY: 300 }] });
      fireEvent.touchMove(dialog, { touches: [{ clientY: 50 }] });
      fireEvent.touchEnd(dialog);
      expect(onClose).not.toHaveBeenCalled();
    });
  });
});
