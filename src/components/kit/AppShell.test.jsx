import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { AppShell } from './AppShell';

describe('AppShell', () => {
  test('renders children inside a main landmark with the given content id', () => {
    render(() => (
      <AppShell contentId="main-content">
        <p>Page body</p>
      </AppShell>
    ));
    const main = screen.getByRole('main');
    expect(main).toHaveAttribute('id', 'main-content');
    expect(main).toHaveTextContent('Page body');
  });

  test('renders the sideNav slot before the content region', () => {
    const { container } = render(() => (
      <AppShell sideNav={<nav data-testid="the-nav">nav</nav>}>content</AppShell>
    ));
    const nav = screen.getByTestId('the-nav');
    const main = screen.getByRole('main');
    expect(nav.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector('.astryx-app-shell')).toContainElement(nav);
  });

  test('frame is a 100dvh flex row with safe-area inset padding', () => {
    const { container } = render(() => <AppShell>content</AppShell>);
    const frame = container.querySelector('.astryx-app-shell');
    expect(frame.className).toContain('h-dvh');
    expect(frame.className).not.toContain('h-screen');
    expect(frame.className).toContain('pt-[env(safe-area-inset-top)]');
    expect(frame.className).toContain('pb-[env(safe-area-inset-bottom)]');
    expect(frame.className).toContain('pl-[env(safe-area-inset-left)]');
    expect(frame.className).toContain('pr-[env(safe-area-inset-right)]');
  });

  test('shows a scrim only while sideNavOpen, and clicking it requests close', () => {
    const onClose = vi.fn();
    const [open, setOpen] = createSignal(false);
    const { container } = render(() => (
      <AppShell sideNavOpen={open()} onSideNavClose={onClose}>
        content
      </AppShell>
    ));
    expect(container.querySelector('[data-app-shell-scrim]')).toBeNull();

    setOpen(true);
    const scrim = container.querySelector('[data-app-shell-scrim]');
    expect(scrim).not.toBeNull();
    // Scrim is a shell layer: it consumes the --z-scrim token, is hidden from
    // assistive tech, and stays below the sidenav layer.
    expect(scrim.className).toContain('z-[var(--z-scrim,40)]');
    expect(scrim).toHaveAttribute('aria-hidden', 'true');

    fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('merges extra classes onto frame and content region', () => {
    const { container } = render(() => (
      <AppShell class="extra-frame" contentClass="extra-content">
        content
      </AppShell>
    ));
    expect(container.querySelector('.astryx-app-shell').className).toContain('extra-frame');
    expect(screen.getByRole('main').className).toContain('extra-content');
  });
});
