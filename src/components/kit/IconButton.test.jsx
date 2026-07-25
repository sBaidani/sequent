import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, vi, afterEach } from 'vitest';
import { IconButton } from './IconButton';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('IconButton', () => {
  test('renders an icon-only button whose accessible name is the required label', () => {
    render(() => <IconButton label="Delete conversation" icon={<span>🗑</span>} />);
    const button = screen.getByRole('button', { name: 'Delete conversation' });
    expect(button).toHaveAttribute('aria-label', 'Delete conversation');
    // Icon-only: the label is never rendered as visible text.
    expect(screen.queryByText('Delete conversation')).not.toBeInTheDocument();
    expect(screen.getByText('🗑')).toBeInTheDocument();
  });

  test('reports an error when the required label prop is missing', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(() => <IconButton icon={<span>⚙</span>} />);
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('`label` prop is required'),
    );
  });

  test('defaults to secondary variant and md size', () => {
    render(() => <IconButton label="Settings" icon={<span>⚙</span>} />);
    const button = screen.getByRole('button', { name: 'Settings' });
    expect(button).toHaveAttribute('data-variant', 'secondary');
    expect(button).toHaveAttribute('data-size', 'md');
  });

  test.each(['primary', 'secondary', 'ghost', 'destructive'])(
    'passes through the %s variant',
    (variant) => {
      render(() => <IconButton label="Action" icon={<span>•</span>} variant={variant} />);
      expect(screen.getByRole('button', { name: 'Action' })).toHaveAttribute(
        'data-variant',
        variant,
      );
    },
  );

  test.each(['sm', 'md', 'lg'])('passes through the %s size', (size) => {
    render(() => <IconButton label="Action" icon={<span>•</span>} size={size} />);
    expect(screen.getByRole('button', { name: 'Action' })).toHaveAttribute('data-size', size);
  });

  test('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(() => <IconButton label="Refresh" icon={<span>↻</span>} onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Refresh' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test('isDisabled disables the button and blocks onClick', () => {
    const onClick = vi.fn();
    render(() => <IconButton label="Refresh" icon={<span>↻</span>} isDisabled onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Refresh' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('isLoading sets aria-busy, disables, and announces via live region', () => {
    render(() => <IconButton label="Sync" icon={<span>↻</span>} isLoading />);
    const button = screen.getByRole('button', { name: 'Sync' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('Loading');
  });
});
