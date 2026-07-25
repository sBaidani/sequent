/**
 * Tests for the kit Menu family (Astryx DropdownMenu/MoreMenu re-implemented
 * for Solid): Menu + MenuItem + MenuSeparator + MoreMenu. Queries by
 * role/label/text only. Covers menu semantics (role=menu/menuitem/separator,
 * aria-label, aria-disabled), the keyboard contract (arrows without wrap,
 * Home/End, Enter/Space activation, Tab/Escape close, typeahead), activation
 * closing the menu, and the MoreMenu trigger wiring (aria-haspopup/expanded/
 * controls, toggle, ArrowDown-to-open, dividers and sections).
 */
import { render, screen, fireEvent } from '@solidjs/testing-library';
import { describe, test, expect, vi } from 'vitest';
import { createSignal } from 'solid-js';
import { Menu, MenuItem, MenuSeparator, MoreMenu } from './Menu';

function MenuHarness(props) {
  const [open, setOpen] = createSignal(true);
  let anchor;
  const close = () => {
    props.onClose?.();
    setOpen(false);
  };
  return (
    <>
      <button ref={anchor}>Actions</button>
      <Menu open={open()} onClose={close} anchorRef={() => anchor} label="Actions">
        <MenuItem label="Edit" onClick={props.onEdit} />
        <MenuItem label="Duplicate" onClick={props.onDuplicate} />
        <MenuSeparator />
        <MenuItem label="Archive" isDisabled onClick={props.onArchive} />
        <MenuItem label="Delete" onClick={props.onDelete} />
      </Menu>
    </>
  );
}

const item = (name) => screen.getByRole('menuitem', { name });

describe('Menu', () => {
  describe('rendering and a11y attributes', () => {
    test('renders a labelled menu with menuitems and a separator', () => {
      render(() => <MenuHarness />);
      expect(screen.getByRole('menu', { name: 'Actions' })).toBeInTheDocument();
      expect(screen.getAllByRole('menuitem')).toHaveLength(4);
      expect(screen.getByRole('separator')).toHaveAttribute('aria-orientation', 'horizontal');
    });

    test('renders nothing while closed', () => {
      let anchor;
      render(() => (
        <>
          <button ref={anchor}>Actions</button>
          <Menu open={false} onClose={() => {}} anchorRef={() => anchor} label="Actions">
            <MenuItem label="Edit" />
          </Menu>
        </>
      ));
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    test('disabled items expose aria-disabled and are not focus targets', () => {
      render(() => <MenuHarness />);
      const archive = item('Archive');
      expect(archive).toHaveAttribute('aria-disabled', 'true');
      expect(archive).not.toHaveAttribute('tabindex');
      expect(item('Edit')).toHaveAttribute('tabindex', '-1');
    });

    test('renders icon, description and endContent slots', () => {
      let anchor;
      render(() => (
        <>
          <button ref={anchor}>Actions</button>
          <Menu open onClose={() => {}} anchorRef={() => anchor} label="Actions">
            <MenuItem
              label="Rename"
              description="Change the file name"
              icon={<svg data-testid="ignored" />}
              endContent={<span>⌘R</span>}
            />
          </Menu>
        </>
      ));
      const it = screen.getByRole('menuitem');
      expect(it).toHaveTextContent('Rename');
      expect(it).toHaveTextContent('Change the file name');
      expect(it).toHaveTextContent('⌘R');
    });
  });

  describe('keyboard interaction', () => {
    test('focuses the first item on open', () => {
      render(() => <MenuHarness />);
      expect(item('Edit')).toHaveFocus();
    });

    test('ArrowDown/ArrowUp move focus, skipping disabled items, without wrapping', () => {
      render(() => <MenuHarness />);
      fireEvent.keyDown(item('Edit'), { key: 'ArrowDown' });
      expect(item('Duplicate')).toHaveFocus();
      // Archive is disabled — skipped straight to Delete.
      fireEvent.keyDown(item('Duplicate'), { key: 'ArrowDown' });
      expect(item('Delete')).toHaveFocus();
      // No wrap at the end...
      fireEvent.keyDown(item('Delete'), { key: 'ArrowDown' });
      expect(item('Delete')).toHaveFocus();
      fireEvent.keyDown(item('Delete'), { key: 'ArrowUp' });
      expect(item('Duplicate')).toHaveFocus();
      fireEvent.keyDown(item('Duplicate'), { key: 'ArrowUp' });
      expect(item('Edit')).toHaveFocus();
      // ...and none at the start.
      fireEvent.keyDown(item('Edit'), { key: 'ArrowUp' });
      expect(item('Edit')).toHaveFocus();
    });

    test('Home and End jump to the first and last enabled items', () => {
      render(() => <MenuHarness />);
      fireEvent.keyDown(item('Edit'), { key: 'End' });
      expect(item('Delete')).toHaveFocus();
      fireEvent.keyDown(item('Delete'), { key: 'Home' });
      expect(item('Edit')).toHaveFocus();
    });

    test('Enter activates the focused item and closes the menu', () => {
      const onEdit = vi.fn();
      const onClose = vi.fn();
      render(() => <MenuHarness onEdit={onEdit} onClose={onClose} />);
      fireEvent.keyDown(item('Edit'), { key: 'Enter' });
      expect(onEdit).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    test('Space activates the focused item', () => {
      const onDuplicate = vi.fn();
      render(() => <MenuHarness onDuplicate={onDuplicate} />);
      fireEvent.keyDown(item('Edit'), { key: 'ArrowDown' });
      fireEvent.keyDown(item('Duplicate'), { key: ' ' });
      expect(onDuplicate).toHaveBeenCalledTimes(1);
    });

    test('typeahead focuses the next item starting with the typed character', () => {
      render(() => <MenuHarness />);
      fireEvent.keyDown(item('Edit'), { key: 'd' });
      expect(item('Duplicate')).toHaveFocus();
      fireEvent.keyDown(item('Duplicate'), { key: 'd' });
      expect(item('Delete')).toHaveFocus();
    });

    test('Tab closes the menu', () => {
      const onClose = vi.fn();
      render(() => <MenuHarness onClose={onClose} />);
      fireEvent.keyDown(item('Edit'), { key: 'Tab' });
      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    });

    test('Escape closes the menu and restores focus to the trigger', () => {
      function Toggleable() {
        const [open, setOpen] = createSignal(false);
        let anchor;
        return (
          <>
            <button ref={anchor} onClick={() => setOpen(!open())}>
              Actions
            </button>
            <Menu open={open()} onClose={() => setOpen(false)} anchorRef={() => anchor} label="Actions">
              <MenuItem label="Edit" />
            </Menu>
          </>
        );
      }
      render(() => <Toggleable />);
      const trigger = screen.getByRole('button', { name: 'Actions' });
      trigger.focus();
      fireEvent.click(trigger);
      expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(screen.queryByRole('menu')).not.toBeInTheDocument();
      expect(trigger).toHaveFocus();
    });
  });

  describe('pointer interaction', () => {
    test('clicking an item calls its handler and closes the menu', () => {
      const onDelete = vi.fn();
      const onClose = vi.fn();
      render(() => <MenuHarness onDelete={onDelete} onClose={onClose} />);
      fireEvent.click(item('Delete'));
      expect(onDelete).toHaveBeenCalledTimes(1);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('clicking a disabled item does nothing', () => {
      const onArchive = vi.fn();
      const onClose = vi.fn();
      render(() => <MenuHarness onArchive={onArchive} onClose={onClose} />);
      fireEvent.click(item('Archive'));
      expect(onArchive).not.toHaveBeenCalled();
      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole('menu')).toBeInTheDocument();
    });

    test('mousedown outside closes the menu', () => {
      const onClose = vi.fn();
      render(() => <MenuHarness onClose={onClose} />);
      fireEvent.mouseDown(document.body);
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});

describe('MoreMenu', () => {
  const baseItems = (handlers = {}) => [
    { label: 'Edit', onClick: handlers.onEdit },
    { label: 'Share', onClick: handlers.onShare },
    { type: 'divider' },
    { label: 'Delete', onClick: handlers.onDelete },
  ];

  test('renders an icon-only trigger with the menu-button ARIA wiring', () => {
    render(() => <MoreMenu items={baseItems()} />);
    const trigger = screen.getByRole('button', { name: 'More options' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(trigger).toHaveAttribute('aria-controls');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('clicking the trigger opens the menu, focuses the first item, and toggles closed', () => {
    render(() => <MoreMenu items={baseItems()} />);
    const trigger = screen.getByRole('button', { name: 'More options' });
    fireEvent.click(trigger);
    const menu = screen.getByRole('menu', { name: 'More options' });
    expect(menu).toHaveAttribute('id', trigger.getAttribute('aria-controls'));
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Edit' })).toHaveFocus();
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('ArrowDown on the trigger opens the menu', () => {
    render(() => <MoreMenu items={baseItems()} />);
    const trigger = screen.getByRole('button', { name: 'More options' });
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  test('activating an item runs its action and closes the menu', () => {
    const onDelete = vi.fn();
    const onOpenChange = vi.fn();
    render(() => <MoreMenu items={baseItems({ onDelete })} onOpenChange={onOpenChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'More options' }));
    expect(onOpenChange).toHaveBeenLastCalledWith(true);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Delete' }));
    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('renders dividers, sections (role=group with label) and disabled items from data', () => {
    render(() => (
      <MoreMenu
        label="Row actions"
        items={[
          { label: 'Open', onClick: () => {} },
          { type: 'divider' },
          {
            type: 'section',
            title: 'Danger zone',
            items: [
              { label: 'Archive', isDisabled: true },
              { label: 'Delete' },
            ],
          },
        ]}
      />
    ));
    fireEvent.click(screen.getByRole('button', { name: 'Row actions' }));
    expect(screen.getByRole('menu', { name: 'Row actions' })).toBeInTheDocument();
    expect(screen.getByRole('separator')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Danger zone' })).toBeInTheDocument();
    expect(screen.getByText('Danger zone')).toBeInTheDocument();
    expect(screen.getByRole('menuitem', { name: 'Archive' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
  });

  test('a disabled trigger does not open the menu', () => {
    render(() => <MoreMenu items={baseItems()} isDisabled />);
    const trigger = screen.getByRole('button', { name: 'More options' });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });

  test('supports controlled open state', () => {
    function Controlled() {
      const [open, setOpen] = createSignal(false);
      return (
        <>
          <button onClick={() => setOpen(true)}>external open</button>
          <MoreMenu items={baseItems()} open={open()} onOpenChange={setOpen} />
        </>
      );
    }
    render(() => <Controlled />);
    fireEvent.click(screen.getByRole('button', { name: 'external open' }));
    expect(screen.getByRole('menu')).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
  });
});
