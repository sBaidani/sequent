// Kit Selector — SolidJS re-implementation of Astryx Selector.
// Spec: `npx astryx component Selector` / `npx astryx component SelectorOption`
// (single-choice dropdown with label/description/status anatomy, sections,
// dividers, search, clear, disabled-message a11y).
// React source studied via `npx astryx swizzle Selector`
// (scratch/swizzle-selector: Selector.tsx, hooks.ts, utils.ts,
// SelectorOption.tsx) for the exact combobox/listbox contract:
//   - trigger button: role="combobox", aria-haspopup="listbox",
//     aria-expanded, aria-controls, aria-activedescendant
//   - popup: role="listbox" of role="option" items (aria-selected,
//     aria-disabled), sections as role="group" with aria-label
//   - keyboard: ArrowUp/Down (opens closed trigger), Enter/Space select,
//     Home/End, Escape/Tab close, typeahead, Delete/Backspace clear
//   - hasSearch mode: the popup's search input becomes the combobox that
//     owns aria-activedescendant; the trigger is a plain button
// Astryx's popover is replaced with an absolutely-positioned dropdown +
// document-level light dismiss (the kit has no Popover/Layer primitive).
//
// Every styling value is an Astryx token via the Tailwind bridge
// (@astryxdesign/core/src/tailwind-theme.css) or a var(--*) custom property.
// The wrapper chrome and status plumbing mirror TextInput.jsx (private
// --input-* CSS variables recolor border/focus/hover per status).
import {
  createEffect,
  createMemo,
  createSignal,
  createUniqueId,
  mergeProps,
  onCleanup,
  splitProps,
  For,
  Show,
  Switch,
  Match,
  useContext,
} from 'solid-js';
import { cx } from './cx';
import { FormLayoutContext } from './FormLayout';
import { EscapeLayer, useOutsideDismiss } from './overlayStack';

// ─── Option normalization (ported from swizzled utils.ts) ──────────────────

const isDivider = (o) => typeof o === 'object' && o !== null && o.type === 'divider';
const isSection = (o) => typeof o === 'object' && o !== null && o.type === 'section';
// The doc spec says sections carry `items`; the React source reads `options`.
// Accept both.
const sectionItemsOf = (section) => section.items ?? section.options ?? [];
const normalizeOption = (o) =>
  typeof o === 'string' ? { value: o, label: o } : { ...o, label: o.label ?? o.value };

/** Flatten strings/objects/sections into selectable options; skip dividers. */
const getSelectableOptions = (options) => {
  const result = [];
  for (const option of options ?? []) {
    if (isDivider(option)) continue;
    if (isSection(option)) {
      for (const item of sectionItemsOf(option)) result.push(normalizeOption(item));
    } else {
      result.push(normalizeOption(option));
    }
  }
  return result;
};

// ─── Field chrome (inlined per kit rules; mirrors TextInput/TextArea) ──────

const LABEL_BASE = cx(
  'flex items-center gap-1 font-sans font-medium',
  'text-base leading-[var(--text-label-leading)]',
);
const INDICATOR_CLASSES =
  'font-normal text-sm leading-[var(--text-supporting-leading)] text-secondary';
const DESCRIPTION_CLASSES =
  'font-sans font-normal text-sm leading-[var(--text-supporting-leading)] text-secondary';

const STATUS_MESSAGE_BASE = cx(
  'font-sans text-sm leading-[var(--text-supporting-leading)]',
  '-mt-1.5 pt-[calc(var(--spacing-1-5)+var(--spacing-2))] pb-2 px-2 rounded-b-md',
);
const STATUS_MESSAGE_COLORS = {
  error: 'bg-error-muted text-red-vivid',
  warning: 'bg-warning-muted text-yellow-vivid',
  success: 'bg-success-muted text-green-vivid',
};

// Trigger wrapper = the input-like surface. The inner combobox button is
// borderless; the wrapper renders the focus ring via focus-within, matching
// TextInput (and the swizzled source's inputWrapperStyles comment: the button
// must not draw its own outline or the rings stack).
const WRAPPER_BASE = cx(
  'astryx-selector relative z-[1] box-border flex items-center justify-between gap-2 py-2 px-3',
  'rounded-md bg-surface cursor-pointer',
  'border-(length:--border-width) border-solid',
  'border-[var(--input-border,var(--color-border-emphasized))]',
  'focus-within:border-[var(--input-focus-border,var(--color-accent))]',
  'focus-within:shadow-[inset_0_0_0_2px_var(--color-accent-muted)]',
  'hover:not-focus-within:shadow-[var(--input-hover-shadow,inset_0_0_0_2px_color-mix(in_srgb,var(--color-border-emphasized)_30%,transparent))]',
  'transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-out',
  'motion-reduce:transition-none outline-none',
);
const WRAPPER_DISABLED = 'cursor-not-allowed opacity-50';
const statusWrapperVars = (type) => ({
  '--input-border': `var(--color-${type})`,
  '--input-focus-border': `var(--color-${type})`,
  '--input-hover-shadow': `var(--shadow-inset-${type})`,
});

const SIZE_CLASSES = {
  sm: 'h-(--size-element-sm)',
  md: 'h-(--size-element-md)',
  lg: 'h-(--size-element-lg)',
};

const TRIGGER_BUTTON_CLASSES = cx(
  'flex flex-1 min-w-0 items-center justify-between gap-2 p-0 m-0 border-0',
  'bg-transparent cursor-pointer text-left outline-none',
  'font-sans text-base leading-[var(--text-label-leading)] text-inherit',
);

const DROPDOWN_BASE = cx(
  'absolute left-0 right-0 z-50 box-border',
  'rounded-md bg-popover shadow-md',
  'border-(length:--border-width) border-solid border-border',
);
const DROPDOWN_PLACEMENT = {
  below: 'top-full mt-1',
  above: 'bottom-full mb-1',
};

// Astryx spec fixes the dropdown scroll window at 300px.
const LISTBOX_CLASSES = 'max-h-[300px] overflow-y-auto p-1';

const ITEM_BASE = cx(
  'box-border flex w-full items-center justify-between gap-2 p-2 rounded-md',
  'font-sans text-base leading-[var(--text-label-leading)] text-primary',
  'bg-transparent border-0 cursor-pointer text-left outline-none',
);
const ITEM_SIZE_CLASSES = {
  sm: 'py-1 px-2',
  md: 'py-1.5',
  lg: '',
};

const STATUS_ICON_COLORS = {
  error: 'text-error',
  warning: 'text-warning',
  success: 'text-success',
};

// Typeahead buffer resets after this pause (matches the swizzled source).
const TYPEAHEAD_RESET_MS = 500;

/** Minimal inline status icon (error !, warning !, success ✓); aria-hidden. */
const StatusIcon = (props) => (
  <svg
    class={cx('shrink-0', STATUS_ICON_COLORS[props.type])}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <Show
      when={props.type === 'success'}
      fallback={
        <>
          <Show
            when={props.type === 'warning'}
            fallback={<circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />}
          >
            <path d="M8 1.5 15 14H1L8 1.5Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" />
          </Show>
          <path d="M8 5v3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          <circle cx="8" cy="11.25" r="0.9" fill="currentColor" />
        </>
      }
    >
      <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
      <path d="m5 8.2 2 2L11 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
    </Show>
  </svg>
);

/** Minimal inline spinner; aria-hidden (busy state is on the trigger). */
const InlineSpinner = () => (
  <svg
    class="shrink-0 animate-spin motion-reduce:animate-none text-secondary"
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-opacity="0.25" stroke-width="2" />
    <path d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
  </svg>
);

const ChevronIcon = (props) => (
  <svg
    class={cx(
      'shrink-0 text-secondary',
      'transition-transform duration-[var(--duration-fast)] motion-reduce:transition-none',
      props.open && 'rotate-180',
    )}
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <path d="m3.5 6 4.5 4.5L12.5 6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg class="shrink-0 text-accent" width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path d="m3 8.5 3.5 3.5L13 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
);

/**
 * Helper for rendering custom option rows inside Selector's `renderOption`
 * prop (per the Astryx SelectorOption spec). Lays out icon + label +
 * description + endContent with design-system spacing.
 *
 * @param {object} props
 * @param {import('solid-js').JSX.Element} props.label - Primary label text (required).
 * @param {import('solid-js').JSX.Element} [props.icon] - Leading adornment
 *   before the label (pass an aria-hidden icon element; the kit has no
 *   semantic icon registry, so this is a JSX slot rather than an icon name).
 * @param {import('solid-js').JSX.Element} [props.description] - Secondary
 *   text displayed below the label.
 * @param {import('solid-js').JSX.Element} [props.endContent] - Content
 *   rendered after the label/description.
 * @param {string} [props.class] - Extra classes for the root element.
 */
export function SelectorOption(props) {
  return (
    <span class={cx('astryx-selector-option flex min-w-0 flex-1 items-center gap-2', props.class)}>
      <Show when={props.icon}>
        <span class="inline-flex shrink-0 items-center justify-center text-secondary">{props.icon}</span>
      </Show>
      <span class="flex min-w-0 flex-1 flex-col">
        <span class="truncate text-base leading-[var(--text-label-leading)]">{props.label}</span>
        <Show when={props.description}>
          <span class="truncate text-sm leading-[var(--text-supporting-leading)] text-secondary">
            {props.description}
          </span>
        </Show>
      </span>
      <Show when={props.endContent}>
        <span class="shrink-0">{props.endContent}</span>
      </Show>
    </span>
  );
}

/**
 * Single-choice dropdown selector: a combobox trigger button opening a
 * listbox popover, with full keyboard support (arrows open/navigate,
 * Enter/Space select, Home/End jump, Escape closes, typeahead jumps to a
 * match, Delete/Backspace clears when clearable).
 *
 * Props (per the Astryx Selector spec, adapted to Solid):
 * @param {string} label - Label text (required). Always associated with the
 *   trigger via for/id; visually hidden with `isLabelHidden`.
 * @param {Array<string|{value: string, label?: string, icon?: any, disabled?: boolean}
 *   |{type: 'divider'}|{type: 'section', title?: string, items: any[]}>} options
 *   Options: strings, objects, dividers, or titled sections (sections also
 *   accept `options` for parity with the React source).
 * @param {string|null} [value] - Currently selected value.
 * @param {(value: string|null) => void} [onChange] - Fired on selection;
 *   receives null when cleared (only reachable with `hasClear`).
 * @param {(value: string|null) => void|Promise<void>} [changeAction] - Async
 *   action fired after onChange; shows the spinner and aria-busy while pending.
 * @param {boolean} [hasClear=false] - Clear (×) button when a value is
 *   selected; Delete/Backspace on the closed trigger also clears.
 * @param {boolean} [hasSearch=false] - Search input inside the popup that
 *   filters options; it becomes the combobox owning aria-activedescendant.
 * @param {string} [searchPlaceholder='Search...'] - Search input placeholder.
 * @param {string} [placeholder='Select...'] - Trigger text when nothing is
 *   selected.
 * @param {'sm'|'md'|'lg'} [size='md'] - Size variant (--size-element-*).
 * @param {boolean} [isDisabled=false] - Disables the selector.
 * @param {string} [disabledMessage] - Why the selector is disabled. With
 *   isDisabled, the trigger stays focusable via aria-disabled and the message
 *   is exposed through aria-describedby (and a native title tooltip);
 *   activation stays blocked.
 * @param {boolean} [isLabelHidden=false] - Visually hide label + description
 *   (kept for screen readers).
 * @param {string} [description] - Helper text below the label, referenced by
 *   aria-describedby.
 * @param {boolean} [isOptional=false] - "Optional" indicator.
 * @param {boolean} [isRequired=false] - "Required" indicator + aria-required.
 * @param {boolean} [isLoading=false] - Spinner + aria-busy.
 * @param {{type: 'error'|'warning'|'success', message?: string}} [status]
 *   Validation status: colored border + status icon (replacing the chevron);
 *   the message renders below (role=alert for error) and joins
 *   aria-describedby. Error also sets aria-invalid.
 * @param {(option: {value: string, label?: string}) => import('solid-js').JSX.Element}
 *   [renderOption] - Custom renderer for selectable option rows (dividers and
 *   sections are rendered by the selector). Compose SelectorOption inside it.
 * @param {import('solid-js').JSX.Element} [startIcon] - Leading adornment in
 *   the trigger.
 * @param {string} [labelTooltip] - Info hint at the end of the label (native
 *   title tooltip in this kit).
 * @param {'above'|'below'} [placement='below'] - Dropdown placement relative
 *   to the trigger.
 * @param {boolean} [isDefaultOpen=false] - Open the dropdown on mount
 *   (showcases/previews).
 * @param {number|string} [width] - Width of the whole field (number = px).
 * @param {string} [class] - Extra classes merged onto the trigger wrapper.
 * Remaining props (data-testid, aria-*, ...) are spread onto the trigger button.
 */
export function Selector(props) {
  const merged = mergeProps(
    {
      size: 'md',
      placeholder: 'Select...',
      searchPlaceholder: 'Search...',
      isLabelHidden: false,
      isOptional: false,
      isRequired: false,
      isDisabled: false,
      isLoading: false,
      hasClear: false,
      hasSearch: false,
      isDefaultOpen: false,
      placement: 'below',
    },
    props,
  );
  const [local, rest] = splitProps(merged, [
    'label',
    'isLabelHidden',
    'description',
    'isOptional',
    'isRequired',
    'isDisabled',
    'disabledMessage',
    'options',
    'value',
    'onChange',
    'changeAction',
    'hasClear',
    'hasSearch',
    'searchPlaceholder',
    'isLoading',
    'placeholder',
    'size',
    'status',
    'labelTooltip',
    'startIcon',
    'renderOption',
    'placement',
    'isDefaultOpen',
    'width',
    'class',
    'ref',
  ]);

  const layout = useContext(FormLayoutContext);
  const isHorizontalLabels = () => layout.direction === 'horizontal-labels';

  const id = createUniqueId();
  const triggerId = `${id}-trigger`;
  const labelId = `${id}-label`;
  const listboxId = `${id}-listbox`;
  const descriptionId = `${id}-desc`;
  const statusMessageId = `${id}-status`;
  const disabledMessageId = `${id}-disabled`;

  let rootEl;
  let triggerEl;
  let searchEl;

  const [isOpen, setOpen] = createSignal(local.isDefaultOpen);
  const [highlightedIndex, setHighlightedIndex] = createSignal(-1);
  const [searchQuery, setSearchQuery] = createSignal('');
  const [isPending, setPending] = createSignal(false);
  // Monotonic id so a stale changeAction settling doesn't clear a newer one.
  let actionId = 0;

  const isBusy = () => local.isLoading || isPending();
  const showsDisabledMessage = () => local.isDisabled && !!local.disabledMessage;
  const size = () => (SIZE_CLASSES[local.size] ? local.size : 'md');
  const indicator = () => (local.isOptional ? 'Optional' : local.isRequired ? 'Required' : null);

  const selectableItems = createMemo(() => getSelectableOptions(local.options));
  const filteredItems = createMemo(() => {
    const query = searchQuery().toLowerCase();
    if (!query) return selectableItems();
    return selectableItems().filter((item) =>
      (item.label ?? item.value).toLowerCase().includes(query),
    );
  });
  // Keyboard navigation walks this list; item ids are its flat indices.
  const navItems = () => (local.hasSearch && searchQuery() ? filteredItems() : selectableItems());

  const selectedItem = createMemo(() =>
    local.value == null ? undefined : selectableItems().find((i) => i.value === local.value),
  );
  const findSelectedIndex = () => selectableItems().findIndex((i) => i.value === local.value);

  const getItemId = (index) => `${listboxId}-item-${index}`;
  const enabledIndices = () =>
    navItems()
      .map((item, i) => (!item.disabled ? i : -1))
      .filter((i) => i >= 0);

  const ariaDescribedBy = () =>
    cx(
      local.description && descriptionId,
      local.status?.message && statusMessageId,
      showsDisabledMessage() && disabledMessageId,
    ) || undefined;

  // ── open/close ──
  const open = () => {
    if (isOpen()) return;
    setOpen(true);
    if (local.hasSearch) {
      const focusSearch = () => searchEl?.focus();
      typeof requestAnimationFrame === 'function'
        ? requestAnimationFrame(focusSearch)
        : focusSearch();
    }
  };
  const openWithSelectionHighlighted = () => {
    open();
    if (!local.hasSearch) {
      const selectedIndex = findSelectedIndex();
      setHighlightedIndex(selectedIndex >= 0 ? selectedIndex : 0);
    }
  };
  const close = ({ refocus = false } = {}) => {
    if (!isOpen()) return;
    setOpen(false);
    setHighlightedIndex(-1);
    setSearchQuery('');
    if (refocus) triggerEl?.focus();
  };

  // Light dismiss: pointer down anywhere outside the field closes the popup
  // (without stealing focus back), matching the popover's hasLightDismiss.
  useOutsideDismiss({ isOpen, refs: [() => rootEl], onDismiss: () => close() });

  // Keep the highlighted option visible inside the fixed-height listbox.
  createEffect(() => {
    if (!isOpen() || highlightedIndex() < 0) return;
    document.getElementById(getItemId(highlightedIndex()))?.scrollIntoView?.({ block: 'nearest' });
  });

  // ── selection ──
  const runChangeAction = (value) => {
    if (!local.changeAction) return;
    const current = ++actionId;
    setPending(true);
    Promise.resolve()
      .then(() => local.changeAction(value))
      .finally(() => {
        if (current === actionId) setPending(false);
      });
  };

  const selectItem = (item) => {
    if (item.disabled) return;
    local.onChange?.(item.value);
    runChangeAction(item.value);
    close({ refocus: true });
  };

  const clearValue = () => {
    local.onChange?.(null);
    runChangeAction(null);
  };

  const handleClear = (e) => {
    e.stopPropagation(); // don't toggle the popup
    clearValue();
    triggerEl?.focus();
  };

  const handleTriggerClick = () => {
    if (local.isDisabled) return;
    if (isOpen()) {
      close();
    } else {
      openWithSelectionHighlighted();
      triggerEl?.focus();
    }
  };

  // ── keyboard (ported from the swizzled useCombobox) ──
  let typeahead = '';
  let typeaheadTimeout;
  onCleanup(() => clearTimeout(typeaheadTimeout));

  const moveHighlight = (delta) => {
    const enabled = enabledIndices();
    if (enabled.length === 0) return;
    const pos = enabled.indexOf(highlightedIndex());
    if (pos === -1) {
      // No current highlight (e.g. right after the search input reset it
      // on typing): ArrowDown starts at the first enabled option, ArrowUp
      // at the last — matching the documented "open via ArrowUp highlights
      // last item" behavior instead of always landing on the first.
      setHighlightedIndex(delta < 0 ? enabled[enabled.length - 1] : enabled[0]);
      return;
    }
    const nextPos = Math.min(Math.max(pos + delta, 0), enabled.length - 1);
    setHighlightedIndex(enabled[nextPos] ?? highlightedIndex());
  };

  const handleKeyDown = (e) => {
    if (local.isDisabled) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen()) {
          open();
          setHighlightedIndex(0);
        } else {
          moveHighlight(1);
        }
        break;

      case 'ArrowUp':
        e.preventDefault();
        if (!isOpen()) {
          open();
          setHighlightedIndex(navItems().length - 1);
        } else {
          moveHighlight(-1);
        }
        break;

      case ' ':
        if (local.hasSearch) break; // space types into the search input
      // falls through
      case 'Enter':
        e.preventDefault();
        if (isOpen() && highlightedIndex() >= 0) {
          const item = navItems()[highlightedIndex()];
          if (item && !item.disabled) selectItem(item);
        } else if (!isOpen()) {
          openWithSelectionHighlighted();
        }
        break;

      // Escape is handled by the shared overlay stack (see the EscapeLayer
      // rendered alongside the dropdown below) rather than here: a local
      // handler that closed synchronously on this element would pop this
      // Selector off the stack before the keydown finished bubbling to
      // `document`, which would let the shared listener wrongly fall
      // through to an ancestor Dialog on the very same Escape press.

      case 'Tab':
        if (isOpen()) close(); // let focus move on
        break;

      case 'Home':
        e.preventDefault();
        if (isOpen() && enabledIndices().length > 0) {
          setHighlightedIndex(enabledIndices()[0]);
        }
        break;

      case 'End':
        e.preventDefault();
        if (isOpen() && enabledIndices().length > 0) {
          const enabled = enabledIndices();
          setHighlightedIndex(enabled[enabled.length - 1]);
        }
        break;

      case 'Delete':
      case 'Backspace':
        // Keyboard equivalent of the clear button: only from the closed,
        // non-search trigger with a clearable value.
        if (!local.hasSearch && !isOpen() && local.hasClear && local.value != null) {
          e.preventDefault();
          clearValue();
        }
        break;

      default:
        if (!local.hasSearch && e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          typeahead += e.key.toLowerCase();
          clearTimeout(typeaheadTimeout);
          typeaheadTimeout = setTimeout(() => {
            typeahead = '';
          }, TYPEAHEAD_RESET_MS);
          const buffer = typeahead;
          const matchIndex = navItems().findIndex(
            (item) => !item.disabled && (item.label ?? item.value).toLowerCase().startsWith(buffer),
          );
          if (matchIndex >= 0) {
            if (!isOpen()) open();
            setHighlightedIndex(matchIndex);
          }
        }
        break;
    }
  };

  const handleSearchKeyDown = (e) => {
    // Arrow keys navigate options; Enter selects; Tab closes (Escape is left
    // to bubble to the shared overlay stack — see the EscapeLayer below).
    // Home/End are left to the input for caret movement.
    if (['ArrowDown', 'ArrowUp', 'Enter', 'Tab'].includes(e.key)) {
      handleKeyDown(e);
    }
  };

  const handleSearchInput = (e) => {
    setSearchQuery(e.target.value);
    // Filtering re-indexes the list; drop the stale highlight.
    setHighlightedIndex(-1);
  };

  // ── render model: options + dividers + sections with flat nav indices ──
  const renderModel = createMemo(() => {
    // Active search renders the filtered matches flat (no sections/dividers).
    if (local.hasSearch && searchQuery()) {
      return filteredItems().map((item, index) => ({ kind: 'item', item, index }));
    }
    const out = [];
    let flat = 0;
    for (const option of local.options ?? []) {
      if (isDivider(option)) {
        out.push({ kind: 'divider' });
      } else if (isSection(option)) {
        out.push({
          kind: 'section',
          title: option.title,
          items: sectionItemsOf(option).map((o) => ({ item: normalizeOption(o), index: flat++ })),
        });
      } else {
        out.push({ kind: 'item', item: normalizeOption(option), index: flat++ });
      }
    }
    return out;
  });

  const optionRow = (entry) => {
    const isSelected = () => entry.item.value === local.value && local.value != null;
    const isHighlighted = () => entry.index === highlightedIndex();
    return (
      <div
        id={getItemId(entry.index)}
        role="option"
        aria-selected={isSelected() ? 'true' : 'false'}
        aria-disabled={entry.item.disabled ? 'true' : undefined}
        onClick={() => selectItem(entry.item)}
        onMouseEnter={() => !entry.item.disabled && setHighlightedIndex(entry.index)}
        class={cx(
          ITEM_BASE,
          ITEM_SIZE_CLASSES[size()],
          isHighlighted() && 'bg-overlay-hover',
          isSelected() && 'font-medium',
          entry.item.disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span class="flex min-w-0 flex-1 items-center gap-2">
          {local.renderOption ? (
            local.renderOption(entry.item)
          ) : (
            <SelectorOption icon={entry.item.icon} label={entry.item.label ?? entry.item.value} />
          )}
        </span>
        <Show when={isSelected()}>
          <CheckIcon />
        </Show>
      </div>
    );
  };

  // ── field chrome ──
  const labelNode = () => (
    <label
      id={labelId}
      for={triggerId}
      class={cx(
        LABEL_BASE,
        local.isDisabled ? 'text-disabled cursor-not-allowed' : 'text-secondary cursor-pointer',
        local.isLabelHidden && 'sr-only',
      )}
    >
      {local.label}
      <Show when={indicator()}>
        <span class={INDICATOR_CLASSES}>
          <span aria-hidden="true"> ∙ </span>
          {indicator()}
        </span>
      </Show>
      <Show when={local.labelTooltip}>
        <span class="inline-flex text-secondary" title={local.labelTooltip} aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5" />
            <path d="M8 7.5V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
            <circle cx="8" cy="5" r="0.9" fill="currentColor" />
          </svg>
        </span>
      </Show>
    </label>
  );

  const descriptionNode = () => (
    <Show when={local.description}>
      <span id={descriptionId} class={cx(DESCRIPTION_CLASSES, local.isLabelHidden && 'sr-only')}>
        {local.description}
      </span>
    </Show>
  );

  const triggerWrapper = () => (
    <div
      class={cx(
        WRAPPER_BASE,
        SIZE_CLASSES[size()],
        local.isDisabled && WRAPPER_DISABLED,
        !selectedItem() && 'text-secondary',
        local.class,
      )}
      style={local.status ? statusWrapperVars(local.status.type) : undefined}
      data-size={size()}
      data-status={local.status?.type}
      title={showsDisabledMessage() ? local.disabledMessage : undefined}
      onClick={handleTriggerClick}
    >
      <Show when={local.startIcon}>
        <span class="inline-flex shrink-0 items-center justify-center text-secondary">
          {local.startIcon}
        </span>
      </Show>
      <button
        {...rest}
        ref={(el) => {
          triggerEl = el;
          if (typeof local.ref === 'function') local.ref(el);
        }}
        id={triggerId}
        type="button"
        // In hasSearch mode the popup's search input is the combobox (it owns
        // focus + aria-activedescendant); the trigger is then a plain button.
        role={local.hasSearch ? undefined : 'combobox'}
        aria-haspopup="listbox"
        aria-expanded={isOpen() ? 'true' : 'false'}
        aria-controls={listboxId}
        aria-activedescendant={
          !local.hasSearch && isOpen() && highlightedIndex() >= 0
            ? getItemId(highlightedIndex())
            : undefined
        }
        aria-labelledby={labelId}
        aria-describedby={ariaDescribedBy()}
        aria-required={local.isRequired && !local.isOptional ? 'true' : undefined}
        aria-invalid={local.status?.type === 'error' ? 'true' : undefined}
        aria-busy={isBusy() || undefined}
        // With a disabledMessage the trigger keeps focusability via
        // aria-disabled so the reason is focus-discoverable; activation is
        // still blocked by the isDisabled guards.
        disabled={local.isDisabled && !showsDisabledMessage()}
        aria-disabled={showsDisabledMessage() ? 'true' : undefined}
        onKeyDown={handleKeyDown}
        class={TRIGGER_BUTTON_CLASSES}
      >
        <span class="min-w-0 flex-1 truncate text-left">
          {selectedItem()?.label ?? local.placeholder}
        </span>
      </button>
      <Show when={isBusy()}>
        <InlineSpinner />
      </Show>
      <Show when={local.hasClear && local.value != null && !local.isDisabled}>
        <button
          type="button"
          onClick={handleClear}
          aria-label={`Clear ${local.label}`}
          class={cx(
            'flex items-center justify-center shrink-0 p-0 m-0 border-0 bg-transparent',
            'cursor-pointer rounded-md text-secondary',
            'outline-none focus-visible:outline-2 focus-visible:outline-offset-2',
            'focus-visible:outline-(--color-accent)',
          )}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="m4 4 8 8m0-8-8 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" />
          </svg>
        </button>
      </Show>
      <Show when={local.status} fallback={<ChevronIcon open={isOpen()} />}>
        <StatusIcon type={local.status.type} />
      </Show>
    </div>
  );

  const dropdown = () => (
    <Show when={isOpen()}>
      {/* Joins the shared overlay stack for as long as the dropdown is
          open, so Escape ordering is correct even when this Selector is
          nested inside a Dialog (or another overlay) opened earlier. */}
      <EscapeLayer onEscape={() => close({ refocus: true })} />
      <div class={cx(DROPDOWN_BASE, DROPDOWN_PLACEMENT[local.placement] ?? DROPDOWN_PLACEMENT.below)}>
        <Show when={local.hasSearch}>
          <div class="px-2 py-1">
            <input
              ref={searchEl}
              type="text"
              // The search input owns focus while open, so it must be the
              // combobox reporting the highlight via aria-activedescendant.
              role="combobox"
              aria-expanded={isOpen() ? 'true' : 'false'}
              aria-controls={listboxId}
              aria-autocomplete="list"
              aria-activedescendant={
                isOpen() && highlightedIndex() >= 0 ? getItemId(highlightedIndex()) : undefined
              }
              aria-label="Search options"
              value={searchQuery()}
              onInput={handleSearchInput}
              onKeyDown={handleSearchKeyDown}
              placeholder={local.searchPlaceholder}
              class={cx(
                'box-border w-full py-1 px-2 rounded-md bg-surface',
                'border-(length:--border-width) border-solid border-border-strong',
                'font-sans text-base leading-[var(--text-label-leading)]',
                'text-primary placeholder:text-secondary',
                'outline-none focus:outline-(length:--border-width) focus:outline-solid',
                'focus:outline-(--color-accent) focus:outline-offset-0',
              )}
            />
          </div>
        </Show>
        <div id={listboxId} role="listbox" aria-labelledby={labelId} class={LISTBOX_CLASSES}>
          <Show
            when={!(local.hasSearch && searchQuery() && filteredItems().length === 0)}
            fallback={
              <div class="p-3 text-center font-sans text-base text-secondary">No results found</div>
            }
          >
            <For each={renderModel()}>
              {(entry) => (
                <Switch>
                  <Match when={entry.kind === 'divider'}>
                    <hr class="my-1 border-0 border-t-(length:--border-width) border-solid border-border" />
                  </Match>
                  <Match when={entry.kind === 'section'}>
                    <Show when={entry.title}>
                      <div
                        aria-hidden="true"
                        class="my-1 flex items-center gap-2 px-2 font-sans text-sm font-medium text-secondary"
                      >
                        {entry.title}
                      </div>
                    </Show>
                    <div role="group" aria-label={entry.title}>
                      <For each={entry.items}>{(sectionEntry) => optionRow(sectionEntry)}</For>
                    </div>
                  </Match>
                  <Match when={entry.kind === 'item'}>{optionRow(entry)}</Match>
                </Switch>
              )}
            </For>
          </Show>
        </div>
      </div>
    </Show>
  );

  const statusMessageNode = () => (
    <Show when={local.status?.message}>
      <div
        id={statusMessageId}
        role={local.status.type === 'error' ? 'alert' : 'status'}
        class={cx(STATUS_MESSAGE_BASE, STATUS_MESSAGE_COLORS[local.status.type])}
      >
        {local.status.message}
      </div>
    </Show>
  );

  const disabledMessageNode = () => (
    <Show when={showsDisabledMessage()}>
      <span id={disabledMessageId} class="sr-only">
        {local.disabledMessage}
      </span>
    </Show>
  );

  const controlNode = () => (
    <div ref={rootEl} class="relative flex flex-col isolate">
      {triggerWrapper()}
      {dropdown()}
      {statusMessageNode()}
    </div>
  );

  // ── horizontal-labels: render as grid cells (label col / control col) ──
  return (
    <Show
      when={!isHorizontalLabels()}
      fallback={
        <div class="contents">
          <div class="pt-[calc(var(--border-width)+var(--spacing-1))]">{labelNode()}</div>
          <div class="flex flex-col">
            {descriptionNode()}
            {controlNode()}
            {disabledMessageNode()}
          </div>
        </div>
      }
    >
      <div
        class={cx('flex flex-col', !local.isLabelHidden && 'gap-1')}
        style={
          local.width != null
            ? { width: typeof local.width === 'number' ? `${local.width}px` : local.width }
            : undefined
        }
      >
        {labelNode()}
        {descriptionNode()}
        {controlNode()}
        {disabledMessageNode()}
      </div>
    </Show>
  );
}
