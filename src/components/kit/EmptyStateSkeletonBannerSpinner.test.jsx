/**
 * Tests for the kit EmptyState, Skeleton, Banner, and Spinner (Astryx
 * re-implemented for Solid). Queries by role/text/label only, with one
 * documented exception: Skeleton is deliberately hidden from assistive tech
 * (aria-hidden="true" per the Astryx source), so it cannot appear in the
 * accessibility tree — those tests reach it through the render container's
 * root child, then assert its public attribute contract.
 *
 * Covers: rendering of every variant, the interaction contract (dismiss,
 * expand/collapse, action slots), and a11y attributes (roles per severity,
 * decorative slots, accessible names, visually-hidden labels).
 */
import { render, screen, fireEvent, within } from '@solidjs/testing-library';
import { describe, test, expect, vi } from 'vitest';
import { EmptyState } from './EmptyState';
import { Skeleton } from './Skeleton';
import { Banner } from './Banner';
import { Spinner } from './Spinner';

/**
 * The kit Button (used for Banner's dismiss/expand controls) carries its own
 * sr-only role="status" live region, so pick the status element that actually
 * contains the given text (same pattern as Toast.test.jsx).
 */
const getStatusByText = (text) =>
  screen.getAllByRole('status').find((el) => el.textContent.includes(text));

describe('EmptyState', () => {
  test('renders the title as an h3 heading inside a status region by default', () => {
    render(() => <EmptyState title="No projects yet" />);
    const heading = screen.getByRole('heading', { level: 3, name: 'No projects yet' });
    expect(heading).toBeInTheDocument();
    expect(getStatusByText('No projects yet')).toContainElement(heading);
  });

  test('headingLevel controls the rendered heading tag', () => {
    render(() => <EmptyState title="Inbox zero" headingLevel={2} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Inbox zero' })).toBeInTheDocument();
  });

  test('renders the optional description', () => {
    render(() => (
      <EmptyState title="No results" description="Try adjusting your search or filters." />
    ));
    expect(screen.getByText('Try adjusting your search or filters.')).toBeInTheDocument();
  });

  test('omits the description when not provided', () => {
    render(() => <EmptyState title="Nothing here" />);
    expect(getStatusByText('Nothing here')).toHaveTextContent(/^Nothing here$/);
  });

  test('renders the icon slot as decorative (aria-hidden)', () => {
    render(() => <EmptyState title="No messages" icon={<span>inbox-icon</span>} />);
    const icon = screen.getByText('inbox-icon');
    expect(icon.closest('[aria-hidden="true"]')).not.toBeNull();
  });

  test('renders working actions', () => {
    const onCreate = vi.fn();
    render(() => (
      <EmptyState
        title="No projects yet"
        actions={
          <button type="button" onClick={onCreate}>
            Create project
          </button>
        }
      />
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Create project' }));
    expect(onCreate).toHaveBeenCalledTimes(1);
  });

  test('isCompact exposes the compact variant', () => {
    render(() => <EmptyState title="Empty widget" isCompact />);
    expect(getStatusByText('Empty widget')).toHaveAttribute('data-variant', 'compact');
  });
});

describe('Skeleton', () => {
  // Skeleton is decorative-only: reach it via the container root (see header).
  const renderSkeleton = (ui) => render(ui).container.firstElementChild;

  test('is hidden from assistive technology', () => {
    const el = renderSkeleton(() => <Skeleton />);
    expect(el).toHaveAttribute('aria-hidden', 'true');
  });

  test('defaults to the rect shape at full width', () => {
    const el = renderSkeleton(() => <Skeleton />);
    expect(el).toHaveAttribute('data-shape', 'rect');
    expect(el).toHaveStyle({ width: '100%', height: '100%' });
  });

  test('text shape defaults to a one-line (1em) height', () => {
    const el = renderSkeleton(() => <Skeleton shape="text" />);
    expect(el).toHaveAttribute('data-shape', 'text');
    expect(el).toHaveStyle({ height: '1em' });
  });

  test('circle shape mirrors its width as height', () => {
    const el = renderSkeleton(() => <Skeleton shape="circle" width={40} />);
    expect(el).toHaveAttribute('data-shape', 'circle');
    expect(el).toHaveStyle({ width: '40px', height: '40px' });
  });

  test('numeric width/height become pixel values and strings pass through', () => {
    const el = renderSkeleton(() => <Skeleton width={200} height="2rem" />);
    expect(el).toHaveStyle({ width: '200px', height: '2rem' });
  });

  test('index staggers the animation delay (1000ms + 100ms per step)', () => {
    const first = renderSkeleton(() => <Skeleton />);
    const third = renderSkeleton(() => <Skeleton index={2} />);
    expect(first).toHaveStyle({ 'animation-delay': '1000ms' });
    expect(third).toHaveStyle({ 'animation-delay': '1200ms' });
  });
});

describe('Banner', () => {
  test('info and success render as polite status regions', () => {
    render(() => (
      <>
        <Banner status="info" title="New update available" />
        <Banner status="success" title="Payment confirmed" />
      </>
    ));
    expect(getStatusByText('New update available')).toHaveAttribute('data-status', 'info');
    expect(getStatusByText('Payment confirmed')).toHaveAttribute('data-status', 'success');
  });

  test('warning and error render as alerts', () => {
    render(() => (
      <>
        <Banner status="warning" title="Storage almost full" />
        <Banner status="error" title="Payment failed" />
      </>
    ));
    const alerts = screen.getAllByRole('alert');
    expect(alerts).toHaveLength(2);
    expect(alerts[0]).toHaveTextContent('Storage almost full');
    expect(alerts[0]).toHaveAttribute('data-status', 'warning');
    expect(alerts[1]).toHaveTextContent('Payment failed');
    expect(alerts[1]).toHaveAttribute('data-status', 'error');
  });

  test('renders the optional description below the title', () => {
    render(() => (
      <Banner status="error" title="Payment failed" description="Please try again later." />
    ));
    const banner = screen.getByRole('alert');
    expect(within(banner).getByText('Please try again later.')).toBeInTheDocument();
  });

  test('defaults to the card container and supports section', () => {
    render(() => (
      <>
        <Banner status="info" title="In a card" />
        <Banner status="info" title="Full width" container="section" />
      </>
    ));
    expect(getStatusByText('In a card')).toHaveAttribute('data-container', 'card');
    expect(getStatusByText('Full width')).toHaveAttribute('data-container', 'section');
  });

  test('shows no dismiss button unless isDismissable', () => {
    render(() => <Banner status="info" title="Sticky note" />);
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument();
  });

  test('dismissing hides the banner and calls onDismiss', () => {
    const onDismiss = vi.fn();
    render(() => (
      <Banner status="info" title="Maintenance tonight" isDismissable onDismiss={onDismiss} />
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    expect(screen.queryByText('Maintenance tonight')).not.toBeInTheDocument();
  });

  test('hides itself on dismiss even without an onDismiss handler', () => {
    render(() => <Banner status="success" title="Saved" isDismissable />);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }));
    expect(screen.queryByText('Saved')).not.toBeInTheDocument();
  });

  test('endContent renders a working end-aligned action', () => {
    const onRetry = vi.fn();
    render(() => (
      <Banner
        status="error"
        title="Sync failed"
        endContent={
          <button type="button" onClick={onRetry}>
            Retry
          </button>
        }
      />
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  test('children start collapsed behind an Expand toggle and expand on click', () => {
    render(() => (
      <Banner status="error" title="Multiple errors found">
        <ul>
          <li>Email address is invalid</li>
        </ul>
      </Banner>
    ));
    expect(screen.queryByText('Email address is invalid')).not.toBeInTheDocument();
    const toggle = screen.getByRole('button', { name: 'Expand' });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(toggle);
    expect(screen.getByText('Email address is invalid')).toBeInTheDocument();
    const collapse = screen.getByRole('button', { name: 'Collapse' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(collapse);
    expect(screen.queryByText('Email address is invalid')).not.toBeInTheDocument();
  });

  test('defaultIsExpanded shows the content area immediately', () => {
    render(() => (
      <Banner status="warning" title="Configuration changes" defaultIsExpanded>
        <p>Details here</p>
      </Banner>
    ));
    expect(screen.getByText('Details here')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Collapse' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  test('a custom icon overrides the default status glyph', () => {
    render(() => (
      <Banner status="info" title="Custom icon" icon={<span>sparkle-icon</span>} />
    ));
    const icon = screen.getByText('sparkle-icon');
    expect(icon.closest('[aria-hidden="true"]')).not.toBeNull();
  });
});

describe('Spinner', () => {
  test('renders a status with the default "Loading" accessible name', () => {
    render(() => <Spinner />);
    const spinner = screen.getByRole('status', { name: 'Loading' });
    expect(spinner).toBeInTheDocument();
    // Visually-hidden text label backs up the aria-label.
    expect(within(spinner).getByText('Loading')).toBeInTheDocument();
  });

  test('a string label is shown and becomes the accessible name', () => {
    render(() => <Spinner label="Saving changes" />);
    expect(screen.getByRole('status', { name: 'Saving changes' })).toBeInTheDocument();
    // Rendered twice: once visually hidden inside the status, once visible below.
    expect(screen.getAllByText('Saving changes').length).toBeGreaterThanOrEqual(2);
  });

  test('explicit aria-label wins over the label content', () => {
    render(() => <Spinner label={<em>Fetching data</em>} aria-label="Fetching" />);
    expect(screen.getByRole('status', { name: 'Fetching' })).toBeInTheDocument();
    expect(screen.getByText('Fetching data')).toBeInTheDocument();
  });

  test('defaults to the md size and default shade', () => {
    render(() => <Spinner />);
    const spinner = screen.getByRole('status', { name: 'Loading' });
    expect(spinner).toHaveAttribute('data-size', 'md');
    expect(spinner).toHaveAttribute('data-shade', 'default');
  });

  test('size and shade variants are exposed', () => {
    render(() => <Spinner size="lg" shade="onMedia" aria-label="Uploading" />);
    const spinner = screen.getByRole('status', { name: 'Uploading' });
    expect(spinner).toHaveAttribute('data-size', 'lg');
    expect(spinner).toHaveAttribute('data-shade', 'onMedia');
  });

  test('unknown size and shade fall back to the defaults', () => {
    render(() => <Spinner size="xxl" shade="neon" aria-label="Fallback" />);
    const spinner = screen.getByRole('status', { name: 'Fallback' });
    expect(spinner).toHaveAttribute('data-size', 'md');
    expect(spinner).toHaveAttribute('data-shade', 'default');
  });
});
