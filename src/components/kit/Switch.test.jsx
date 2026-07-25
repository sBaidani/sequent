/**
 * Tests for the kit Switch (Astryx Switch re-implemented for Solid).
 * Queries by role/text/label only. Covers rendering (label, description,
 * status, label position/spacing), the interaction contract (click, label
 * click, Space/Enter, controlled value, changeAction optimistic state) and
 * a11y attributes (role=switch, aria-checked, aria-disabled, aria-invalid,
 * aria-busy, aria-describedby).
 */
import { render, screen, fireEvent, waitFor } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { describe, test, expect, vi } from 'vitest';
import { Switch } from './Switch';

describe('Switch', () => {
  describe('rendering', () => {
    test('renders a switch with the label as its accessible name', () => {
      render(() => <Switch label="Enable notifications" value={false} />);
      const input = screen.getByRole('switch', { name: 'Enable notifications' });
      expect(input).toBeInTheDocument();
      expect(screen.getByText('Enable notifications')).toBeInTheDocument();
    });

    test('label association: the input is reachable via its label', () => {
      render(() => <Switch label="Dark mode" value={false} />);
      expect(screen.getByLabelText('Dark mode')).toBe(screen.getByRole('switch'));
    });

    test('reflects value=false as aria-checked=false / unchecked', () => {
      render(() => <Switch label="Off switch" value={false} />);
      const input = screen.getByRole('switch', { name: 'Off switch' });
      expect(input).toHaveAttribute('aria-checked', 'false');
      expect(input).not.toBeChecked();
    });

    test('reflects value=true as aria-checked=true / checked', () => {
      render(() => <Switch label="On switch" value={true} />);
      const input = screen.getByRole('switch', { name: 'On switch' });
      expect(input).toHaveAttribute('aria-checked', 'true');
      expect(input).toBeChecked();
    });

    test('isLabelHidden keeps the accessible name without visible text', () => {
      render(() => <Switch label="Hidden label" value={false} isLabelHidden />);
      expect(screen.getByRole('switch', { name: 'Hidden label' })).toBeInTheDocument();
      // sr-only text is still in the document but visually hidden; the key
      // contract is that the accessible name survives.
      expect(screen.getByLabelText('Hidden label')).toBeInTheDocument();
    });

    test('description renders and becomes the accessible description', () => {
      render(() => (
        <Switch label="Sounds" description="Play a sound on new messages" value={false} />
      ));
      expect(screen.getByText('Play a sound on new messages')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Sounds' })).toHaveAccessibleDescription(
        'Play a sound on new messages',
      );
    });

    test('labelPosition=start renders the label before the switch', () => {
      render(() => <Switch label="Label first" value={false} labelPosition="start" />);
      const label = screen.getByText('Label first');
      const input = screen.getByRole('switch', { name: 'Label first' });
      expect(label.compareDocumentPosition(input) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    test('default labelPosition=end renders the switch before the label', () => {
      render(() => <Switch label="Switch first" value={false} />);
      const label = screen.getByText('Switch first');
      const input = screen.getByRole('switch', { name: 'Switch first' });
      expect(input.compareDocumentPosition(label) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    test('isRequired sets the required attribute', () => {
      render(() => <Switch label="Must accept" value={false} isRequired />);
      expect(screen.getByRole('switch', { name: /Must accept/ })).toBeRequired();
    });

    test('isOptional renders an "(optional)" hint', () => {
      render(() => <Switch label="Newsletter" value={false} isOptional />);
      expect(screen.getByText('(optional)')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    test('clicking calls onChange with the next checked state', () => {
      const onChange = vi.fn();
      render(() => <Switch label="Toggle me" value={false} onChange={onChange} />);
      fireEvent.click(screen.getByRole('switch', { name: 'Toggle me' }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toBe(true);
    });

    test('is controlled: without a value update the DOM state reverts', () => {
      render(() => <Switch label="Controlled" value={false} />);
      const input = screen.getByRole('switch', { name: 'Controlled' });
      fireEvent.click(input);
      expect(input).not.toBeChecked();
      expect(input).toHaveAttribute('aria-checked', 'false');
    });

    test('toggles when the consumer updates the value from onChange', () => {
      const [on, setOn] = createSignal(false);
      render(() => <Switch label="Live toggle" value={on()} onChange={setOn} />);
      const input = screen.getByRole('switch', { name: 'Live toggle' });
      fireEvent.click(input);
      expect(input).toBeChecked();
      expect(input).toHaveAttribute('aria-checked', 'true');
      fireEvent.click(input);
      expect(input).not.toBeChecked();
      expect(input).toHaveAttribute('aria-checked', 'false');
    });

    test('clicking the label toggles the switch', () => {
      const onChange = vi.fn();
      render(() => <Switch label="Click label" value={false} onChange={onChange} />);
      fireEvent.click(screen.getByText('Click label'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toBe(true);
    });

    test('Space toggles via keyboard', () => {
      const onChange = vi.fn();
      render(() => <Switch label="Space toggle" value={false} onChange={onChange} />);
      const input = screen.getByRole('switch', { name: 'Space toggle' });
      input.focus();
      fireEvent.keyDown(input, { key: ' ' });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toBe(true);
    });

    test('Enter toggles via keyboard', () => {
      const onChange = vi.fn();
      render(() => <Switch label="Enter toggle" value={true} onChange={onChange} />);
      const input = screen.getByRole('switch', { name: 'Enter toggle' });
      input.focus();
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toBe(false);
    });

    test('other keys do not toggle', () => {
      const onChange = vi.fn();
      render(() => <Switch label="Arrow key" value={false} onChange={onChange} />);
      fireEvent.keyDown(screen.getByRole('switch', { name: 'Arrow key' }), {
        key: 'ArrowRight',
      });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('disabled', () => {
    test('isDisabled disables the input and blocks onChange', () => {
      const onChange = vi.fn();
      render(() => <Switch label="No touching" value={false} isDisabled onChange={onChange} />);
      const input = screen.getByRole('switch', { name: 'No touching' });
      expect(input).toBeDisabled();
      fireEvent.click(input);
      expect(onChange).not.toHaveBeenCalled();
    });

    test('disabledMessage keeps the switch focusable via aria-disabled and exposes the reason', () => {
      const onChange = vi.fn();
      render(() => (
        <Switch
          label="Org managed"
          value={false}
          isDisabled
          disabledMessage="Notifications are turned off org-wide"
          onChange={onChange}
        />
      ));
      const input = screen.getByRole('switch', { name: 'Org managed' });
      expect(input).not.toBeDisabled();
      expect(input).toHaveAttribute('aria-disabled', 'true');
      input.focus();
      expect(input).toHaveFocus();
      expect(input).toHaveAccessibleDescription('Notifications are turned off org-wide');
      // Toggling stays blocked.
      fireEvent.click(input);
      expect(onChange).not.toHaveBeenCalled();
      expect(input).not.toBeChecked();
      fireEvent.keyDown(input, { key: ' ' });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('status', () => {
    test('error status shows the message and sets aria-invalid', () => {
      render(() => (
        <Switch
          label="Sync"
          value={false}
          status={{ type: 'error', message: 'Sync could not be enabled' }}
        />
      ));
      const input = screen.getByRole('switch', { name: 'Sync' });
      expect(screen.getByText('Sync could not be enabled')).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription('Sync could not be enabled');
    });

    test('non-error status shows the message without aria-invalid', () => {
      render(() => (
        <Switch label="Backup" value={true} status={{ type: 'success', message: 'Backup on' }} />
      ));
      expect(screen.getByText('Backup on')).toBeInTheDocument();
      expect(screen.getByRole('switch', { name: 'Backup' })).not.toHaveAttribute('aria-invalid');
    });
  });

  describe('loading', () => {
    test('isLoading sets aria-busy, announces Loading, and blocks toggling', () => {
      const onChange = vi.fn();
      render(() => <Switch label="Busy switch" value={false} isLoading onChange={onChange} />);
      const input = screen.getByRole('switch', { name: 'Busy switch' });
      expect(input).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('status')).toHaveTextContent('Loading');
      fireEvent.click(input);
      expect(onChange).not.toHaveBeenCalled();
      expect(input).not.toBeChecked();
    });

    test('changeAction shows an optimistic checked state while pending, then settles', async () => {
      let resolveAction;
      const changeAction = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveAction = resolve;
          }),
      );
      render(() => <Switch label="Optimistic" value={false} changeAction={changeAction} />);
      const input = screen.getByRole('switch', { name: 'Optimistic' });
      fireEvent.click(input);
      // Optimistically on and busy while the action is pending.
      expect(input).toHaveAttribute('aria-checked', 'true');
      expect(input).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('status')).toHaveTextContent('Loading');
      await waitFor(() => expect(changeAction).toHaveBeenCalledTimes(1));
      expect(changeAction.mock.calls[0][0]).toBe(true);
      resolveAction();
      // Settles back to the (unchanged) controlled value.
      await waitFor(() => expect(input).not.toHaveAttribute('aria-busy'));
      expect(input).toHaveAttribute('aria-checked', 'false');
    });

    test('re-clicks while a changeAction is pending are blocked', async () => {
      let resolveAction;
      const changeAction = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveAction = resolve;
          }),
      );
      const onChange = vi.fn();
      render(() => (
        <Switch label="Dedupe" value={false} onChange={onChange} changeAction={changeAction} />
      ));
      const input = screen.getByRole('switch', { name: 'Dedupe' });
      fireEvent.click(input);
      fireEvent.click(input);
      fireEvent.click(input);
      expect(onChange).toHaveBeenCalledTimes(1);
      await waitFor(() => expect(changeAction).toHaveBeenCalledTimes(1));
      resolveAction();
      await waitFor(() => expect(input).not.toHaveAttribute('aria-busy'));
    });
  });
});
