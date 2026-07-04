import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, vi } from 'vitest';
import { TextArea } from './TextArea';

describe('TextArea', () => {
  describe('label association', () => {
    test('label is associated with the textarea via for/id', () => {
      render(() => <TextArea label="Description" value="" />);
      const textarea = screen.getByLabelText('Description');
      expect(textarea).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: 'Description' })).toBe(textarea);
      expect(textarea.tagName).toBe('TEXTAREA');
    });

    test('isLabelHidden keeps the accessible name', () => {
      render(() => <TextArea label="Notes" value="" isLabelHidden />);
      expect(screen.getByRole('textbox', { name: 'Notes' })).toBeInTheDocument();
    });
  });

  describe('rendering', () => {
    test('defaults to 3 rows and honors a custom rows count', () => {
      render(() => <TextArea label="Bio" value="" />);
      expect(screen.getByRole('textbox', { name: 'Bio' })).toHaveAttribute('rows', '3');
      render(() => <TextArea label="Story" value="" rows={6} />);
      expect(screen.getByRole('textbox', { name: 'Story' })).toHaveAttribute('rows', '6');
    });

    test('renders value and placeholder', () => {
      render(() => <TextArea label="Message" value="Hello" placeholder="Say something" />);
      const textarea = screen.getByRole('textbox', { name: 'Message' });
      expect(textarea).toHaveValue('Hello');
      expect(textarea).toHaveAttribute('placeholder', 'Say something');
    });

    test('hasSpellCheck=false disables browser spell checking', () => {
      render(() => <TextArea label="Code" value="" hasSpellCheck={false} />);
      expect(screen.getByRole('textbox', { name: 'Code' })).toHaveAttribute(
        'spellcheck',
        'false',
      );
    });

    test('renders the startIcon adornment', () => {
      render(() => (
        <TextArea label="Chat" value="" startIcon={<span aria-hidden="true">💬</span>} />
      ));
      expect(screen.getByText('💬')).toBeInTheDocument();
    });
  });

  describe('description', () => {
    test('renders the description and links it via aria-describedby', () => {
      render(() => (
        <TextArea label="Feedback" value="" description="Describe the issue in detail" />
      ));
      const textarea = screen.getByLabelText('Feedback');
      const description = screen.getByText('Describe the issue in detail');
      expect(textarea.getAttribute('aria-describedby')).toContain(description.id);
      expect(textarea).toHaveAccessibleDescription(/Describe the issue in detail/);
    });
  });

  describe('character counter', () => {
    test('maxLength renders a current/max counter linked via aria-describedby', () => {
      render(() => <TextArea label="Tweet" value="Hello" maxLength={10} />);
      const textarea = screen.getByRole('textbox', { name: 'Tweet' });
      const counter = screen.getByText('5/10');
      expect(counter).toBeInTheDocument();
      expect(textarea.getAttribute('aria-describedby')).toContain(counter.id);
      expect(textarea).not.toHaveAttribute('aria-invalid');
    });

    test('over the limit the textarea becomes aria-invalid and announces the overflow', () => {
      render(() => <TextArea label="Tweet" value="Hello world!" maxLength={10} />);
      expect(screen.getByRole('textbox', { name: 'Tweet' })).toHaveAttribute(
        'aria-invalid',
        'true',
      );
      expect(screen.getByText('12/10')).toBeInTheDocument();
      expect(screen.getByText('2 characters over limit')).toBeInTheDocument();
    });

    test('no counter without maxLength', () => {
      render(() => <TextArea label="Free" value="abc" />);
      expect(screen.queryByText(/\d+\/\d+/)).not.toBeInTheDocument();
    });
  });

  describe('required / optional indicators', () => {
    test('isRequired shows a Required indicator and sets aria-required', () => {
      render(() => <TextArea label="Summary" value="" isRequired />);
      expect(screen.getByText('Required')).toBeInTheDocument();
      expect(screen.getByRole('textbox', { name: /Summary/ })).toHaveAttribute(
        'aria-required',
        'true',
      );
    });

    test('isOptional shows an Optional indicator', () => {
      render(() => <TextArea label="Extras" value="" isOptional />);
      expect(screen.getByText('Optional')).toBeInTheDocument();
    });
  });

  describe('status', () => {
    test('error status sets aria-invalid and announces the message as an alert', () => {
      render(() => (
        <TextArea
          label="Reason"
          value=""
          status={{ type: 'error', message: 'A reason is required' }}
        />
      ));
      const textarea = screen.getByRole('textbox', { name: 'Reason' });
      expect(textarea).toHaveAttribute('aria-invalid', 'true');
      const message = screen.getByRole('alert');
      expect(message).toHaveTextContent('A reason is required');
      expect(textarea.getAttribute('aria-describedby')).toContain(message.id);
    });

    test('warning status renders a polite status message without aria-invalid', () => {
      render(() => (
        <TextArea
          label="Bio"
          value="x"
          status={{ type: 'warning', message: 'This will be public' }}
        />
      ));
      expect(screen.getByRole('textbox', { name: 'Bio' })).not.toHaveAttribute('aria-invalid');
      expect(screen.getByRole('status')).toHaveTextContent('This will be public');
    });
  });

  describe('interaction', () => {
    test('onChange fires with the new value on input', () => {
      const onChange = vi.fn();
      render(() => <TextArea label="Comment" value="" onChange={onChange} />);
      fireEvent.input(screen.getByRole('textbox', { name: 'Comment' }), {
        target: { value: 'Nice work' },
      });
      expect(onChange).toHaveBeenCalledTimes(1);
      expect(onChange.mock.calls[0][0]).toBe('Nice work');
    });

    test('onFocus and onBlur passthrough', () => {
      const onFocus = vi.fn();
      const onBlur = vi.fn();
      render(() => <TextArea label="Field" value="" onFocus={onFocus} onBlur={onBlur} />);
      const textarea = screen.getByRole('textbox', { name: 'Field' });
      fireEvent.focus(textarea);
      fireEvent.blur(textarea);
      expect(onFocus).toHaveBeenCalledTimes(1);
      expect(onBlur).toHaveBeenCalledTimes(1);
    });
  });

  describe('disabled / loading', () => {
    test('isDisabled disables the textarea and blocks onChange', () => {
      const onChange = vi.fn();
      render(() => <TextArea label="Frozen" value="" isDisabled onChange={onChange} />);
      const textarea = screen.getByLabelText('Frozen');
      expect(textarea).toBeDisabled();
      fireEvent.input(textarea, { target: { value: 'x' } });
      expect(onChange).not.toHaveBeenCalled();
    });

    test('disabledMessage keeps the textarea focusable via aria-disabled + readonly', () => {
      render(() => (
        <TextArea label="Plan" value="" isDisabled disabledMessage="Upgrade to edit your plan" />
      ));
      const textarea = screen.getByLabelText('Plan');
      expect(textarea).not.toBeDisabled();
      expect(textarea).toHaveAttribute('aria-disabled', 'true');
      expect(textarea).toHaveAttribute('readonly');
      const reason = screen.getByText('Upgrade to edit your plan');
      expect(textarea.getAttribute('aria-describedby')).toContain(reason.id);
    });

    test('isLoading sets aria-busy', () => {
      render(() => <TextArea label="Saving" value="" isLoading />);
      expect(screen.getByRole('textbox', { name: 'Saving' })).toHaveAttribute(
        'aria-busy',
        'true',
      );
    });
  });
});
