/**
 * Tests for the kit Popover (Astryx Popover re-implemented for Solid).
 * Queries by role/label/text only. Covers rendering (portal, role,
 * accessible name), the dismiss contract (Escape, outside click, flags),
 * focus management (autofocus in, restore to trigger, Tab trap), and the
 * exported computePopoverPosition placement math (flip + clamp) directly,
 * since jsdom reports zero-size bounding rects.
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { Popover, computePopoverPosition } from './Popover';

function Harness(props) {
  const [open, setOpen] = createSignal(props.initialOpen ?? false);
  let anchor;
  const close = () => {
    props.onClose?.();
    setOpen(false);
  };
  return (
    <>
      <button ref={anchor} onClick={() => setOpen(!open())}>
        Open popover
      </button>
      <button>Elsewhere</button>
      <Popover
        open={open()}
        onClose={close}
        anchorRef={() => anchor}
        label="Quick actions"
        width={props.width}
        hasLightDismiss={props.hasLightDismiss}
        hasEscapeDismiss={props.hasEscapeDismiss}
        hasAutoFocus={props.hasAutoFocus}
      >
        <p>Popover body</p>
        <button>First action</button>
        <button>Last action</button>
      </Popover>
    </>
  );
}

describe('Popover', () => {
  describe('rendering', () => {
    test('renders nothing while closed', () => {
      render(() => <Harness />);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Popover body')).not.toBeInTheDocument();
    });

    test('open renders a labelled dialog in a portal with its content', () => {
      render(() => <Harness initialOpen />);
      const dialog = screen.getByRole('dialog', { name: 'Quick actions' });
      expect(dialog).toBeInTheDocument();
      expect(screen.getByText('Popover body')).toBeInTheDocument();
      // Portal-rendered: the dialog lives outside the render container.
      expect(dialog.closest('body')).toBe(document.body);
    });

    test('toggling the trigger opens and closes the popover', async () => {
      render(() => <Harness />);
      const trigger = screen.getByRole('button', { name: 'Open popover' });
      fireEvent.click(trigger);
      expect(await screen.findByRole('dialog')).toBeInTheDocument();
      fireEvent.click(trigger);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('applies the width prop to the panel', () => {
      render(() => <Harness initialOpen width={240} />);
      expect(screen.getByRole('dialog')).toHaveStyle({ width: '240px' });
    });
  });

  describe('dismiss contract', () => {
    test('Escape closes and calls onClose', () => {
      const onClose = vi.fn();
      render(() => <Harness initialOpen onClose={onClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('mousedown outside closes', () => {
      const onClose = vi.fn();
      render(() => <Harness initialOpen onClose={onClose} />);
      fireEvent.mouseDown(document.body);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    test('mousedown inside the popover does not close', () => {
      const onClose = vi.fn();
      render(() => <Harness initialOpen onClose={onClose} />);
      fireEvent.mouseDown(screen.getByText('Popover body'));
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('mousedown on the anchor does not light-dismiss (trigger toggles instead)', () => {
      const onClose = vi.fn();
      render(() => <Harness initialOpen onClose={onClose} />);
      fireEvent.mouseDown(screen.getByRole('button', { name: 'Open popover' }));
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    test('hasLightDismiss={false} ignores outside clicks but Escape still closes', () => {
      const onClose = vi.fn();
      render(() => <Harness initialOpen hasLightDismiss={false} onClose={onClose} />);
      fireEvent.mouseDown(document.body);
      expect(onClose).not.toHaveBeenCalled();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('hasEscapeDismiss={false} ignores Escape', () => {
      const onClose = vi.fn();
      render(() => <Harness initialOpen hasEscapeDismiss={false} onClose={onClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('focus management', () => {
    test('focuses the first focusable element on open and restores the trigger on close', () => {
      render(() => <Harness />);
      const trigger = screen.getByRole('button', { name: 'Open popover' });
      trigger.focus();
      fireEvent.click(trigger);
      expect(screen.getByRole('button', { name: 'First action' })).toHaveFocus();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(trigger).toHaveFocus();
    });

    test('hasAutoFocus={false} leaves focus on the trigger', () => {
      render(() => <Harness hasAutoFocus={false} />);
      const trigger = screen.getByRole('button', { name: 'Open popover' });
      trigger.focus();
      fireEvent.click(trigger);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });

    test('Tab from the last focusable wraps to the first (focus trap)', () => {
      render(() => <Harness initialOpen />);
      const first = screen.getByRole('button', { name: 'First action' });
      const last = screen.getByRole('button', { name: 'Last action' });
      last.focus();
      fireEvent.keyDown(last, { key: 'Tab' });
      expect(first).toHaveFocus();
      fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
      expect(last).toHaveFocus();
    });
  });

  describe('computePopoverPosition', () => {
    const rect = (left, top, width, height) => ({
      left,
      top,
      width,
      height,
      right: left + width,
      bottom: top + height,
    });
    const viewport = { viewportWidth: 1000, viewportHeight: 800 };

    test('places below the anchor, start-aligned, with the gap', () => {
      const pos = computePopoverPosition({
        anchorRect: rect(100, 100, 80, 40),
        panelRect: rect(0, 0, 200, 150),
        placement: 'below',
        alignment: 'start',
        gap: 4,
        padding: 8,
        ...viewport,
      });
      expect(pos).toEqual({ top: 144, left: 100, placement: 'below' });
    });

    test('flips above when there is no room below but room above', () => {
      const pos = computePopoverPosition({
        anchorRect: rect(100, 700, 80, 40),
        panelRect: rect(0, 0, 200, 150),
        placement: 'below',
        gap: 4,
        padding: 8,
        ...viewport,
      });
      expect(pos.placement).toBe('above');
      expect(pos.top).toBe(700 - 4 - 150);
    });

    test('keeps the preferred side when neither side fits', () => {
      const pos = computePopoverPosition({
        anchorRect: rect(100, 380, 80, 40),
        panelRect: rect(0, 0, 200, 700),
        placement: 'below',
        gap: 4,
        padding: 8,
        ...viewport,
      });
      expect(pos.placement).toBe('below');
    });

    test('center and end alignment position along the cross axis', () => {
      const anchorRect = rect(400, 100, 100, 40);
      const panelRect = rect(0, 0, 200, 100);
      const base = { anchorRect, panelRect, placement: 'below', gap: 4, padding: 8, ...viewport };
      expect(computePopoverPosition({ ...base, alignment: 'center' }).left).toBe(
        400 + (100 - 200) / 2,
      );
      expect(computePopoverPosition({ ...base, alignment: 'end' }).left).toBe(500 - 200);
    });

    test('clamps the cross axis inside the viewport padding', () => {
      const pos = computePopoverPosition({
        anchorRect: rect(2, 100, 40, 40),
        panelRect: rect(0, 0, 300, 100),
        placement: 'below',
        alignment: 'end', // would put left at -258
        gap: 4,
        padding: 8,
        ...viewport,
      });
      expect(pos.left).toBe(8);
    });

    test('end placement sits after the anchor and flips to start at the right edge', () => {
      const roomy = computePopoverPosition({
        anchorRect: rect(100, 100, 80, 40),
        panelRect: rect(0, 0, 200, 150),
        placement: 'end',
        gap: 4,
        padding: 8,
        ...viewport,
      });
      expect(roomy).toMatchObject({ left: 184, top: 100, placement: 'end' });

      const cramped = computePopoverPosition({
        anchorRect: rect(900, 100, 80, 40),
        panelRect: rect(0, 0, 200, 150),
        placement: 'end',
        gap: 4,
        padding: 8,
        ...viewport,
      });
      expect(cramped.placement).toBe('start');
      expect(cramped.left).toBe(900 - 4 - 200);
    });
  });
});
