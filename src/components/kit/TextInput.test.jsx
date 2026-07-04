import { render, screen, fireEvent, waitFor } from '@solidjs/testing-library';
import { describe, test, expect, vi } from 'vitest';
import { TextInput } from './TextInput';

describe('TextInput', () => {
  describe('label association', () => {
    test('label is associated with the input via for/id', () => {
      render(() => <TextInput label="Email" value="" />);
      const input = screen.getByLabelText('Email');
      expect(input).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Email' })).toBe(input);
    });

    test('isLabelHidden keeps the accessible name', () => {
      render(() => <TextInput label="Search" value="" isLabelHidden />);
      expect(screen.getByRole('textbox', { name: 'Search' })).toBeInTheDocument();
    });

    test('the label element points at the input via for/id (jsdom does not forward label clicks)', () => {
      render(() => <TextInput label="Nickname" value="" />);
      const input = screen.getByRole('textbox', { name: 'Nickname' });
      const label = screen.getByText('Nickname');
      expect(label.tagName).toBe('LABEL');
      expect(input.id).toBeTruthy();
      expect(label).toHaveAttribute('for', input.id);
    });
  });

  describe('rendering', () => {
    test('defaults: type=text, no aria-invalid, no aria-busy, not required', () => {
      render(() => <TextInput label="Name" value="" />);
      const input = screen.getByRole('textbox', { name: 'Name' });
      expect(input).toHaveAttribute('type', 'text');
      expect(input).not.toHaveAttribute('aria-invalid');
      expect(input).not.toHaveAttribute('aria-busy');
      expect(input).not.toHaveAttribute('aria-required');
    });

    test('honors type=email and htmlName', () => {
      render(() => <TextInput label="Work email" value="" type="email" htmlName="work_email" />);
      const input = screen.getByRole('textbox', { name: 'Work email' });
      expect(input).toHaveAttribute('type', 'email');
      expect(input).toHaveAttribute('name', 'work_email');
    });

    test('renders the current value and placeholder', () => {
      render(() => <TextInput label="City" value="Lisbon" placeholder="Where you live" />);
      const input = screen.getByRole('textbox', { name: 'City' });
      expect(input).toHaveValue('Lisbon');
      expect(input).toHaveAttribute('placeholder', 'Where you live');
    });

    test('renders the startIcon adornment', () => {
      render(() => (
        <TextInput label="Search" value="" startIcon={<span aria-hidden="true">🔍</span>} />
      ));
      expect(screen.getByText('🔍')).toBeInTheDocument();
    });
  });

  describe('description', () => {
    test('renders the description and links it via aria-describedby', () => {
      render(() => (
        <TextInput label="Password" value="" description="At least 8 characters" />
      ));
      const input = screen.getByLabelText('Password');
      const description = screen.getByText('At least 8 characters');
      expect(description.id).toBeTruthy();
      expect(input.getAttribute('aria-describedby')).toContain(description.id);
      expect(input).toHaveAccessibleDescription('At least 8 characters');
    });

    test('no aria-describedby without description or status', () => {
      render(() => <TextInput label="Plain" value="" />);
      expect(screen.getByRole('textbox', { name: 'Plain' })).not.toHaveAttribute(
        'aria-describedby',
      );
    });
  });

  describe('required / optional indicators', () => {
    test('isRequired shows a Required indicator and sets aria-required', () => {
      render(() => <TextInput label="Full name" value="" isRequired />);
      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Full name/ })).toHaveAttribute(
        'aria-required',
        'true',
      );
    });

    test('isOptional shows an Optional indicator without aria-required', () => {
      render(() => <TextInput label="Middle name" value="" isOptional />);
      expect(screen.getByText('Optional')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Middle name/ })).not.toHaveAttribute(
        'aria-required',
      );
    });
  });

  describe('status', () => {
    test('error status sets aria-invalid and announces the message as an alert', () => {
      render(() => (
        <TextInput
          label="Email"
          value="nope"
          status={{ type: 'error', message: 'Email must include @' }}
        />
      ));
      const input = screen.getByRole('textbox', { name: 'Email' });
      expect(input).toHaveAttribute('aria-invalid', 'true');
      const message = screen.getByRole('alert');
      expect(message).toHaveTextContent('Email must include @');
      expect(input.getAttribute('aria-describedby')).toContain(message.id);
    });

    test('success status renders a status message without aria-invalid', () => {
      render(() => (
        <TextInput label="API key" value="ok" status={{ type: 'success', message: 'Key is valid' }} />
      ));
      const input = screen.getByRole('textbox', { name: 'API key' });
      expect(input).not.toHaveAttribute('aria-invalid');
      const message = screen.getByRole('status');
      expect(message).toHaveTextContent('Key is valid');
      expect(input.getAttribute('aria-describedby')).toContain(message.id);
    });

    test('warning status without a message renders no live region', () => {
      render(() => <TextInput label="Handle" value="root" status={{ type: 'warning' }} />);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    test('onChange fires with the new value on input', () => {
      const onChange = vi.fn();
      render(() => <TextInput label="Name" value="" onChange={onChange} />);
      fireEvent.input(screen.getByRole('textbox', { name: 'Name' }), {
        target: { value: 'Ada' },
      });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toBe('Ada');
    });

    test('onEnter fires when Enter is pressed; onKeyDown passthrough', () => {
      const onEnter = vi.fn();
      const onKeyDown = vi.fn();
      render(() => <TextInput label="Search" value="" onEnter={onEnter} onKeyDown={onKeyDown} />);
      const input = screen.getByRole('textbox', { name: 'Search' });
      fireEvent.keyDown(input, { key: 'a' });
      expect(onEnter).not.toHaveBeenCalled();
      fireEvent.keyDown(input, { key: 'Enter' });
      expect(onEnter).toHaveBeenCalledTimes(1);
      expect(onKeyDown).toHaveBeenCalledTimes(2);
    });
  });

  describe('clear button', () => {
    test('shows only when hasClear and a value is set; clears and refocuses', () => {
      const onChange = vi.fn();
      render(() => <TextInput label="Search" value="cats" hasClear onChange={onChange} />);
      const clear = screen.getByRole('button', { name: 'Clear Search' });
      fireEvent.click(clear);
      expect(onChange).toHaveBeenCalledWith('', null);
      expect(screen.getByRole('textbox', { name: 'Search' })).toHaveFocus();
    });

    test('hidden when the value is empty or the input is disabled', () => {
      render(() => <TextInput label="Empty" value="" hasClear />);
      expect(screen.queryByRole('button', { name: 'Clear Empty' })).not.toBeInTheDocument();
      render(() => <TextInput label="Locked" value="text" hasClear isDisabled />);
      expect(screen.queryByRole('button', { name: 'Clear Locked' })).not.toBeInTheDocument();
    });
  });

  describe('disabled', () => {
    test('isDisabled disables the input and blocks onChange', () => {
      const onChange = vi.fn();
      render(() => <TextInput label="Frozen" value="" isDisabled onChange={onChange} />);
      const input = screen.getByLabelText('Frozen');
      expect(input).toBeDisabled();
      fireEvent.input(input, { target: { value: 'x' } });
      expect(onChange).not.toHaveBeenCalled();
    });

    test('disabledMessage keeps the input focusable via aria-disabled + readonly and exposes the reason', () => {
      const onChange = vi.fn();
      render(() => (
        <TextInput
          label="Owner"
          value="sam"
          isDisabled
          disabledMessage="You need the Editor role to change this"
          onChange={onChange}
        />
      ));
      const input = screen.getByLabelText('Owner');
      expect(input).not.toBeDisabled();
      expect(input).toHaveAttribute('aria-disabled', 'true');
      expect(input).toHaveAttribute('readonly');
      const reason = screen.getByText('You need the Editor role to change this');
      expect(input.getAttribute('aria-describedby')).toContain(reason.id);
      input.focus();
      expect(input).toHaveFocus();
      fireEvent.input(input, { target: { value: 'hack' } });
      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe('loading', () => {
    test('isLoading sets aria-busy', () => {
      render(() => <TextInput label="Checking" value="" isLoading />);
      expect(screen.getByRole('textbox', { name: 'Checking' })).toHaveAttribute(
        'aria-busy',
        'true',
      );
    });

    test('changeAction sets aria-busy while pending and clears it on resolve', async () => {
      let resolveAction;
      const changeAction = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveAction = resolve;
          }),
      );
      render(() => <TextInput label="Handle" value="" changeAction={changeAction} />);
      const input = screen.getByRole('textbox', { name: 'Handle' });
      fireEvent.input(input, { target: { value: 'ada' } });
      expect(input).toHaveAttribute('aria-busy', 'true');
      await waitFor(() => expect(changeAction).toHaveBeenCalledWith('ada', expect.anything()));
      resolveAction();
      await waitFor(() => expect(input).not.toHaveAttribute('aria-busy'));
    });
  });
});
