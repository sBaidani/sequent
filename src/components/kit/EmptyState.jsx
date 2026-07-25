// Kit EmptyState — SolidJS re-implementation of Astryx EmptyState.
// Spec: `npx astryx component EmptyState`; swizzled React source studied in
// scratch/swizzle-emptystate (role="status" root, decorative icon slot,
// h1–h6 title, div description, horizontal→stacked actions when compact).
// All styling values are Astryx tokens via the Tailwind bridge or var(--*).
import { splitProps, mergeProps, Show } from 'solid-js';
import { Dynamic } from 'solid-js/web';
import { cx } from './cx';

/**
 * EmptyState shows a placeholder when a content area has no data — empty
 * lists, zero search results, first-time setups. Always include a title and,
 * ideally, a next step so the user is not stuck.
 *
 * Announced via `role="status"` so screen readers hear the empty message.
 *
 * Props (per the Astryx EmptyState spec, adapted to Solid):
 * @param {string} title - Primary message rendered as a heading (required).
 * @param {import('solid-js').JSX.Element} [description] - Secondary text below the title.
 * @param {import('solid-js').JSX.Element} [icon] - Icon/illustration above the
 *   title; rendered decorative (aria-hidden="true").
 * @param {import('solid-js').JSX.Element} [actions] - Action buttons below the
 *   description; horizontal by default, stacked vertically when isCompact.
 * @param {1|2|3|4|5|6} [headingLevel=3] - Rendered heading tag (h1–h6) to fit
 *   the document outline.
 * @param {boolean} [isCompact=false] - Compact variant with reduced spacing
 *   for constrained areas (cards, sidebars).
 * @param {string} [class] - Extra classes merged onto the root element.
 * Remaining props (data-*, aria-*, ref, ...) are spread onto the root <div>.
 */
export function EmptyState(props) {
  const merged = mergeProps({ headingLevel: 3, isCompact: false }, props);
  const [local, rest] = splitProps(merged, [
    'title',
    'description',
    'icon',
    'actions',
    'headingLevel',
    'isCompact',
    'class',
  ]);

  return (
    <div
      {...rest}
      role="status"
      data-variant={local.isCompact ? 'compact' : undefined}
      class={cx(
        'astryx-empty-state flex flex-col items-center justify-center text-center',
        // spacing-4 gap / spacing-8×6 padding, halved-ish for compact (per source)
        local.isCompact ? 'gap-2 p-4' : 'gap-4 px-6 py-8',
        local.class,
      )}
    >
      <Show when={local.icon != null}>
        <div aria-hidden="true">{local.icon}</div>
      </Show>
      {/* 360px text measure is fixed geometry from the Astryx source */}
      <div class="flex max-w-[360px] flex-col items-center">
        <Dynamic
          component={`h${local.headingLevel}`}
          class={cx(
            'm-0 font-semibold text-primary',
            local.isCompact
              ? 'text-[length:var(--text-label-size)] leading-[var(--text-large-leading)]'
              : 'text-[length:var(--text-large-size)] leading-[var(--text-large-leading)]',
          )}
        >
          {local.title}
        </Dynamic>
        <Show when={local.description != null}>
          {/* div, not p: the slot accepts arbitrary JSX which <p> can't contain */}
          <div
            class={cx(
              'm-0 font-normal text-secondary',
              local.isCompact
                ? 'text-[length:var(--text-supporting-size)] leading-[var(--text-body-leading)]'
                : 'text-[length:var(--text-body-size)] leading-[var(--text-body-leading)]',
            )}
          >
            {local.description}
          </div>
        </Show>
      </div>
      <Show when={local.actions != null}>
        <div
          class={cx(
            'mt-1 flex items-center gap-2',
            local.isCompact ? 'flex-col' : 'flex-row',
          )}
        >
          {local.actions}
        </div>
      </Show>
    </div>
  );
}
