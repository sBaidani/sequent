// Kit SegmentedControl — SolidJS re-implementation of Astryx SegmentedControl.
// Spec: `npx astryx component SegmentedControl` / `SegmentedControlItem`;
// React source studied via `npx astryx swizzle SegmentedControl`
// (scratch/swizzle-segmentedcontrol).
//
// Semantics: role=radiogroup container, role=radio items with aria-checked,
// roving tabindex (single tab stop, repaired when the selected item is
// missing/disabled), Arrow/Home/End navigation with wrap-around, and
// selection-follows-focus per the APG radio-group pattern (matching the
// React source's container focus handler).
//
// Visuals: the selected segment is indicated by an animated "thumb" — an
// aria-hidden surface layer measured from the selected radio and moved ONLY
// via `transform` (transition-property: transform; width/height snap). All
// colors/radii/spacing/durations are Astryx tokens via the Tailwind bridge
// or var(--*) custom properties; the fixed 4px height inset and icon sizes
// are the spec's own geometry.
import {
  createContext,
  useContext,
  createSignal,
  createMemo,
  createEffect,
  createUniqueId,
  onMount,
  onCleanup,
  mergeProps,
  splitProps,
  Show,
} from 'solid-js';
import { cx } from './cx';

const SegmentedControlContext = createContext();

// Segment/thumb radius is concentric with the container radius minus its
// 2px (--spacing-0-5) padding, exactly as the Astryx source computes it.
const CONCENTRIC_RADIUS = 'rounded-[max(0px,calc(var(--radius-element)-var(--spacing-0-5)))]';

// Item height is the size-element token minus the container's 2x2px padding
// (fixed geometry from the Astryx source).
const ITEM_SIZE_CLASSES = {
  sm: 'h-[calc(var(--size-element-sm)-4px)] px-2 [font-size:var(--text-supporting-size)]',
  md: 'h-[calc(var(--size-element-md)-4px)] px-3 [font-size:var(--text-label-size)]',
  lg: 'h-[calc(var(--size-element-lg)-4px)] px-3 [font-size:var(--text-label-size)]',
};

// Fixed icon geometry per the Astryx source (14/16/18px on the 4px scale).
const ICON_SIZE_CLASSES = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-4.5',
};

/**
 * SegmentedControl — a segmented button group for a single selection from a
 * small set of mutually exclusive options (radio-group semantics). Controls
 * a value or mode, not page navigation.
 *
 * Props (per the Astryx spec, adapted to Solid):
 * @param {string} value - The currently selected value (controlled; required).
 * @param {(value: string) => void} onChange - Fired when a segment is selected (required).
 * @param {string} label - Accessible label for the radio group (aria-label,
 *   never rendered visually; required).
 * @param {'sm'|'md'|'lg'} [size='md'] - Size variant.
 * @param {'hug'|'fill'} [layout='hug'] - 'hug' sizes segments to content;
 *   'fill' stretches them equally to fill the container.
 * @param {boolean} [isDisabled=false] - Disables the entire control.
 * @param {string} [disabledMessage] - With isDisabled, keeps the selected
 *   segment focusable (aria-disabled) and exposes the reason via
 *   aria-describedby. Selection stays blocked.
 * @param {import('solid-js').JSX.Element} children - SegmentedControlItem children.
 * @param {string} [class] - Extra classes merged onto the radiogroup element.
 */
export function SegmentedControl(props) {
  const merged = mergeProps({ size: 'md', layout: 'hug', isDisabled: false }, props);
  const [local, rest] = splitProps(merged, [
    'value',
    'onChange',
    'label',
    'size',
    'layout',
    'isDisabled',
    'disabledMessage',
    'children',
    'class',
  ]);

  let groupEl;
  const disabledMessageId = createUniqueId();
  const showsDisabledMessage = () => local.isDisabled && !!local.disabledMessage;

  // ---------------------------------------------------------------------
  // Item registry (creation order == DOM order) for roving-tabindex repair:
  // the tab stop is the selected enabled item, else the first enabled item.
  // ---------------------------------------------------------------------
  const [registry, setRegistry] = createSignal([]);
  const register = (item) => {
    setRegistry((list) => [...list, item]);
    // Runs in the registering item's owner, so unmounting the item
    // deregisters it and the tab stop is repaired reactively.
    onCleanup(() => setRegistry((list) => list.filter((i) => i !== item)));
  };
  const tabStopValue = createMemo(() => {
    const list = registry();
    const selected = list.find((i) => i.value() === local.value && !i.isDisabled());
    if (selected) return local.value;
    const firstEnabled = list.find((i) => !i.isDisabled());
    return firstEnabled ? firstEnabled.value() : undefined;
  });

  // ---------------------------------------------------------------------
  // Keyboard navigation: Arrow keys move with wrap-around, Home/End jump,
  // disabled radios are skipped. Selection follows focus (focusin handler).
  // ---------------------------------------------------------------------
  const enabledRadios = () =>
    Array.from(groupEl?.querySelectorAll('[role="radio"]') ?? []).filter(
      (el) => el.getAttribute('aria-disabled') !== 'true',
    );

  const ARROW_DELTAS = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

  const handleKeyDown = (e) => {
    const radios = enabledRadios();
    if (radios.length === 0) return;
    let next;
    if (e.key in ARROW_DELTAS) {
      const current = e.target.closest?.('[role="radio"]');
      const idx = radios.indexOf(current);
      next = radios[(Math.max(idx, 0) + ARROW_DELTAS[e.key] + radios.length) % radios.length];
    } else if (e.key === 'Home') {
      next = radios[0];
    } else if (e.key === 'End') {
      next = radios[radios.length - 1];
    } else {
      return;
    }
    e.preventDefault();
    next.focus();
  };

  // Selection follows focus (APG radiogroup): whenever focus lands on an
  // enabled radio whose value differs from the current one, select it. The
  // already-selected value is skipped so Tab-in / re-click is a no-op.
  const handleFocusIn = (e) => {
    if (local.isDisabled) return;
    const radio = e.target.closest?.('[role="radio"][data-value]');
    if (!radio || radio.getAttribute('aria-disabled') === 'true') return;
    const next = radio.dataset.value;
    if (next != null && next !== local.value) local.onChange?.(next);
  };

  // ---------------------------------------------------------------------
  // Animated thumb: measured from the selected radio; first measurement
  // mounts the thumb already in place (no slide-in), later value changes
  // animate via the transform transition only.
  // ---------------------------------------------------------------------
  const [thumb, setThumb] = createSignal(null);
  const measureThumb = () => {
    if (!groupEl) return;
    const selected = Array.from(groupEl.querySelectorAll('[role="radio"]')).find(
      (el) => el.dataset.value === local.value,
    );
    if (!selected) {
      setThumb(null);
      return;
    }
    setThumb({
      width: `${selected.offsetWidth}px`,
      height: `${selected.offsetHeight}px`,
      transform: `translate(${selected.offsetLeft}px, ${selected.offsetTop}px)`,
    });
  };
  // Re-measure after the DOM settles whenever selection, items, size or
  // layout change (createEffect runs post-render).
  createEffect(() => {
    void local.value;
    void local.size;
    void local.layout;
    void registry().length;
    measureThumb();
  });
  onMount(() => {
    if (typeof ResizeObserver === 'function') {
      const ro = new ResizeObserver(() => measureThumb());
      ro.observe(groupEl);
      onCleanup(() => ro.disconnect());
    }
  });

  const contextValue = {
    value: () => local.value,
    onChange: (v) => local.onChange?.(v),
    size: () => local.size,
    layout: () => local.layout,
    isDisabled: () => local.isDisabled,
    hasDisabledMessage: () => showsDisabledMessage(),
    tabStopValue,
    register,
  };

  return (
    <SegmentedControlContext.Provider value={contextValue}>
      <div
        {...rest}
        ref={groupEl}
        role="radiogroup"
        aria-label={local.label}
        aria-disabled={local.isDisabled ? 'true' : undefined}
        aria-describedby={showsDisabledMessage() ? disabledMessageId : undefined}
        data-size={local.size}
        data-layout={local.layout !== 'hug' ? local.layout : undefined}
        onKeyDown={handleKeyDown}
        onFocusIn={handleFocusIn}
        class={cx(
          'astryx-segmented-control relative items-center gap-0.5 p-0.5 box-border bg-neutral rounded-md',
          local.layout === 'fill' ? 'flex w-full' : 'inline-flex',
          local.isDisabled && 'opacity-50',
          // Without a disabledMessage the control is fully inert; with one,
          // pointer events stay on so the group remains perceivable (the
          // radios stay focusable via aria-disabled). Selection is blocked
          // by the isDisabled guards either way.
          local.isDisabled && !showsDisabledMessage() && 'pointer-events-none',
          local.class,
        )}
      >
        <Show when={thumb()}>
          <span
            aria-hidden="true"
            class={cx(
              'astryx-segmented-control-thumb absolute left-0 top-0 pointer-events-none',
              'bg-surface shadow-sm',
              CONCENTRIC_RADIUS,
              'transition-transform duration-[var(--duration-fast)] ease-out',
              'motion-reduce:transition-none',
            )}
            style={thumb()}
          />
        </Show>
        {local.children}
      </div>
      <Show when={showsDisabledMessage()}>
        {/* Tooltip rendering is out of scope for this kit slice; the reason
            is still exposed to AT through aria-describedby. */}
        <span id={disabledMessageId} class="sr-only">
          {local.disabledMessage}
        </span>
      </Show>
    </SegmentedControlContext.Provider>
  );
}

/**
 * SegmentedControlItem — an individual segment rendered as a radio button
 * inside a SegmentedControl.
 *
 * @param {string} value - Unique value for this segment, matched against the
 *   parent value (required).
 * @param {string} label - Accessible label; visible text unless isLabelHidden
 *   (required).
 * @param {boolean} [isLabelHidden=false] - Visually hide the label; it is
 *   used as aria-label so only the icon shows.
 * @param {import('solid-js').JSX.Element} [icon] - Icon displayed before the label.
 * @param {boolean} [isDisabled=false] - Disables this individual item.
 */
export function SegmentedControlItem(props) {
  const merged = mergeProps({ isLabelHidden: false, isDisabled: false }, props);
  const [local, rest] = splitProps(merged, [
    'value',
    'label',
    'isLabelHidden',
    'icon',
    'isDisabled',
    'class',
  ]);

  const ctx = useContext(SegmentedControlContext);
  if (!ctx) {
    throw new Error('SegmentedControlItem must be rendered inside a SegmentedControl');
  }
  ctx.register({ value: () => local.value, isDisabled: () => local.isDisabled });

  const isSelected = () => ctx.value() === local.value;
  const isItemDisabled = () => local.isDisabled || ctx.isDisabled();
  // When the whole group is disabled with a disabledMessage, the selected
  // segment stays focusable so the reason is keyboard-discoverable.
  // Per-item disabling always drops out of the tab order.
  const tabIndex = () => {
    if (local.isDisabled) return -1;
    if (ctx.isDisabled()) return isSelected() && ctx.hasDisabledMessage() ? 0 : -1;
    return ctx.tabStopValue() === local.value ? 0 : -1;
  };

  const handleClick = () => {
    if (!isItemDisabled() && !isSelected()) ctx.onChange(local.value);
  };

  return (
    <button
      {...rest}
      type="button"
      role="radio"
      aria-checked={isSelected() ? 'true' : 'false'}
      aria-disabled={isItemDisabled() ? 'true' : undefined}
      aria-label={local.isLabelHidden ? local.label : undefined}
      data-value={local.value}
      data-size={ctx.size()}
      data-selected={isSelected() ? '' : undefined}
      data-disabled={isItemDisabled() ? '' : undefined}
      tabIndex={tabIndex()}
      onClick={handleClick}
      class={cx(
        // The thumb (earlier positioned sibling) paints beneath; items stay
        // transparent so the thumb provides the selected background.
        'astryx-segmented-control-item relative box-border inline-flex items-center justify-center gap-1',
        'border-0 bg-transparent [line-height:var(--text-label-leading)]',
        CONCENTRIC_RADIUS,
        ITEM_SIZE_CLASSES[ctx.size()],
        'transition-colors duration-[var(--duration-fast)] ease-out motion-reduce:transition-none',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-(--color-accent)',
        ctx.layout() === 'fill' && 'flex-1',
        isSelected() ? 'font-semibold' : 'font-medium',
        isItemDisabled()
          ? 'text-disabled cursor-default'
          : isSelected()
            ? 'text-primary cursor-pointer'
            : 'text-secondary cursor-pointer hover:bg-overlay-hover',
        local.class,
      )}
    >
      <Show when={local.icon}>
        <span
          aria-hidden="true"
          class={cx(
            'inline-flex items-center justify-center shrink-0',
            ICON_SIZE_CLASSES[ctx.size()],
          )}
        >
          {local.icon}
        </span>
      </Show>
      <Show when={!local.isLabelHidden}>
        <span>{local.label}</span>
      </Show>
    </button>
  );
}
