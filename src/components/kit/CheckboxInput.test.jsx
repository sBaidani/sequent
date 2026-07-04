/**
 * Tests for the kit CheckboxInput (Astryx CheckboxInput re-implemented for
 * Solid on a real native <input type="checkbox">). Queries by
 * role/text/label only. Covers rendering (checked/unchecked/indeterminate,
 * sizes, description, status), the interaction contract (click, label
 * click, controlled value, read-only, changeAction optimistic state), the
 * per-item `color` prop, and a11y attributes (aria-disabled, aria-readonly,
 * aria-invalid, aria-busy, aria-describedby).
 */
import { render, screen, fireEvent, waitFor } from '@solidjs/testing-library';
import { createSignal } from 'solid-js';
import { describe, test, expect, vi } from 'vitest';
import { CheckboxInput } from './CheckboxInput';

describe('CheckboxInput', () => {
  describe('rendering', () => {
    test('renders a real native checkbox with the label as its accessible name', () => {
      render(() => <CheckboxInput label="Accept terms" value={false} />);
      const input = screen.getByRole('checkbox', { name: 'Accept terms' });
      expect(input).toBeInTheDocument();
      expect(input.tagName).toBe('INPUT');
      expect(input).toHaveAttribute('type', 'checkbox');
      expect(input).not.toBeChecked();
    });

    test('label association: the input is reachable via its label', () => {
      render(() => <CheckboxInput label="Subscribe" value={false} />);
      expect(screen.getByLabelText('Subscribe')).toBe(screen.getByRole('checkbox'));
    });

    test('reflects value=true as checked', () => {
      render(() => <CheckboxInput label="Checked box" value={true} />);
      expect(screen.getByRole('checkbox', { name: 'Checked box' })).toBeChecked();
    });

    test('value="indeterminate" sets the native indeterminate state', () => {
      render(() => <CheckboxInput label="Select all" value="indeterminate" />);
      const input = screen.getByRole('checkbox', { name: 'Select all' });
      expect(input).toBePartiallyChecked();
      expect(input).not.toBeChecked();
    });

    test('isLabelHidden keeps the accessible name without a visible label', () => {
      render(() => <CheckboxInput label="Hidden label" value={false} isLabelHidden />);
      expect(screen.getByRole('checkbox', { name: 'Hidden label' })).toBeInTheDocument();
    });

    test('description renders and becomes the accessible description', () => {
      render(() => (
        <CheckboxInput
          label="Share usage data"
          description="Sends anonymous statistics"
          value={false}
        />
      ));
      expect(screen.getByText('Sends anonymous statistics')).toBeInTheDocument();
      expect(
        screen.getByRole('checkbox', { name: 'Share usage data' }),
      ).toHaveAccessibleDescription('Sends anonymous statistics');
    });

    test.each(['sm', 'md'])('renders the %s size', (size) => {
      render(() => <CheckboxInput label={`${size} box`} value={false} size={size} />);
      expect(screen.getByRole('checkbox', { name: `${size} box` })).toHaveAttribute(
        'data-size',
        size,
      );
    });

    test('defaults to size md', () => {
      render(() => <CheckboxInput label="Default size" value={false} />);
      expect(screen.getByRole('checkbox', { name: 'Default size' })).toHaveAttribute(
        'data-size',
        'md',
      );
    });

    test('isRequired sets the required attribute', () => {
      render(() => <CheckboxInput label="Must check" value={false} isRequired />);
      expect(screen.getByRole('checkbox', { name: /Must check/ })).toBeRequired();
    });

    test('isOptional renders an "(optional)" hint', () => {
      render(() => <CheckboxInput label="Extras" value={false} isOptional />);
      expect(screen.getByText('(optional)')).toBeInTheDocument();
    });
  });

  describe('color prop (per-item user colors)', () => {
    // The visual box is presentation-only (aria-hidden) and sits next to the
    // native input inside its wrapper, so after querying the input by role we
    // take a single documented structural hop to its sibling swatch.
    const boxFor = (input) => input.nextElementSibling;

    test('applies the color to border and background when checked', () => {
      render(() => <CheckboxInput label="User color" value={true} color="rgb(20, 120, 220)" />);
      const box = boxFor(screen.getByRole('checkbox', { name: 'User color' }));
      expect(box).toHaveStyle({
        'border-color': 'rgb(20, 120, 220)',
        'background-color': 'rgb(20, 120, 220)',
      });
    });

    test('applies the color to the border only when unchecked', () => {
      render(() => <CheckboxInput label="User color" value={false} color="rgb(20, 120, 220)" />);
      const box = boxFor(screen.getByRole('checkbox', { name: 'User color' }));
      expect(box).toHaveStyle({ 'border-color': 'rgb(20, 120, 220)' });
      expect(box.style.backgroundColor).toBe('');
    });

    test('applies the color to border and background when indeterminate', () => {
      render(() => (
        <CheckboxInput label="User color" value="indeterminate" color="rgb(220, 40, 40)" />
      ));
      const box = boxFor(screen.getByRole('checkbox', { name: 'User color' }));
      expect(box).toHaveStyle({
        'border-color': 'rgb(220, 40, 40)',
        'background-color': 'rgb(220, 40, 40)',
      });
    });

    test('ignores the color when disabled (dimmed token styling wins)', () => {
      render(() => (
        <CheckboxInput label="User color" value={true} color="rgb(20, 120, 220)" isDisabled />
      ));
      const box = boxFor(screen.getByRole('checkbox', { name: 'User color' }));
      expect(box.style.borderColor).toBe('');
      expect(box.style.backgroundColor).toBe('');
    });
  });

  describe('interaction', () => {
    test('clicking calls onChange with the next checked state', () => {
      const onChange = vi.fn();
      render(() => <CheckboxInput label="Toggle me" value={false} onChange={onChange} />);
      fireEvent.click(screen.getByRole('checkbox', { name: 'Toggle me' }));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toBe(true);
    });

    test('clicking the label toggles the checkbox', () => {
      const onChange = vi.fn();
      render(() => <CheckboxInput label="Click label" value={false} onChange={onChange} />);
      fireEvent.click(screen.getByText('Click label'));
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toBe(true);
    });

    test('is controlled: without a value update the DOM state reverts', () => {
      render(() => <CheckboxInput label="Controlled" value={false} />);
      const input = screen.getByRole('checkbox', { name: 'Controlled' });
      fireEvent.click(input);
      expect(input).not.toBeChecked();
    });

    test('toggles when the consumer updates the value from onChange', () => {
      const [checked, setChecked] = createSignal(false);
      render(() => <CheckboxInput label="Live toggle" value={checked()} onChange={setChecked} />);
      const input = screen.getByRole('checkbox', { name: 'Live toggle' });
      fireEvent.click(input);
      expect(input).toBeChecked();
      fireEvent.click(input);
      expect(input).not.toBeChecked();
    });

    test('clicking an indeterminate checkbox reports checked=true and restores the controlled mixed state', () => {
      const onChange = vi.fn();
      render(() => (
        <CheckboxInput label="Select all" value="indeterminate" onChange={onChange} />
      ));
      const input = screen.getByRole('checkbox', { name: 'Select all' });
      fireEvent.click(input);
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toBe(true);
      // Controlled: prop unchanged, so the mixed state is restored.
      expect(input).toBePartiallyChecked();
      expect(input).not.toBeChecked();
    });

    test('indeterminate resolves when the consumer updates the value', () => {
      const [value, setValue] = createSignal('indeterminate');
      render(() => <CheckboxInput label="Select all" value={value()} onChange={setValue} />);
      const input = screen.getByRole('checkbox', { name: 'Select all' });
      fireEvent.click(input);
      expect(input).toBeChecked();
      expect(input).not.toBePartiallyChecked();
    });
  });

  describe('disabled and read-only', () => {
    test('isDisabled disables the input and blocks onChange', () => {
      const onChange = vi.fn();
      render(() => (
        <CheckboxInput label="No touching" value={false} isDisabled onChange={onChange} />
      ));
      const input = screen.getByRole('checkbox', { name: 'No touching' });
      expect(input).toBeDisabled();
      fireEvent.click(input);
      expect(onChange).not.toHaveBeenCalled();
    });

    test('disabledMessage keeps the checkbox focusable via aria-disabled and exposes the reason', () => {
      const onChange = vi.fn();
      render(() => (
        <CheckboxInput
          label="Managed"
          value={false}
          isDisabled
          disabledMessage="Terms are managed by your administrator"
          onChange={onChange}
        />
      ));
      const input = screen.getByRole('checkbox', { name: 'Managed' });
      expect(input).not.toBeDisabled();
      expect(input).toHaveAttribute('aria-disabled', 'true');
      input.focus();
      expect(input).toHaveFocus();
      expect(input).toHaveAccessibleDescription('Terms are managed by your administrator');
      fireEvent.click(input);
      expect(onChange).not.toHaveBeenCalled();
      expect(input).not.toBeChecked();
    });

    test('isReadOnly sets aria-readonly, blocks changes, and keeps the state', () => {
      const onChange = vi.fn();
      render(() => (
        <CheckboxInput label="Read only" value={true} isReadOnly onChange={onChange} />
      ));
      const input = screen.getByRole('checkbox', { name: 'Read only' });
      expect(input).not.toBeDisabled();
      expect(input).toHaveAttribute('aria-readonly', 'true');
      fireEvent.click(input);
      expect(onChange).not.toHaveBeenCalled();
      expect(input).toBeChecked();
    });
  });

  describe('status', () => {
    test('error status shows the message and sets aria-invalid', () => {
      render(() => (
        <CheckboxInput
          label="Terms"
          value={false}
          status={{ type: 'error', message: 'You must accept the terms' }}
        />
      ));
      const input = screen.getByRole('checkbox', { name: 'Terms' });
      expect(screen.getByText('You must accept the terms')).toBeInTheDocument();
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAccessibleDescription('You must accept the terms');
    });

    test('non-error status shows the message without aria-invalid', () => {
      render(() => (
        <CheckboxInput
          label="Saved"
          value={true}
          status={{ type: 'success', message: 'Preference saved' }}
        />
      ));
      expect(screen.getByText('Preference saved')).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Saved' })).not.toHaveAttribute('aria-invalid');
    });
  });

  describe('loading', () => {
    test('isLoading sets aria-busy, announces Loading, and blocks toggling', () => {
      const onChange = vi.fn();
      render(() => (
        <CheckboxInput label="Busy box" value={false} isLoading onChange={onChange} />
      ));
      const input = screen.getByRole('checkbox', { name: 'Busy box' });
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
      render(() => (
        <CheckboxInput label="Optimistic" value={false} changeAction={changeAction} />
      ));
      const input = screen.getByRole('checkbox', { name: 'Optimistic' });
      fireEvent.click(input);
      expect(input).toBeChecked();
      expect(input).toHaveAttribute('aria-busy', 'true');
      expect(screen.getByRole('status')).toHaveTextContent('Loading');
      await waitFor(() => expect(changeAction).toHaveBeenCalledTimes(1));
      expect(changeAction.mock.calls[0][0]).toBe(true);
      resolveAction();
      await waitFor(() => expect(input).not.toHaveAttribute('aria-busy'));
      // Settles back to the (unchanged) controlled value.
      expect(input).not.toBeChecked();
    });
  });
});
