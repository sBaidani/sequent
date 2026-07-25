/**
 * Menu — SolidJS re-implementation of the Astryx DropdownMenu family,
 * named per this kit's slice: Menu + MenuItem + MenuSeparator, plus the
 * MoreMenu (three-dot overflow) convenience wrapper.
 * Specs: `npx astryx component DropdownMenu` / `DropdownMenuItem` /
 * `MoreMenu` (React sources in scratch/swizzle-dropdownmenu, -moremenu).
 *
 * Menu is the popup only (role="menu" inside an anchored Popover); the
 * trigger stays external and controlled, like the kit Popover/Dialog.
 * MoreMenu wires an IconButton trigger + Menu together and accepts the
 * Astryx data-driven `items` array (actions, dividers, sections).
 *
 * Keyboard contract (APG menu-button, mirroring Astryx useListFocus):
 * ArrowUp/ArrowDown move focus without wrapping, Home/End jump,
 * Enter/Space activate, printable characters typeahead to a matching item,
 * Tab and Escape close (focus returns to the trigger via Popover).
 */
import {
  Show,
  For,
  createContext,
  useContext,
  createSignal,
  createUniqueId,
  onMount,
  onCleanup,
  mergeProps,
} from 'solid-js';
import { cx } from './cx';
import { Popover } from './Popover';
import { IconButton } from './IconButton';

const MenuContext = createContext(null);

const ITEM_SELECTOR = '[role="menuitem"]:not([aria-disabled="true"])';
const TYPEAHEAD_RESET_MS = 500;

/**
 * An anchored popup listing actionable items (role="menu").
 *
 * @param {object} props
 * @param {boolean} props.open - Whether the menu is shown (controlled).
 * @param {() => void} props.onClose - Called on every dismiss request
 *   (Escape, Tab, outside click, item activation).
 * @param {HTMLElement | (() => HTMLElement)} props.anchorRef - Trigger
 *   element (or accessor) the menu positions against.
 * @param {string} props.label - Accessible name for the menu (aria-label),
 *   e.g. the trigger's label — screen readers announce "<label> menu".
 * @param {'above'|'below'|'start'|'end'} [props.placement='below'] - Side of
 *   the anchor; flips near viewport edges.
 * @param {'start'|'center'|'end'} [props.alignment='start'] - Alignment along
 *   the placement axis.
 * @param {number|string} [props.width] - Menu width; defaults to at least
 *   the trigger's width (Astryx behavior).
 * @param {string} [props.id] - id for the role="menu" element (wire the
 *   trigger's aria-controls to it).
 * @param {string} [props.class] - Extra classes for the menu container.
 * @param {import('solid-js').JSX.Element} props.children - MenuItem /
 *   MenuSeparator elements (or role="group" sections).
 */
export function Menu(props) {
  const merged = mergeProps({ placement: 'below', alignment: 'start' }, props);

  // Defined as a component so onMount/onCleanup run on each open/close
  // (Popover mounts children under <Show when={open}>).
  const MenuPanel = () => {
    let menuRef;
    let typeaheadBuffer = '';
    let typeaheadTimer;

    const items = () =>
      menuRef ? Array.from(menuRef.querySelectorAll(ITEM_SELECTOR)) : [];
    const currentIndex = () =>
      items().findIndex(
        (el) => el === document.activeElement || el.contains(document.activeElement),
      );
    const focusIndex = (i) => {
      const list = items();
      if (list.length === 0) return;
      list[Math.min(Math.max(i, 0), list.length - 1)].focus();
    };

    onMount(() => {
      // Focus the first enabled item when the menu opens (APG menu button).
      const list = items();
      if (list.length > 0) list[0].focus();
      else menuRef?.focus();
      onCleanup(() => clearTimeout(typeaheadTimer));
    });

    // First-character(s) typeahead: jump to the next enabled item whose
    // label starts with the typed buffer. Returns true if it matched.
    const handleTypeahead = (key) => {
      clearTimeout(typeaheadTimer);
      typeaheadBuffer += key.toLowerCase();
      typeaheadTimer = setTimeout(() => {
        typeaheadBuffer = '';
      }, TYPEAHEAD_RESET_MS);
      const list = items();
      // Repeating the same letter cycles through its matches (query is the
      // single letter, searched from the NEXT item); a growing buffer keeps
      // matching against the current item.
      const isRepeat =
        typeaheadBuffer.length > 1 &&
        [...typeaheadBuffer].every((c) => c === typeaheadBuffer[0]);
      const query = isRepeat ? typeaheadBuffer[0] : typeaheadBuffer;
      const start = Math.max(currentIndex(), 0) + (query.length === 1 ? 1 : 0);
      for (let i = 0; i < list.length; i++) {
        const el = list[(start + i) % list.length];
        if ((el.textContent ?? '').trim().toLowerCase().startsWith(query)) {
          el.focus();
          return true;
        }
      }
      return false;
    };

    const handleKeyDown = (e) => {
      const idx = currentIndex();
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          focusIndex(idx + 1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          focusIndex(idx <= 0 ? 0 : idx - 1);
          break;
        case 'Home':
          e.preventDefault();
          focusIndex(0);
          break;
        case 'End':
          e.preventDefault();
          focusIndex(items().length - 1);
          break;
        case 'Enter':
        case ' ': {
          e.preventDefault();
          const active = document.activeElement;
          if (active && active.getAttribute('role') === 'menuitem') active.click();
          break;
        }
        case 'Tab':
          // APG: Tab closes the menu. No preventDefault — closing restores
          // focus to the trigger and the browser tabs onward from there.
          props.onClose?.();
          break;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            if (handleTypeahead(e.key)) e.preventDefault();
          }
      }
    };

    return (
      <div
        ref={menuRef}
        id={props.id}
        role="menu"
        aria-label={props.label}
        tabindex="-1"
        onKeyDown={handleKeyDown}
        class={cx(
          // Astryx dropdown surface: --spacing-1 padding/gap, 300px max
          // height (spec-fixed geometry) with overflow scroll.
          'flex max-h-[300px] flex-col gap-0.5 overflow-y-auto p-1 outline-none',
          props.class,
        )}
      >
        <MenuContext.Provider value={{ close: () => props.onClose?.() }}>
          {props.children}
        </MenuContext.Provider>
      </div>
    );
  };

  return (
    <Popover
      role="none"
      open={props.open}
      onClose={props.onClose}
      anchorRef={props.anchorRef}
      placement={merged.placement}
      alignment={merged.alignment}
      width={props.width}
      matchAnchorWidth={props.width === undefined}
    >
      <MenuPanel />
    </Popover>
  );
}

/**
 * An interactive menu entry (role="menuitem"). Activation runs `onClick`
 * then closes the parent Menu. Keyboard navigation/activation is handled
 * by the parent Menu (items are roving tabindex=-1 targets).
 *
 * @param {object} props
 * @param {import('solid-js').JSX.Element} props.label - Primary label.
 * @param {import('solid-js').JSX.Element} [props.icon] - Icon before the
 *   label (decorative; hidden from assistive tech).
 * @param {import('solid-js').JSX.Element} [props.description] - Secondary
 *   text below the label.
 * @param {import('solid-js').JSX.Element} [props.endContent] - Trailing
 *   content (shortcut hint, badge...).
 * @param {() => void} [props.onClick] - Called on activation (click,
 *   Enter, Space).
 * @param {boolean} [props.isDisabled=false] - Disables activation and
 *   removes the item from keyboard navigation (aria-disabled).
 * @param {string} [props.class] - Extra classes for the item.
 */
export function MenuItem(props) {
  const ctx = useContext(MenuContext);

  const handleClick = () => {
    if (props.isDisabled) return;
    props.onClick?.();
    ctx?.close();
  };

  return (
    <div
      role="menuitem"
      tabindex={props.isDisabled ? undefined : '-1'}
      aria-disabled={props.isDisabled ? 'true' : undefined}
      onClick={handleClick}
      class={cx(
        'flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-2 py-1.5',
        'text-base text-primary outline-none',
        'hover:bg-overlay-hover focus:bg-overlay-hover',
        props.isDisabled && 'cursor-not-allowed opacity-50',
        props.class,
      )}
    >
      <Show when={props.icon}>
        <span
          aria-hidden="true"
          class="inline-flex size-4 shrink-0 items-center justify-center text-secondary"
        >
          {props.icon}
        </span>
      </Show>
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="truncate">{props.label}</span>
        <Show when={props.description}>
          <span class="truncate text-sm text-secondary">{props.description}</span>
        </Show>
      </span>
      <Show when={props.endContent}>
        <span class="ml-auto inline-flex shrink-0 items-center text-secondary">
          {props.endContent}
        </span>
      </Show>
    </div>
  );
}

/**
 * A horizontal rule between groups of menu items (role="separator").
 *
 * @param {object} props
 * @param {string} [props.class] - Extra classes.
 */
export function MenuSeparator(props) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      class={cx('my-1 h-px w-full shrink-0 bg-border', props.class)}
    />
  );
}

/** Default three-dot (moreHorizontal) glyph for the MoreMenu trigger. */
const MoreDotsIcon = () => (
  <svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" class="size-4">
    <circle cx="3" cy="8" r="1.5" />
    <circle cx="8" cy="8" r="1.5" />
    <circle cx="13" cy="8" r="1.5" />
  </svg>
);

/** Render one Astryx DropdownMenuOption (action | divider | section). */
const renderOption = (option) => {
  if (option && option.type === 'divider') return <MenuSeparator />;
  if (option && option.type === 'section') {
    return (
      <div role="group" aria-label={option.title}>
        <Show when={option.title}>
          {/* Heading is decorative; the group's aria-label carries the name. */}
          <div aria-hidden="true" class="select-none px-2 py-1 text-sm text-secondary">
            {option.title}
          </div>
        </Show>
        <For each={option.items}>{(item) => renderOption(item)}</For>
      </div>
    );
  }
  return (
    <MenuItem
      label={option.label}
      icon={option.icon}
      onClick={option.onClick}
      isDisabled={option.isDisabled}
    />
  );
};

/**
 * MoreMenu — three-dot overflow menu: an IconButton trigger wired to a Menu.
 * Accepts the Astryx data-driven `items` array.
 *
 * @param {object} props
 * @param {Array<{label: string, onClick?: () => void, icon?: import('solid-js').JSX.Element, isDisabled?: boolean}
 *   | {type: 'divider'}
 *   | {type: 'section', title?: string, items: Array}>} props.items - Menu
 *   entries: actions, `{type:'divider'}`, or `{type:'section', title, items}`.
 * @param {string} [props.label='More options'] - Accessible label for the
 *   trigger button (aria-label) and the menu.
 * @param {'primary'|'secondary'|'ghost'|'destructive'} [props.variant='ghost'] - Trigger button variant.
 * @param {'sm'|'md'|'lg'} [props.size='md'] - Trigger button size.
 * @param {import('solid-js').JSX.Element} [props.icon] - Override the
 *   default three-dot icon.
 * @param {boolean} [props.isDisabled=false] - Disables the trigger.
 * @param {boolean} [props.open] - Controlled open state (optional; omit for
 *   uncontrolled).
 * @param {(isOpen: boolean) => void} [props.onOpenChange] - Fired when the
 *   open state changes.
 * @param {number|string} [props.menuWidth] - Custom menu width.
 * @param {'above'|'below'|'start'|'end'} [props.placement='below'] - Menu placement.
 * @param {string} [props.class] - Extra classes for the trigger button.
 */
export function MoreMenu(props) {
  const merged = mergeProps(
    { label: 'More options', variant: 'ghost', size: 'md', isDisabled: false, placement: 'below' },
    props,
  );
  const [internalOpen, setInternalOpen] = createSignal(false);
  const menuId = createUniqueId();
  let triggerEl;

  const isOpen = () => (props.open !== undefined ? props.open : internalOpen());
  const setOpen = (next) => {
    if (props.open === undefined) setInternalOpen(next);
    props.onOpenChange?.(next);
  };

  const handleTriggerKeyDown = (e) => {
    // ArrowDown opens like Enter/Space (which fire click natively on <button>).
    if (!isOpen() && e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
    }
  };

  return (
    <>
      <IconButton
        ref={(el) => (triggerEl = el)}
        label={merged.label}
        icon={merged.icon ?? <MoreDotsIcon />}
        variant={merged.variant}
        size={merged.size}
        isDisabled={merged.isDisabled}
        aria-haspopup="menu"
        aria-expanded={isOpen() ? 'true' : 'false'}
        aria-controls={menuId}
        onClick={() => setOpen(!isOpen())}
        onKeyDown={handleTriggerKeyDown}
        class={props.class}
      />
      <Menu
        open={isOpen()}
        onClose={() => setOpen(false)}
        anchorRef={() => triggerEl}
        label={merged.label}
        id={menuId}
        placement={merged.placement}
        width={props.menuWidth}
      >
        <For each={props.items}>{(option) => renderOption(option)}</For>
      </Menu>
    </>
  );
}
