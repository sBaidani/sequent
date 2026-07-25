// Kit SideNav — SolidJS re-implementation of Astryx SideNav (+ SideNavSection,
// SideNavHeading, SideNavItem, SideNavCollapseButton).
// Specs: `npx astryx component SideNav` / `SideNavSection` / `SideNavHeading` /
// `SideNavItem` / `SideNavCollapseButton`, implemented only as far as this app
// needs (button items, no href/nesting; controlled open state from uiStore).
//
// Landmark: the root is an <aside role="navigation" aria-label=…> — an explicit
// navigation landmark per the spec (the e2e suite locates it via
// getByRole('navigation', { name })).
//
// Width: var(--sidenav-width) (defined on :root in styles.css, 272px — inside
// the Astryx 256–280px side-nav budget). Fallback baked into the classes for
// isolated rendering. Layering: var(--z-sidenav) from the shell z scale.
//
// Responsive/collapse contract (mirrors the retired glass sidebar):
//   lg+   : in-flow rail; isOpen=false animates width to 0 (collapsed)
//   < lg  : fixed overlay drawer; isOpen=false slides it off-canvas
import { mergeProps, splitProps, Show } from 'solid-js';
import { cx } from './cx';
import { IconButton } from './IconButton';

// ---------------------------------------------------------------------------
// SideNav
// ---------------------------------------------------------------------------

/**
 * SideNav — the application's side navigation rail.
 *
 * @param {string} [label='Main'] - Accessible name of the navigation landmark.
 * @param {boolean} [isOpen=true] - Controlled open state. Desktop: collapses
 *   the rail width to 0; mobile: slides the overlay drawer off-canvas.
 * @param {import('solid-js').JSX.Element} [header] - Sticky header slot
 *   (typically SideNavHeading).
 * @param {import('solid-js').JSX.Element} [children] - Scrollable middle
 *   region: sections, items, widgets.
 * @param {import('solid-js').JSX.Element} [footer] - Footer slot rendered
 *   below the scroll region.
 * @param {string} [class] - Extra classes merged onto the root.
 * Remaining props are spread onto the root element.
 */
export function SideNav(props) {
  const merged = mergeProps({ label: 'Main', isOpen: true }, props);
  const [local, rest] = splitProps(merged, [
    'label',
    'isOpen',
    'header',
    'children',
    'footer',
    'class',
  ]);

  return (
    <aside
      {...rest}
      role="navigation"
      aria-label={local.label}
      data-open={local.isOpen ? 'true' : 'false'}
      class={cx(
        'astryx-side-nav fixed inset-y-0 left-0 z-[var(--z-sidenav,50)] flex h-full flex-col',
        'bg-body text-primary lg:relative lg:inset-auto',
        'transition-[width,min-width,max-width,transform,opacity] duration-(--duration-medium) ease-in-out motion-reduce:transition-none',
        local.isOpen
          ? 'w-[var(--sidenav-width,272px)] translate-x-0 border-e border-border lg:min-w-[var(--sidenav-width,272px)] lg:max-w-[var(--sidenav-width,272px)]'
          : 'w-[var(--sidenav-width,272px)] -translate-x-full border-none lg:w-0 lg:min-w-0 lg:max-w-0 lg:translate-x-0 lg:overflow-hidden lg:opacity-0',
        local.class,
      )}
    >
      <Show when={local.header != null}>
        <div class="shrink-0">{local.header}</div>
      </Show>
      <div class="flex min-h-0 flex-1 flex-col overflow-y-auto">{local.children}</div>
      <Show when={local.footer != null}>
        <div class="shrink-0">{local.footer}</div>
      </Show>
    </aside>
  );
}

// ---------------------------------------------------------------------------
// SideNavSection
// ---------------------------------------------------------------------------

/**
 * SideNavSection — groups related SideNavItems under a (optionally visually
 * hidden) title. Uses the kit's role="group" + aria-label section pattern
 * (same as Menu sections): the group name lives on the container, the visible
 * title is decorative.
 *
 * @param {string} title - Section title (required).
 * @param {boolean} [isHeaderHidden=false] - Hide the title visually while
 *   keeping the group's accessible name.
 * @param {import('solid-js').JSX.Element} [children] - SideNavItems.
 * @param {string} [class] - Extra classes merged onto the group.
 * Remaining props are spread onto the group element.
 */
export function SideNavSection(props) {
  const merged = mergeProps({ isHeaderHidden: false }, props);
  const [local, rest] = splitProps(merged, ['title', 'isHeaderHidden', 'children', 'class']);

  return (
    <div
      {...rest}
      role="group"
      aria-label={local.title}
      class={cx('astryx-side-nav-section flex flex-col gap-1', local.class)}
    >
      <Show when={!local.isHeaderHidden}>
        <div
          aria-hidden="true"
          class="select-none px-3 pb-1 text-sm font-medium text-secondary"
        >
          {local.title}
        </div>
      </Show>
      {local.children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SideNavHeading
// ---------------------------------------------------------------------------

/**
 * SideNavHeading — product identity block (icon + name + subheading).
 *
 * @param {string} heading - Product/app name (required).
 * @param {import('solid-js').JSX.Element} [icon] - Product icon/avatar.
 * @param {import('solid-js').JSX.Element} [subheading] - Content below the
 *   heading (text or inline JSX, e.g. a StatusDot + label).
 * @param {import('solid-js').JSX.Element} [headerEndContent] - Trailing
 *   content at the end of the heading row.
 * @param {string} [class] - Extra classes merged onto the root.
 * Remaining props are spread onto the root element.
 */
export function SideNavHeading(props) {
  const [local, rest] = splitProps(props, [
    'heading',
    'icon',
    'subheading',
    'headerEndContent',
    'class',
  ]);

  return (
    <div
      {...rest}
      class={cx('astryx-side-nav-heading flex items-center gap-3 px-3', local.class)}
    >
      <Show when={local.icon != null}>
        <span class="flex shrink-0 items-center justify-center">{local.icon}</span>
      </Show>
      <div class="flex min-w-0 flex-1 flex-col">
        <span class="truncate text-base font-bold tracking-wide text-primary">
          {local.heading}
        </span>
        <Show when={local.subheading != null}>
          <span class="flex min-w-0 items-center gap-1.5 text-sm text-secondary">
            {local.subheading}
          </span>
        </Show>
      </div>
      <Show when={local.headerEndContent != null}>
        <span class="flex shrink-0 items-center">{local.headerEndContent}</span>
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SideNavItem
// ---------------------------------------------------------------------------

// Attribute marking the item's real control, so the row's focus ring only
// lights for it (not for interactive endContent, which brings its own ring).
const ITEM_CONTROL_ATTR = 'data-astryx-sidenav-control';

// Invisible-button pattern (same as ListItem): the row carries all visuals,
// the <button> is the semantic control filling the label column. This keeps
// interactive endContent (e.g. a flyout trigger IconButton) out of the
// button — nested buttons are invalid HTML.
const ITEM_ROW_CLASSES = cx(
  'astryx-side-nav-item relative box-border flex w-full items-center gap-3 rounded-md px-3 py-2.5',
  'cursor-pointer select-none text-base font-semibold',
  'transition-colors duration-(--duration-fast) ease-out motion-reduce:transition-none',
  // Kit focus-ring standard, scoped to the invisible control inside.
  'outline-none has-[[data-astryx-sidenav-control]:focus-visible]:outline-2',
  'has-[[data-astryx-sidenav-control]:focus-visible]:outline-offset-2',
  'has-[[data-astryx-sidenav-control]:focus-visible]:outline-(--color-accent)',
);

const ITEM_CONTROL_CLASSES = cx(
  'appearance-none m-0 flex min-w-0 flex-1 border-0 bg-transparent p-0 text-start',
  '[font:inherit] text-inherit [cursor:inherit] outline-none',
);

/**
 * SideNavItem — one navigation destination. Renders a real <button> (this app
 * has no routing); the active item carries aria-current="page".
 *
 * @param {string} label - Item label (required).
 * @param {import('solid-js').JSX.Element} [icon] - Leading icon (decorative).
 * @param {boolean} [isSelected=false] - Marks the current page
 *   (aria-current="page" + accent fill).
 * @param {boolean} [isDisabled=false] - Disabled state.
 * @param {(e: MouseEvent) => void} [onClick] - Activation handler.
 * @param {import('solid-js').JSX.Element} [endContent] - Trailing content
 *   (Badge count, secondary action). May be interactive — it lives outside
 *   the item's button.
 * @param {string} [class] - Extra classes merged onto the row.
 * Remaining props are spread onto the row element.
 */
export function SideNavItem(props) {
  const merged = mergeProps({ isSelected: false, isDisabled: false }, props);
  const [local, rest] = splitProps(merged, [
    'label',
    'icon',
    'isSelected',
    'isDisabled',
    'onClick',
    'endContent',
    'class',
  ]);

  // Clicking row padding (outside nested interactive elements) activates the
  // item, matching the ListItem container-click behavior.
  const handleRowClick = (e) => {
    if (local.isDisabled) return;
    if (e.target instanceof Element && e.target.closest('button, a, input, select, textarea')) {
      return;
    }
    local.onClick?.(e);
  };

  return (
    <div
      {...rest}
      class={cx(
        ITEM_ROW_CLASSES,
        local.isSelected
          ? 'bg-accent-bg text-on-accent'
          : 'text-secondary hover:bg-overlay-hover hover:text-primary',
        local.isDisabled && 'pointer-events-none cursor-not-allowed opacity-50',
        local.class,
      )}
      onClick={handleRowClick}
    >
      <Show when={local.icon != null}>
        <span aria-hidden="true" class="inline-flex size-4.5 shrink-0 items-center justify-center">
          {local.icon}
        </span>
      </Show>
      <button
        type="button"
        {...{ [ITEM_CONTROL_ATTR]: '' }}
        class={ITEM_CONTROL_CLASSES}
        aria-current={local.isSelected ? 'page' : undefined}
        disabled={local.isDisabled || undefined}
        onClick={(e) => local.onClick?.(e)}
      >
        <span class="min-w-0 flex-1 truncate">{local.label}</span>
      </button>
      <Show when={local.endContent != null}>
        <span class="ms-auto flex shrink-0 items-center">{local.endContent}</span>
      </Show>
    </div>
  );
}

// ---------------------------------------------------------------------------
// SideNavCollapseButton
// ---------------------------------------------------------------------------

const ChevronsIcon = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="2"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    class={cx('size-4', props.isCollapsed && 'rotate-180')}
  >
    <path d="M11 17l-5-5 5-5" />
    <path d="M18 17l-5-5 5-5" />
  </svg>
);

/**
 * SideNavCollapseButton — icon-only ghost toggle for the rail's collapsed
 * state. Controlled: pair `isCollapsed` with `onClick`.
 *
 * @param {boolean} [isCollapsed=false] - Current collapsed state (flips the
 *   chevron direction and the default label).
 * @param {(e: MouseEvent) => void} [onClick] - Toggle handler.
 * @param {string} [label] - Accessible label override.
 * @param {string} [class] - Extra classes merged onto the button.
 */
export function SideNavCollapseButton(props) {
  const merged = mergeProps({ isCollapsed: false }, props);
  return (
    <IconButton
      label={merged.label ?? (merged.isCollapsed ? 'Expand navigation' : 'Collapse navigation')}
      icon={<ChevronsIcon isCollapsed={merged.isCollapsed} />}
      variant="ghost"
      size="sm"
      aria-expanded={merged.isCollapsed ? 'false' : 'true'}
      onClick={merged.onClick}
      class={merged.class}
    />
  );
}
