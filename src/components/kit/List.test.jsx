/**
 * Tests for the kit List + ListItem (Astryx List/ListItem re-implemented
 * for Solid). Queries by role/text/label only. Covers structure variants
 * (header, ordered lists, markers, slots), the interactive contract
 * (invisible button/anchor, container click, disabled), state a11y
 * attributes, and keyboard navigation (arrows, Home/End, wrap, roving
 * tabindex, Escape) per useListFocus semantics.
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, vi } from 'vitest';
import { List, ListItem } from './List';

describe('List', () => {
  describe('rendering', () => {
    test('renders a list with items, labels and descriptions', () => {
      render(() => (
        <List>
          <ListItem label="Notifications" description="Manage your alerts" />
          <ListItem label="Privacy" description="Control your data" />
        </List>
      ));
      const list = screen.getByRole('list');
      expect(list.tagName).toBe('UL');
      expect(screen.getAllByRole('listitem')).toHaveLength(2);
      expect(screen.getByText('Notifications')).toBeInTheDocument();
      expect(screen.getByText('Manage your alerts')).toBeInTheDocument();
      expect(screen.getByText('Control your data')).toBeInTheDocument();
    });

    test('associates the header with the list via aria-labelledby', () => {
      render(() => (
        <List header="Settings">
          <ListItem label="Profile" />
        </List>
      ));
      expect(screen.getByRole('list', { name: 'Settings' })).toBeInTheDocument();
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    test('listStyle="decimal" renders an ordered list honoring start', () => {
      render(() => (
        <List listStyle="decimal" start={3}>
          <ListItem label="Third step" />
          <ListItem label="Fourth step" />
        </List>
      ));
      const list = screen.getByRole('list');
      expect(list.tagName).toBe('OL');
      expect(list).toHaveAttribute('start', '3');
    });

    test('exposes density and list style for theming', () => {
      render(() => (
        <List density="compact" listStyle="disc">
          <ListItem label="Feature" />
        </List>
      ));
      const list = screen.getByRole('list');
      expect(list).toHaveAttribute('data-density', 'compact');
      expect(list).toHaveAttribute('data-list-style', 'disc');
    });

    test('renders start and end content slots', () => {
      render(() => (
        <List>
          <ListItem
            label="Inbox"
            startContent={<span>icon</span>}
            endContent={<span>42</span>}
          />
        </List>
      ));
      const item = screen.getByRole('listitem');
      expect(item).toHaveTextContent('icon');
      expect(item).toHaveTextContent('Inbox');
      expect(item).toHaveTextContent('42');
    });

    test('non-interactive items expose no button or link', () => {
      render(() => (
        <List>
          <ListItem label="Static row" />
        </List>
      ));
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      expect(screen.queryByRole('link')).not.toBeInTheDocument();
    });
  });

  describe('interactive items', () => {
    test('onClick renders an invisible button named by the label and fires on click', () => {
      const onClick = vi.fn();
      render(() => (
        <List>
          <ListItem label="Open profile" description="Your account" onClick={onClick} />
        </List>
      ));
      const button = screen.getByRole('button', { name: /Open profile/ });
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('clicking the row surface (outside the control) also activates the item', () => {
      const onClick = vi.fn();
      render(() => (
        <List>
          <ListItem label="Row click" onClick={onClick} />
        </List>
      ));
      fireEvent.click(screen.getByRole('listitem'));
      expect(onClick).toHaveBeenCalledTimes(1);
    });

    test('clicking a nested interactive element does not double-fire the item action', () => {
      const onClick = vi.fn();
      const onEndClick = vi.fn();
      render(() => (
        <List>
          <ListItem
            label="With action"
            onClick={onClick}
            endContent={<button type="button" onClick={onEndClick}>More</button>}
          />
        </List>
      ));
      fireEvent.click(screen.getByRole('button', { name: 'More' }));
      expect(onEndClick).toHaveBeenCalledTimes(1);
      expect(onClick).not.toHaveBeenCalled();
    });

    test('href renders an invisible link; target="_blank" merges noopener noreferrer', () => {
      render(() => (
        <List>
          <ListItem label="Docs" href="/docs" target="_blank" rel="external" />
        </List>
      ));
      const link = screen.getByRole('link', { name: 'Docs' });
      expect(link).toHaveAttribute('href', '/docs');
      expect(link).toHaveAttribute('target', '_blank');
      const rel = link.getAttribute('rel');
      expect(rel).toContain('noopener');
      expect(rel).toContain('noreferrer');
      expect(rel).toContain('external');
    });

    test('disabled item sets aria-disabled, disables the control, and swallows clicks', () => {
      const onClick = vi.fn();
      render(() => (
        <List>
          <ListItem label="Locked" onClick={onClick} isDisabled />
        </List>
      ));
      const item = screen.getByRole('listitem');
      expect(item).toHaveAttribute('aria-disabled', 'true');
      const button = screen.getByRole('button', { name: 'Locked' });
      expect(button).toBeDisabled();
      fireEvent.click(button);
      fireEvent.click(item);
      expect(onClick).not.toHaveBeenCalled();
    });

    test('disabled link item removes it from the tab order', () => {
      render(() => (
        <List>
          <ListItem label="Gone" href="/gone" isDisabled />
        </List>
      ));
      const link = screen.getByRole('link', { name: 'Gone' });
      expect(link).toHaveAttribute('aria-disabled', 'true');
      expect(link).toHaveAttribute('tabindex', '-1');
    });

    test('selected item sets aria-selected', () => {
      render(() => (
        <List>
          <ListItem label="Chosen" onClick={() => {}} isSelected />
          <ListItem label="Other" onClick={() => {}} />
        </List>
      ));
      const items = screen.getAllByRole('listitem');
      expect(items[0]).toHaveAttribute('aria-selected', 'true');
      expect(items[1]).not.toHaveAttribute('aria-selected');
    });
  });

  describe('keyboard navigation', () => {
    const renderNavList = (extraProps = {}) =>
      render(() => (
        <List {...extraProps}>
          <ListItem label="First" onClick={() => {}} />
          <ListItem label="Second" onClick={() => {}} />
          <ListItem label="Third" onClick={() => {}} />
        </List>
      ));

    test('ArrowDown and ArrowUp move focus between items', () => {
      renderNavList();
      const list = screen.getByRole('list');
      const first = screen.getByRole('button', { name: 'First' });
      const second = screen.getByRole('button', { name: 'Second' });
      first.focus();
      fireEvent.keyDown(list, { key: 'ArrowDown' });
      expect(second).toHaveFocus();
      fireEvent.keyDown(list, { key: 'ArrowUp' });
      expect(first).toHaveFocus();
    });

    test('arrow navigation wraps around at the ends by default', () => {
      renderNavList();
      const list = screen.getByRole('list');
      const first = screen.getByRole('button', { name: 'First' });
      const third = screen.getByRole('button', { name: 'Third' });
      first.focus();
      fireEvent.keyDown(list, { key: 'ArrowUp' });
      expect(third).toHaveFocus();
      fireEvent.keyDown(list, { key: 'ArrowDown' });
      expect(first).toHaveFocus();
    });

    test('wrap={false} clamps at the boundaries', () => {
      renderNavList({ wrap: false });
      const list = screen.getByRole('list');
      const first = screen.getByRole('button', { name: 'First' });
      first.focus();
      fireEvent.keyDown(list, { key: 'ArrowUp' });
      expect(first).toHaveFocus();
    });

    test('Home and End jump to the first and last enabled items', () => {
      renderNavList();
      const list = screen.getByRole('list');
      const first = screen.getByRole('button', { name: 'First' });
      const third = screen.getByRole('button', { name: 'Third' });
      first.focus();
      fireEvent.keyDown(list, { key: 'End' });
      expect(third).toHaveFocus();
      fireEvent.keyDown(list, { key: 'Home' });
      expect(first).toHaveFocus();
    });

    test('disabled items are skipped by arrow navigation', () => {
      render(() => (
        <List>
          <ListItem label="First" onClick={() => {}} />
          <ListItem label="Second" onClick={() => {}} isDisabled />
          <ListItem label="Third" onClick={() => {}} />
        </List>
      ));
      const list = screen.getByRole('list');
      screen.getByRole('button', { name: 'First' }).focus();
      fireEvent.keyDown(list, { key: 'ArrowDown' });
      expect(screen.getByRole('button', { name: 'Third' })).toHaveFocus();
    });

    test('hasRovingTabIndex keeps a single tab stop and moves it with arrows', () => {
      renderNavList({ hasRovingTabIndex: true });
      const list = screen.getByRole('list');
      const first = screen.getByRole('button', { name: 'First' });
      const second = screen.getByRole('button', { name: 'Second' });
      const third = screen.getByRole('button', { name: 'Third' });
      expect(first).toHaveAttribute('tabindex', '0');
      expect(second).toHaveAttribute('tabindex', '-1');
      expect(third).toHaveAttribute('tabindex', '-1');
      first.focus();
      fireEvent.keyDown(list, { key: 'ArrowDown' });
      expect(first).toHaveAttribute('tabindex', '-1');
      expect(second).toHaveAttribute('tabindex', '0');
    });

    test('Escape calls onEscape', () => {
      const onEscape = vi.fn();
      renderNavList({ onEscape });
      const list = screen.getByRole('list');
      screen.getByRole('button', { name: 'First' }).focus();
      fireEvent.keyDown(list, { key: 'Escape' });
      expect(onEscape).toHaveBeenCalledTimes(1);
    });

    test('Enter and Space activate the focused item via the native button contract', () => {
      const onClick = vi.fn();
      render(() => (
        <List>
          <ListItem label="Activate me" onClick={onClick} />
        </List>
      ));
      const button = screen.getByRole('button', { name: 'Activate me' });
      button.focus();
      // jsdom does not synthesize click from keydown; assert the invisible
      // control is a real <button>, whose native contract is Enter/Space.
      expect(button.tagName).toBe('BUTTON');
      fireEvent.click(button);
      expect(onClick).toHaveBeenCalledTimes(1);
    });
  });
});
