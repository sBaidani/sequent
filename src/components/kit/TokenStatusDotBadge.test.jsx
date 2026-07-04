/**
 * Tests for the kit Token, StatusDot, and Badge (Astryx re-implemented for
 * Solid). Queries by role/text/label only. Covers rendering (colors, sizes,
 * variants, custom color, count overflow), the interaction contract (token
 * click, remove, link, disabled) and a11y attributes (roles, aria-label,
 * aria-description, aria-disabled).
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, vi } from 'vitest';
import { Token } from './Token';
import { StatusDot } from './StatusDot';
import { Badge } from './Badge';

describe('Token', () => {
  describe('rendering', () => {
    test('renders the label with default color and size', () => {
      render(() => <Token label="Design" />);
      const label = screen.getByText('Design');
      expect(label).toBeInTheDocument();
      const root = label.closest('[data-color]');
      expect(root).toHaveAttribute('data-color', 'default');
      expect(root).toHaveAttribute('data-size', 'md');
    });

    test('is non-interactive by default (no button or link role)', () => {
      render(() => <Token label="Plain tag" />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });

    test.each(['red', 'orange', 'yellow', 'green', 'teal', 'cyan', 'blue', 'purple', 'pink', 'gray'])(
      'renders the %s hue variant with its data-color attribute',
      (color) => {
        render(() => <Token label={`Tag ${color}`} color={color} />);
        expect(screen.getByText(`Tag ${color}`).closest('[data-color]')).toHaveAttribute(
          'data-color',
          color,
        );
      },
    );

    test('renders sizes via the data-size attribute', () => {
      render(() => <Token label="Small tag" size="sm" />);
      expect(screen.getByText('Small tag').closest('[data-size]')).toHaveAttribute(
        'data-size',
        'sm',
      );
    });

    test('customColor renders a tinted chip via color-mix against theme tokens', () => {
      render(() => <Token label="User color" customColor="#a1b2c3" />);
      const root = screen.getByText('User color').closest('[data-color]');
      expect(root).toHaveAttribute('data-color', 'custom');
      expect(root.style.backgroundColor).toContain('color-mix');
      expect(root.style.backgroundColor).toContain('#a1b2c3');
      expect(root.style.color).toContain('color-mix');
    });

    test('renders icon and endContent around the label', () => {
      render(() => <Token label="With extras" icon={<span>★</span>} endContent={<span>3</span>} />);
      expect(screen.getByText('★')).toBeInTheDocument();
      expect(screen.getByText('With extras')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('interaction', () => {
    test('onClick renders a real button named by the label and fires on click', () => {
      const onClick = vi.fn();
      render(() => <Token label="Filter: Active" onClick={onClick} />);
      const button = screen.getByRole('button', { name: 'Filter: Active' });
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('clicking the container around the inner button fires onClick once', () => {
      const onClick = vi.fn();
      render(() => <Token label="Chip" onClick={onClick} endContent={<span>7</span>} />);
      // endContent lives in the container outside the inner button.
      fireEvent.click(screen.getByText('7'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('href renders a link with the label as its accessible name', () => {
      render(() => <Token label="Docs" href="/docs" />);
      const link = screen.getByRole('link', { name: 'Docs' });
      expect(link).toHaveAttribute('href', '/docs');
    });

    test('onRemove renders a "Remove <label>" button that fires the callback', () => {
      const onRemove = vi.fn();
      render(() => <Token label="Recipient" onRemove={onRemove} />);
      const removeButton = screen.getByRole('button', { name: 'Remove Recipient' });
      fireEvent.click(removeButton);
      expect(onRemove).toHaveBeenCalledTimes(1);
    });

    test('remove click does not bubble into the token onClick', () => {
      const onClick = vi.fn();
      const onRemove = vi.fn();
      render(() => <Token label="Both" onClick={onClick} onRemove={onRemove} />);
      fireEvent.click(screen.getByRole('button', { name: 'Remove Both' }));
      expect(onRemove).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled();
    });

    test('isDisabled disables the inner button and blocks onClick and onRemove', () => {
      const onClick = vi.fn();
      const onRemove = vi.fn();
      render(() => <Token label="Locked" isDisabled onClick={onClick} onRemove={onRemove} />);
      const button = screen.getByRole('button', { name: 'Locked' });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      expect(onClick).not.toHaveBeenCalled();
      const removeButton = screen.getByRole('button', { name: 'Remove Locked' });
      expect(removeButton).toBeDisabled();
      fireEvent.click(removeButton);
      expect(onRemove).not.toHaveBeenCalled();
    });

    test('isDisabled on a link sets aria-disabled', () => {
      render(() => <Token label="Dead link" href="/x" isDisabled />);
      expect(screen.getByRole('link', { name: 'Dead link' })).toHaveAttribute(
        'aria-disabled',
        'true',
      );
    });
  });

  describe('a11y', () => {
    test('isLabelHidden keeps the label as the accessible name', () => {
      render(() => <Token label="Hidden name" onClick={() => {}} isLabelHidden />);
      expect(screen.getByRole('button', { name: 'Hidden name' })).toBeInTheDocument();
    });

    test('description is exposed via aria-description on the root', () => {
      render(() => <Token label="Described" description="Applied filter" />);
      expect(screen.getByText('Described').closest('[aria-description]')).toHaveAttribute(
        'aria-description',
        'Applied filter',
      );
    });

    test('remove button is a type=button (no form submission)', () => {
      render(() => <Token label="Safe" onRemove={() => {}} />);
      expect(screen.getByRole('button', { name: 'Remove Safe' })).toHaveAttribute(
        'type',
        'button',
      );
    });
  });
});

describe('StatusDot', () => {
  test.each(['success', 'warning', 'error', 'accent', 'neutral'])(
    'renders the %s variant as role=img named by its label',
    (variant) => {
      render(() => <StatusDot variant={variant} label={`Status ${variant}`} />);
      const dot = screen.getByRole('img', { name: `Status ${variant}` });
      expect(dot).toHaveAttribute('data-variant', variant);
    },
  );

  test('aria-label carries the status meaning (color is never alone)', () => {
    render(() => <StatusDot variant="success" label="Online" />);
    expect(screen.getByRole('img', { name: 'Online' })).toBeInTheDocument();
  });

  test('isPulsing applies the pulse animation with a reduced-motion opt-out', () => {
    render(() => <StatusDot variant="error" label="Live incident" isPulsing />);
    const dot = screen.getByRole('img', { name: 'Live incident' });
    expect(dot.className).toContain('animate-pulse');
    expect(dot.className).toContain('motion-reduce:animate-none');
  });

  test('does not pulse by default', () => {
    render(() => <StatusDot variant="success" label="Steady" />);
    expect(screen.getByRole('img', { name: 'Steady' }).className).not.toContain('animate-pulse');
  });

  test('tooltip is exposed as a hover title', () => {
    render(() => <StatusDot variant="warning" label="Degraded" tooltip="Response times elevated" />);
    expect(screen.getByRole('img', { name: 'Degraded' })).toHaveAttribute(
      'title',
      'Response times elevated',
    );
  });

  test('is not focusable or interactive', () => {
    render(() => <StatusDot variant="neutral" label="Offline" />);
    const dot = screen.getByRole('img', { name: 'Offline' });
    expect(dot).not.toHaveAttribute('tabindex');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('Badge', () => {
  test('renders an enumerated state label with the default neutral variant', () => {
    render(() => <Badge label="Pending" />);
    const badge = screen.getByText('Pending');
    expect(badge).toHaveAttribute('data-variant', 'neutral');
  });

  test.each(['neutral', 'info', 'success', 'warning', 'error'])(
    'renders the semantic %s variant',
    (variant) => {
      render(() => <Badge variant={variant} label={`State ${variant}`} />);
      expect(screen.getByText(`State ${variant}`)).toHaveAttribute('data-variant', variant);
    },
  );

  test.each(['blue', 'cyan', 'green', 'orange', 'pink', 'purple', 'red', 'teal', 'yellow'])(
    'renders the hue %s variant for category tags',
    (variant) => {
      render(() => <Badge variant={variant} label={`Tag ${variant}`} />);
      expect(screen.getByText(`Tag ${variant}`)).toHaveAttribute('data-variant', variant);
    },
  );

  test('renders a count', () => {
    render(() => <Badge variant="error" count={7} />);
    expect(screen.getByText('7')).toHaveAttribute('data-variant', 'error');
  });

  test('count above the default max of 99 renders as 99+', () => {
    render(() => <Badge count={120} />);
    expect(screen.getByText('99+')).toBeInTheDocument();
    expect(screen.queryByText('120')).not.toBeInTheDocument();
  });

  test('count equal to max renders exactly', () => {
    render(() => <Badge count={99} />);
    expect(screen.getByText('99')).toBeInTheDocument();
  });

  test('custom max caps the overflow display', () => {
    render(() => <Badge count={10} max={9} />);
    expect(screen.getByText('9+')).toBeInTheDocument();
  });

  test('count of zero still renders', () => {
    render(() => <Badge count={0} />);
    expect(screen.getByText('0')).toBeInTheDocument();
  });

  test('renders an icon alongside the label', () => {
    render(() => <Badge label="Failed" variant="error" icon={<span>!</span>} />);
    expect(screen.getByText('!')).toBeInTheDocument();
    expect(screen.getByText('Failed')).toBeInTheDocument();
  });

  test('is read-only: renders no button or link role', () => {
    render(() => <Badge label="Active" variant="success" />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
});
