import { render, screen, waitFor, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, vi } from 'vitest';
import { Button } from './Button';

describe('Button', () => {
  describe('rendering', () => {
    test('renders a button with the label as visible text and accessible name', () => {
      render(() => <Button label="Save changes" />);
      const button = screen.getByRole('button', { name: 'Save changes' });
      expect(button).toBeInTheDocument();
      expect(screen.getByText('Save changes')).toBeInTheDocument();
    });

    test('defaults: type=button, variant=secondary, size=md', () => {
      render(() => <Button label="Defaults" />);
      const button = screen.getByRole('button', { name: 'Defaults' });
      expect(button).toHaveAttribute('type', 'button');
      expect(button).toHaveAttribute('data-variant', 'secondary');
      expect(button).toHaveAttribute('data-size', 'md');
    });

    test('honors type=submit', () => {
      render(() => <Button label="Submit" type="submit" />);
      expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit');
    });

    test.each(['primary', 'secondary', 'ghost', 'destructive'])(
      'renders the %s variant',
      (variant) => {
        render(() => <Button label={`${variant} action`} variant={variant} />);
        expect(screen.getByRole('button', { name: `${variant} action` })).toHaveAttribute(
          'data-variant',
          variant,
        );
      },
    );

    test.each(['sm', 'md', 'lg'])('renders the %s size', (size) => {
      render(() => <Button label={`${size} button`} size={size} />);
      expect(screen.getByRole('button', { name: `${size} button` })).toHaveAttribute(
        'data-size',
        size,
      );
    });

    test('renders the icon slot', () => {
      // Real icons (like Astryx Icon / lucide) carry their own aria-hidden,
      // which keeps them out of the accessible name.
      render(() => <Button label="Starred" icon={<span aria-hidden="true">★</span>} />);
      expect(screen.getByText('★')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Starred' })).toBeInTheDocument();
    });

    test('renders endContent after the label', () => {
      render(() => <Button label="Messages" endContent={<span>3</span>} />);
      expect(screen.getByText('3')).toBeInTheDocument();
      expect(screen.getByText('Messages')).toBeInTheDocument();
    });

    test('children override the visible text but label stays the accessible name', () => {
      render(() => (
        <Button label="Save document">
          <span>Save</span>
        </Button>
      ));
      expect(screen.getByRole('button', { name: 'Save document' })).toBeInTheDocument();
      expect(screen.getByText('Save')).toBeInTheDocument();
      expect(screen.queryByText('Save document')).not.toBeInTheDocument();
    });
  });

  describe('icon-only mode', () => {
    test('uses label as aria-label with no visible label text', () => {
      render(() => <Button label="Settings" icon={<span>⚙</span>} isIconOnly />);
      const button = screen.getByRole('button', { name: 'Settings' });
      expect(button).toHaveAttribute('aria-label', 'Settings');
      expect(screen.queryByText('Settings')).not.toBeInTheDocument();
      expect(screen.getByText('⚙')).toBeInTheDocument();
    });

    test('ignores endContent when isIconOnly', () => {
      render(() => (
        <Button label="Inbox" icon={<span>✉</span>} endContent={<span>99</span>} isIconOnly />
      ));
      expect(screen.queryByText('99')).not.toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    test('calls onClick when clicked', () => {
      const onClick = vi.fn();
      render(() => <Button label="Click me" onClick={onClick} />);
      fireEvent.click(screen.getByRole('button', { name: 'Click me' }));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('isDisabled disables the button and blocks onClick', () => {
      const onClick = vi.fn();
      render(() => <Button label="Nope" isDisabled onClick={onClick} />);
      const button = screen.getByRole('button', { name: 'Nope' });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    test('is focusable when enabled', () => {
      render(() => <Button label="Focus me" />);
      const button = screen.getByRole('button', { name: 'Focus me' });
      button.focus();
      expect(button).toHaveFocus();
    });
  });

  describe('loading', () => {
    test('isLoading sets aria-busy, disables the button, and announces via live region', () => {
      const onClick = vi.fn();
      render(() => <Button label="Saving" isLoading onClick={onClick} />);
      const button = screen.getByRole('button', { name: 'Saving' });
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
      expect(screen.getByRole('status')).toHaveTextContent('Loading');
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
    });

    test('live region is empty when not loading', () => {
      render(() => <Button label="Idle" />);
      const button = screen.getByRole('button', { name: 'Idle' });
      expect(button).not.toHaveAttribute('aria-busy');
      expect(screen.getByRole('status')).toBeEmptyDOMElement();
    });

    test('clickAction shows the loading state while pending and clears it on resolve', async () => {
      let resolveAction;
      const clickAction = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveAction = resolve;
          }),
      );
      render(() => <Button label="Save" clickAction={clickAction} />);
      const button = screen.getByRole('button', { name: 'Save' });
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).toBeDisabled();
      await waitFor(() => expect(clickAction).toHaveBeenCalledTimes(1));
      resolveAction();
      await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
      expect(button).not.toBeDisabled();
    });

    test('a pending clickAction is deduped: re-clicks do not fire it again', async () => {
      let resolveAction;
      const clickAction = vi.fn(
        () =>
          new Promise((resolve) => {
            resolveAction = resolve;
          }),
      );
      render(() => <Button label="Pay" clickAction={clickAction} />);
      const button = screen.getByRole('button', { name: 'Pay' });
      fireEvent.click(button);
      fireEvent.click(button);
      fireEvent.click(button);
      await waitFor(() => expect(clickAction).toHaveBeenCalledTimes(1));
      resolveAction();
      await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
      expect(clickAction).toHaveBeenCalledTimes(1);
    });

    test('isInterruptible keeps the button clickable while pending: re-click lands', async () => {
      const resolvers = [];
      const clickAction = vi.fn(
        () =>
          new Promise((resolve) => {
            resolvers.push(resolve);
          }),
      );
      render(() => <Button label="Toggle" clickAction={clickAction} isInterruptible />);
      const button = screen.getByRole('button', { name: 'Toggle' });
      fireEvent.click(button);
      expect(button).toHaveAttribute('aria-busy', 'true');
      expect(button).not.toBeDisabled();
      fireEvent.click(button);
      await waitFor(() => expect(clickAction).toHaveBeenCalledTimes(2));
      resolvers.forEach((resolve) => resolve());
      await waitFor(() => expect(button).not.toHaveAttribute('aria-busy'));
    });
  });
});
