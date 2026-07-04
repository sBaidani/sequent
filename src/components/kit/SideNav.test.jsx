import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, vi } from 'vitest';
import { createSignal } from 'solid-js';
import {
  SideNav,
  SideNavSection,
  SideNavHeading,
  SideNavItem,
  SideNavCollapseButton,
} from './SideNav';

describe('SideNav', () => {
  test('renders a navigation landmark with the given accessible name', () => {
    render(() => <SideNav label="Primary">items</SideNav>);
    const nav = screen.getByRole('navigation', { name: 'Primary' });
    expect(nav).toHaveTextContent('items');
    // Root stays an <aside> element (existing e2e locators target `aside`)
    // while the explicit role makes it a navigation landmark per the spec.
    expect(nav.tagName).toBe('ASIDE');
  });

  test('defaults the landmark label to "Main"', () => {
    render(() => <SideNav>items</SideNav>);
    expect(screen.getByRole('navigation', { name: 'Main' })).toBeInTheDocument();
  });

  test('width comes from the --sidenav-width token and layer from --z-sidenav', () => {
    render(() => <SideNav>items</SideNav>);
    const nav = screen.getByRole('navigation');
    expect(nav.className).toContain('w-[var(--sidenav-width,272px)]');
    expect(nav.className).toContain('z-[var(--z-sidenav,50)]');
  });

  test('reflects the controlled open state: off-canvas / zero-width when closed', () => {
    const [open, setOpen] = createSignal(true);
    render(() => <SideNav isOpen={open()}>items</SideNav>);
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveAttribute('data-open', 'true');
    expect(nav.className).toContain('translate-x-0');

    setOpen(false);
    expect(nav).toHaveAttribute('data-open', 'false');
    expect(nav.className).toContain('-translate-x-full'); // mobile: slide out
    expect(nav.className).toContain('lg:w-0'); // desktop: collapse width
  });

  test('renders header and footer slots outside the scroll region', () => {
    render(() => (
      <SideNav header={<span>the header</span>} footer={<span>the footer</span>}>
        middle
      </SideNav>
    ));
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveTextContent('the header');
    expect(nav).toHaveTextContent('the footer');
    const scroll = nav.querySelector('.overflow-y-auto');
    expect(scroll).toHaveTextContent('middle');
    expect(scroll).not.toHaveTextContent('the header');
    expect(scroll).not.toHaveTextContent('the footer');
  });
});

describe('SideNavSection', () => {
  test('renders a named group with a visible title', () => {
    render(() => (
      <SideNavSection title="Workspace">
        <SideNavItem label="Inbox" />
      </SideNavSection>
    ));
    const group = screen.getByRole('group', { name: 'Workspace' });
    expect(group).toHaveTextContent('Workspace');
    expect(group).toHaveTextContent('Inbox');
  });

  test('isHeaderHidden keeps the accessible name but hides the visible title', () => {
    render(() => (
      <SideNavSection title="Views" isHeaderHidden>
        <SideNavItem label="Inbox" />
      </SideNavSection>
    ));
    const group = screen.getByRole('group', { name: 'Views' });
    expect(group).not.toHaveTextContent('Views');
  });
});

describe('SideNavHeading', () => {
  test('renders heading, icon, and subheading content', () => {
    render(() => (
      <SideNavHeading
        heading="Sequent"
        icon={<span data-testid="logo">S</span>}
        subheading={<span>Cloud</span>}
      />
    ));
    expect(screen.getByText('Sequent')).toBeInTheDocument();
    expect(screen.getByTestId('logo')).toBeInTheDocument();
    expect(screen.getByText('Cloud')).toBeInTheDocument();
  });
});

describe('SideNavItem', () => {
  test('renders a button whose accessible name is the label', () => {
    render(() => <SideNavItem label="Timeline" />);
    expect(screen.getByRole('button', { name: 'Timeline' })).toBeInTheDocument();
  });

  test('selected item carries aria-current="page"; others carry none', () => {
    render(() => (
      <>
        <SideNavItem label="Timeline" isSelected />
        <SideNavItem label="Calendar" />
      </>
    ));
    expect(screen.getByRole('button', { name: 'Timeline' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(screen.getByRole('button', { name: 'Calendar' })).not.toHaveAttribute('aria-current');
  });

  test('calls onClick from the control and from row clicks outside nested controls', () => {
    const onClick = vi.fn();
    const { container } = render(() => <SideNavItem label="Tasks" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    fireEvent.click(container.querySelector('.astryx-side-nav-item'));
    expect(onClick).toHaveBeenCalledTimes(2);
  });

  test('interactive endContent lives outside the item button (no nested buttons)', () => {
    const onItem = vi.fn();
    const onEnd = vi.fn();
    render(() => (
      <SideNavItem
        label="Calendar"
        onClick={onItem}
        endContent={
          <button type="button" onClick={onEnd}>
            Choose calendars
          </button>
        }
      />
    ));
    const endButton = screen.getByRole('button', { name: 'Choose calendars' });
    expect(endButton.closest('button[data-astryx-sidenav-control]')).toBeNull();
    fireEvent.click(endButton);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onItem).not.toHaveBeenCalled(); // row click guard skips nested controls
  });

  test('isDisabled disables the control and blocks activation', () => {
    const onClick = vi.fn();
    render(() => <SideNavItem label="Archive" isDisabled onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Archive' });
    expect(button).toBeDisabled();
    fireEvent.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  test('icon is decorative (hidden from assistive tech)', () => {
    const { container } = render(() => (
      <SideNavItem label="Timeline" icon={<svg data-testid="clock" />} />
    ));
    const iconWrap = screen.getByTestId('clock').parentElement;
    expect(iconWrap).toHaveAttribute('aria-hidden', 'true');
    expect(container.querySelector('.astryx-side-nav-item')).toBeTruthy();
  });
});

describe('SideNavCollapseButton', () => {
  test('renders an icon-only toggle with state-dependent label and aria-expanded', () => {
    const onClick = vi.fn();
    const [collapsed, setCollapsed] = createSignal(false);
    render(() => <SideNavCollapseButton isCollapsed={collapsed()} onClick={onClick} />);
    const button = screen.getByRole('button', { name: 'Collapse navigation' });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledTimes(1);

    setCollapsed(true);
    const expandButton = screen.getByRole('button', { name: 'Expand navigation' });
    expect(expandButton).toHaveAttribute('aria-expanded', 'false');
  });
});
