// Kit List + ListItem — SolidJS re-implementation of Astryx List/ListItem.
// Spec: `npx astryx component List` / `npx astryx component ListItem`
// (density, dividers, markers, header, start/end slots, invisible
// button/anchor interactive pattern) plus keyboard navigation following
// the Astryx useListFocus hook semantics (`npx astryx hook useListFocus`):
// vertical arrow keys, Home/End, wrap-around, Escape, opt-in roving tabindex.
// All styling values are Astryx tokens via the Tailwind bridge
// (@astryxdesign/core/src/tailwind-theme.css) or var(--*) custom properties.
import {
  createContext,
  createUniqueId,
  mergeProps,
  onMount,
  splitProps,
  useContext,
  Show,
} from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cx } from './cx';

// Context mirrors Astryx ListContext: List feeds density/dividers/marker
// style down to its ListItems.
const ListContext = createContext();

// Selector attribute stamped on each item's focusable control (invisible
// button/anchor) so the List container can drive keyboard navigation.
const CONTROL_ATTR = 'data-astryx-list-item-control';

// ---------------------------------------------------------------------------
// List
// ---------------------------------------------------------------------------

const LIST_BASE_CLASSES = 'astryx-list m-0 ps-0 list-none flex flex-col';

/**
 * List — a vertical collection of ListItems with consistent spacing,
 * dividers, optional markers, and keyboard navigation.
 *
 * Props (per the Astryx List spec, adapted to Solid):
 * @param {import('solid-js').JSX.Element} children - ListItem components.
 * @param {'compact'|'balanced'|'spacious'} [density='balanced'] - Row spacing density.
 * @param {boolean} [hasDividers=false] - Show dividers between items (removes the item gap).
 * @param {import('solid-js').JSX.Element} [header] - Header content rendered above the
 *   list and associated with it via aria-labelledby.
 * @param {'none'|'disc'|'decimal'|'circle'} [listStyle='none'] - Marker style;
 *   'decimal' renders an <ol> instead of <ul>.
 * @param {number} [start=1] - Starting number for ordered lists (listStyle='decimal').
 *
 * Keyboard navigation (useListFocus semantics, vertical orientation):
 * ArrowUp/ArrowDown move focus between enabled interactive items,
 * Home/End jump to boundaries, Escape calls `onEscape`.
 * @param {boolean} [wrap=true] - Arrow navigation wraps around at the ends.
 * @param {boolean} [hasHomeEnd=true] - Home/End jump to the first/last enabled item.
 * @param {boolean} [hasRovingTabIndex=false] - Own a single tab stop: one item control
 *   keeps tabindex="0", the rest get "-1"; arrow navigation moves the stop.
 * @param {() => void} [onEscape] - Called when Escape is pressed inside the list.
 * @param {string} [class] - Extra classes merged onto the <ul>/<ol>.
 * Remaining props are spread onto the <ul>/<ol>.
 */
export function List(props) {
  const merged = mergeProps(
    {
      density: 'balanced',
      hasDividers: false,
      listStyle: 'none',
      wrap: true,
      hasHomeEnd: true,
      hasRovingTabIndex: false,
    },
    props,
  );
  const [local, rest] = splitProps(merged, [
    'children',
    'density',
    'hasDividers',
    'header',
    'listStyle',
    'start',
    'wrap',
    'hasHomeEnd',
    'hasRovingTabIndex',
    'onEscape',
    'class',
  ]);

  const headerId = createUniqueId();
  const isOrdered = () => local.listStyle === 'decimal';
  const hasMarkers = () => local.listStyle !== 'none';

  let listEl;

  // All item controls in DOM order; `enabledOnly` skips disabled items
  // (native `disabled` on the invisible button, aria-disabled on anchors).
  const getControls = (enabledOnly) => {
    if (!listEl) return [];
    const all = Array.from(listEl.querySelectorAll(`[${CONTROL_ATTR}]`));
    if (!enabledOnly) return all;
    return all.filter(
      (el) => !el.disabled && el.getAttribute('aria-disabled') !== 'true',
    );
  };

  // Roving tabindex (useListFocus hasRovingTabIndex semantics): a single tab
  // stop among the item controls; disabled controls are always tabindex="-1".
  const stampRoving = (active) => {
    if (!local.hasRovingTabIndex) return;
    const enabled = getControls(true);
    const stop = active && enabled.includes(active) ? active : enabled[0];
    for (const el of getControls(false)) {
      el.setAttribute('tabindex', el === stop ? '0' : '-1');
    }
  };

  onMount(() => stampRoving());

  // Capture any caller-supplied onKeyDown/onFocusIn from `rest` before the
  // Dynamic spread below would otherwise let our own handlers win (props
  // after a spread override spread props of the same name in JSX/Solid).
  const callerOnKeyDown = rest.onKeyDown;
  const callerOnFocusIn = rest.onFocusIn;

  const handleFocusIn = (e) => {
    // Caller handler runs first, mirroring normal event-handler composition;
    // internal roving-tabindex bookkeeping always follows.
    if (typeof callerOnFocusIn === 'function') callerOnFocusIn(e);
    if (e.target instanceof Element && e.target.hasAttribute(CONTROL_ATTR)) {
      stampRoving(e.target);
    }
  };

  const handleKeyDown = (e) => {
    // Caller handler runs first so it can call e.preventDefault() to opt out
    // of the internal keyboard navigation below (which already respects
    // e.defaultPrevented).
    if (typeof callerOnKeyDown === 'function') callerOnKeyDown(e);
    if (e.defaultPrevented) return;
    if (e.key === 'Escape') {
      if (typeof local.onEscape === 'function') {
        e.preventDefault();
        local.onEscape();
      }
      return;
    }
    const items = getControls(true);
    if (items.length === 0) return;
    const current = items.indexOf(document.activeElement);
    let next;
    if (e.key === 'ArrowDown') {
      next = current === -1 ? 0 : current + 1;
    } else if (e.key === 'ArrowUp') {
      next = current === -1 ? items.length - 1 : current - 1;
    } else if (e.key === 'Home' && local.hasHomeEnd) {
      next = 0;
    } else if (e.key === 'End' && local.hasHomeEnd) {
      next = items.length - 1;
    } else {
      return;
    }
    if (next < 0 || next >= items.length) {
      next = local.wrap
        ? (next + items.length) % items.length
        : Math.min(Math.max(next, 0), items.length - 1);
    }
    e.preventDefault();
    items[next].focus();
    stampRoving(items[next]);
  };

  const contextValue = {
    get density() {
      return local.density;
    },
    get hasDividers() {
      return local.hasDividers;
    },
    get listStyle() {
      return local.listStyle;
    },
  };

  const listElement = (
    <Dynamic
      component={isOrdered() ? 'ol' : 'ul'}
      {...rest}
      ref={(el) => {
        listEl = el;
      }}
      // ul + list-style:none loses its implicit list role in some engines;
      // restore it explicitly (mirrors the Astryx source).
      role={local.listStyle === 'none' ? 'list' : undefined}
      aria-labelledby={local.header != null ? headerId : undefined}
      start={isOrdered() && local.start != null && local.start !== 1 ? local.start : undefined}
      class={cx(
        LIST_BASE_CLASSES,
        // gap: --spacing-0-5 (2px) between items; none with dividers
        local.hasDividers ? 'gap-0' : 'gap-0.5',
        local.class,
      )}
      style={
        hasMarkers()
          ? { 'counter-reset': `astryx-list ${(local.start ?? 1) - 1}` }
          : undefined
      }
      data-density={local.density}
      data-list-style={local.listStyle}
      onKeyDown={handleKeyDown}
      onFocusIn={handleFocusIn}
    >
      {local.children}
    </Dynamic>
  );

  return (
    <ListContext.Provider value={contextValue}>
      <Show when={local.header != null} fallback={listElement}>
        <div class="flex flex-col">
          <div id={headerId} class="mb-2">
            {local.header}
          </div>
          {listElement}
        </div>
      </Show>
    </ListContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// ListItem
// ---------------------------------------------------------------------------

const ITEM_BASE_CLASSES = cx(
  'astryx-list-item relative box-border flex items-center text-start',
  // gap/inline padding: --spacing-2; radius: --radius-element
  'gap-2 rounded-md',
);

// Block padding per density (spec: compact 4px, balanced 8px, spacious 12px
// block + 12px inline; compact/balanced use 8px inline padding).
const DENSITY_CLASSES = {
  compact: 'py-1 px-2',
  balanced: 'py-2 px-2',
  spacious: 'py-3 px-3',
};

const INTERACTIVE_CLASSES = cx(
  'cursor-pointer transition-colors',
  'duration-[var(--duration-fast-min)] ease-[var(--ease-standard)] motion-reduce:transition-none',
  // hover/pressed tint via the overlay tokens
  'hover:bg-overlay-hover active:bg-overlay-pressed',
  // Focus ring on the row when the invisible control inside has focus-visible
  // (same has-[:focus-visible] pattern as Token's clickable container).
  'outline-none has-[:focus-visible]:outline-2',
  'has-[:focus-visible]:outline-(--color-accent) has-[:focus-visible]:outline-offset-2',
);

// Invisible button/anchor pattern: the control fills the label/description
// column and inherits every visual from the row.
const INVISIBLE_CONTROL_CLASSES = cx(
  'appearance-none m-0 p-0 border-0 bg-transparent no-underline',
  '[font:inherit] text-inherit [cursor:inherit] text-start outline-none',
  'flex flex-col flex-1 min-w-0',
);

const CONTENT_CLASSES = 'flex flex-col flex-1 min-w-0 text-start';

const LABEL_CLASSES =
  'text-primary text-[length:var(--text-body-size)] leading-[var(--text-body-leading)]';
const DESCRIPTION_CLASSES =
  'text-secondary text-[length:var(--text-supporting-size)] leading-[var(--text-supporting-leading)]';
const SINGLE_TRUNCATE_CLASSES = 'overflow-hidden text-ellipsis whitespace-nowrap';

// Custom-rendered markers (spec: 6px dot/circle geometry, CSS counter numbers).
const MARKER_CONTAINER_CLASSES = cx(
  'self-baseline box-border flex items-center justify-center shrink-0 w-4',
  'mt-[calc((1em*var(--text-body-leading)-6px)/2)]',
);
const MARKER_DOT_CLASSES = 'size-[6px] rounded-full bg-primary';
const MARKER_CIRCLE_CLASSES =
  'size-[6px] rounded-full border border-solid border-primary bg-transparent';
const MARKER_NUMBER_CLASSES = cx(
  'self-baseline shrink-0 w-4 text-primary',
  'text-[length:var(--text-body-size)] leading-[var(--text-body-leading)]',
  "before:[content:counter(astryx-list)_'.']",
);

/**
 * ListItem — an item within List: leading slot, primary/secondary text,
 * trailing slot, with optional invisible-button/anchor interactivity.
 *
 * Props (per the Astryx ListItem spec, adapted to Solid):
 * @param {import('solid-js').JSX.Element|string} label - Primary text (required).
 *   Plain strings get single-line truncation automatically.
 * @param {import('solid-js').JSX.Element|string} [description] - Secondary content
 *   below the label; plain strings get single-line truncation automatically.
 * @param {import('solid-js').JSX.Element} [startContent] - Leading slot
 *   (icon, avatar, checkbox).
 * @param {import('solid-js').JSX.Element} [endContent] - Trailing slot
 *   (badge, meta, menu, chevron).
 * @param {(e: MouseEvent) => void} [onClick] - Click handler; enables the
 *   invisible button pattern.
 * @param {string} [href] - Link URL; enables the invisible anchor pattern.
 * @param {string} [target] - Link target; '_blank' automatically merges
 *   noopener noreferrer into rel.
 * @param {string} [rel] - Link relationship tokens.
 * @param {boolean} [isDisabled=false] - Disabled state; sets aria-disabled.
 * @param {boolean} [isSelected=false] - Selected state; sets aria-selected.
 * @param {string} [class] - Extra classes merged onto the <li>.
 * Remaining props are spread onto the <li>.
 */
export function ListItem(props) {
  const merged = mergeProps({ isDisabled: false, isSelected: false }, props);
  const [local, rest] = splitProps(merged, [
    'label',
    'description',
    'startContent',
    'endContent',
    'onClick',
    'href',
    'target',
    'rel',
    'isDisabled',
    'isSelected',
    'class',
  ]);

  const ctx = useContext(ListContext);
  const density = () => ctx?.density ?? 'balanced';
  const hasDividers = () => ctx?.hasDividers ?? false;
  const listStyle = () => ctx?.listStyle ?? 'none';
  const hasMarkers = () => listStyle() !== 'none';

  const isInteractive = () => local.onClick != null || local.href != null;

  // target="_blank" always carries noopener noreferrer (merged with any
  // caller-provided rel tokens, deduped).
  const computedRel = () => {
    if (local.target !== '_blank') return local.rel || undefined;
    const tokens = new Set((local.rel ?? '').split(/\s+/).filter(Boolean));
    tokens.add('noopener');
    tokens.add('noreferrer');
    return Array.from(tokens).join(' ');
  };

  // Clicking the row (outside any nested interactive element) activates the
  // item, matching the Astryx container-click behavior.
  const handleContainerClick = (e) => {
    if (local.isDisabled) return;
    if (e.target instanceof Element && e.target.closest('button, a, input, select, textarea')) {
      return;
    }
    if (typeof local.onClick === 'function') local.onClick(e);
  };

  const labelAndDescription = (
    <>
      <span
        class={cx(LABEL_CLASSES, typeof local.label === 'string' && SINGLE_TRUNCATE_CLASSES)}
      >
        {local.label}
      </span>
      <Show when={local.description != null}>
        <span
          class={cx(
            DESCRIPTION_CLASSES,
            typeof local.description === 'string' && SINGLE_TRUNCATE_CLASSES,
          )}
        >
          {local.description}
        </span>
      </Show>
    </>
  );

  return (
    <li
      {...rest}
      class={cx(
        ITEM_BASE_CLASSES,
        DENSITY_CLASSES[density()],
        isInteractive() && INTERACTIVE_CLASSES,
        local.isSelected && 'bg-accent-muted',
        local.isDisabled && 'cursor-not-allowed pointer-events-none',
        hasMarkers() && '[counter-increment:astryx-list]',
        hasDividers() &&
          'rounded-none [border-block-end:var(--border-width)_solid_var(--color-border)] last:[border-block-end:none]',
        local.class,
      )}
      aria-selected={local.isSelected || undefined}
      aria-disabled={local.isDisabled || undefined}
      onClick={isInteractive() ? handleContainerClick : undefined}
    >
      {/* Marker (disc / circle / decimal counter) */}
      <Show when={listStyle() === 'disc' || listStyle() === 'circle'}>
        <span class={MARKER_CONTAINER_CLASSES} aria-hidden="true">
          <span class={listStyle() === 'disc' ? MARKER_DOT_CLASSES : MARKER_CIRCLE_CLASSES} />
        </span>
      </Show>
      <Show when={listStyle() === 'decimal'}>
        <span class={MARKER_NUMBER_CLASSES} aria-hidden="true" />
      </Show>

      <Show when={local.startContent != null}>
        <span class={cx('flex shrink-0', local.isDisabled && 'opacity-50')}>
          {local.startContent}
        </span>
      </Show>

      <Show
        when={local.href != null}
        fallback={
          <Show
            when={local.onClick != null}
            fallback={
              <span class={cx(CONTENT_CLASSES, local.isDisabled && 'opacity-50')}>
                {labelAndDescription}
              </span>
            }
          >
            <button
              type="button"
              {...{ [CONTROL_ATTR]: '' }}
              class={cx(INVISIBLE_CONTROL_CLASSES, local.isDisabled && 'opacity-50')}
              disabled={local.isDisabled}
              onClick={(e) => local.onClick(e)}
            >
              {labelAndDescription}
            </button>
          </Show>
        }
      >
        <a
          href={local.href}
          target={local.target}
          rel={computedRel()}
          {...{ [CONTROL_ATTR]: '' }}
          class={cx(INVISIBLE_CONTROL_CLASSES, local.isDisabled && 'opacity-50')}
          aria-disabled={local.isDisabled || undefined}
          tabindex={local.isDisabled ? -1 : undefined}
        >
          {labelAndDescription}
        </a>
      </Show>

      <Show when={local.endContent != null}>
        <span class={cx('flex shrink-0 ms-auto', local.isDisabled && 'opacity-50')}>
          {local.endContent}
        </span>
      </Show>
    </li>
  );
}
