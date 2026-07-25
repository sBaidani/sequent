// Kit AppShell — SolidJS re-implementation of Astryx AppShell.
// Spec: `npx astryx component AppShell` + `npx astryx docs layout`, scoped to
// what this app needs: a full-viewport frame (100dvh, never 100vh — Android
// WebView keyboard breaks 100vh), a sideNav slot, a <main> content region,
// safe-area insets on the frame, and mobile overlay-drawer behavior for the
// side nav (scrim owned here, drawer positioning owned by SideNav).
//
// Layering comes from the shell z-index scale defined on :root in styles.css:
//   --z-scrim:40  --z-sidenav:50  --z-popover:60  --z-dialog:70  --z-toast:80
// Fallbacks baked into the classes keep the ordering meaningful in isolation
// (tests, storybook-style usage without the app stylesheet).
//
// Responsive contract (Astryx "section" variant semantics — full-bleed
// content with a divider between nav and content):
//   > 1024px  nav var(--sidenav-width) | content flex-1
//   <= 1024px nav becomes a fixed overlay drawer above a scrim; content full width
import { mergeProps, splitProps, Show } from 'solid-js';
import { cx } from './cx';

/**
 * AppShell — the outermost layout frame for the application. Render exactly
 * one per page, at the root.
 *
 * Props (per the Astryx AppShell spec, adapted to Solid and this app):
 * @param {import('solid-js').JSX.Element} [sideNav] - Side navigation slot,
 *   typically the kit SideNav. Rendered before the content region.
 * @param {boolean} [sideNavOpen=false] - Whether the side nav is open. Below
 *   the lg breakpoint an open side nav overlays the content above a scrim.
 * @param {() => void} [onSideNavClose] - Called when the mobile scrim is
 *   clicked (dismiss request for the overlay drawer).
 * @param {import('solid-js').JSX.Element} [children] - Main content, rendered
 *   inside a <main role="main"> element.
 * @param {string} [contentId] - id for the <main> region (the app pins
 *   id="main-content" — e2e tests and views depend on it).
 * @param {string} [contentClass] - Extra classes merged onto the <main> region.
 * @param {string} [class] - Extra classes merged onto the frame.
 * Remaining props are spread onto the frame element.
 */
export function AppShell(props) {
  const merged = mergeProps({ sideNavOpen: false }, props);
  const [local, rest] = splitProps(merged, [
    'sideNav',
    'sideNavOpen',
    'onSideNavClose',
    'children',
    'contentId',
    'contentClass',
    'class',
  ]);

  return (
    <div
      {...rest}
      class={cx(
        // Frame: 100dvh viewport fill, token body surface, single flex row.
        'astryx-app-shell relative flex h-dvh w-full overflow-hidden bg-body text-primary',
        // Safe-area insets (index.html declares viewport-fit=cover); env()
        // has no token equivalent — this is the sanctioned pattern.
        'pt-[env(safe-area-inset-top)] pr-[env(safe-area-inset-right)]',
        'pb-[env(safe-area-inset-bottom)] pl-[env(safe-area-inset-left)]',
        local.class,
      )}
    >
      {local.sideNav}

      {/* Mobile scrim: dismisses the overlay drawer. Desktop (lg+) renders the
          side nav inline, so no scrim. */}
      <Show when={local.sideNavOpen}>
        <div
          class="fixed inset-0 z-[var(--z-scrim,40)] bg-overlay lg:hidden"
          data-app-shell-scrim
          aria-hidden="true"
          onClick={() => local.onSideNavClose?.()}
        />
      </Show>

      <main
        role="main"
        id={local.contentId}
        class={cx(
          'relative flex h-full min-w-0 flex-1 flex-col overflow-hidden bg-body text-primary',
          local.contentClass,
        )}
      >
        {local.children}
      </main>
    </div>
  );
}
