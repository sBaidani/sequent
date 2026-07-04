// Kit Section — SolidJS re-implementation of Astryx Section.
// Spec: `npx astryx component Section` (variants, spacing-scale padding,
// dividers, sizing). React source studied via `npx astryx swizzle Section`
// (scratch/swizzle-section).
//
// Section is the sanctioned Card-like grouping for page regions (settings
// groups, form sections) — use it instead of Card for page-level grouping.
// All values are Astryx tokens: variant backgrounds via the Tailwind bridge,
// padding via the --spacing-* scale, dividers via --color-border.
import { createUniqueId, mergeProps, splitProps, Show } from 'solid-js';
import { cx } from './cx';
import { Heading } from './Heading';

// Spacing-scale steps → spacing tokens (per the Astryx spec's SpacingStep).
const SPACING_STEP_TOKENS = {
  0: '--spacing-0',
  0.5: '--spacing-0-5',
  1: '--spacing-1',
  1.5: '--spacing-1-5',
  2: '--spacing-2',
  3: '--spacing-3',
  4: '--spacing-4',
  5: '--spacing-5',
  6: '--spacing-6',
  8: '--spacing-8',
  10: '--spacing-10',
};

const VARIANT_CLASSES = {
  section: 'bg-surface',
  transparent: 'bg-transparent',
  muted: 'bg-muted',
};

const DIVIDER_CLASSES = {
  top: 'border-t',
  bottom: 'border-b',
  start: 'border-s',
  end: 'border-e',
};

const toSize = (value) => (typeof value === 'number' ? `${value}px` : value);

/**
 * A page-region container with background variants — the sanctioned grouping
 * for settings panels, form sections, and sidebar regions (not Card).
 *
 * Props (per the Astryx Section spec, adapted to Solid):
 * @param {'section'|'transparent'|'muted'} [variant='section'] - Background
 *   variant. Start with 'section'; use 'muted' only to call attention.
 * @param {string} [title] - Kit convenience for the spec's "heading + Section"
 *   settings-group pattern: renders a Heading and names the section as an ARIA
 *   region via aria-labelledby.
 * @param {1|2|3|4|5|6} [headingLevel=3] - Heading level used for `title`.
 * @param {0|0.5|1|1.5|2|3|4|5|6|8|10} [padding=4] - Internal padding on the
 *   spacing scale (4 → --spacing-4 = 16px). Use 0 for edge-to-edge content.
 * @param {0|0.5|1|1.5|2|3|4|5|6|8|10} [paddingBlock] - Block (vertical)
 *   padding override; inline padding keeps following `padding`.
 * @param {Array<'top'|'bottom'|'start'|'end'>} [dividers] - Sides with
 *   1px --color-border divider borders.
 * @param {number|string} [width] - Width (number = px, string as-is).
 * @param {number|string} [height] - Height.
 * @param {number|string} [maxWidth] - Maximum width.
 * @param {number|string} [minHeight] - Minimum height.
 * @param {import('solid-js').JSX.Element} [children] - Section content.
 * @param {string} [class] - Extra classes merged onto the root element.
 * Remaining props (id, aria-*, ref, ...) are spread onto the root <section>.
 */
export function Section(props) {
  const merged = mergeProps({ variant: 'section', padding: 4, headingLevel: 3 }, props);
  const [local, rest] = splitProps(merged, [
    'variant',
    'title',
    'headingLevel',
    'padding',
    'paddingBlock',
    'dividers',
    'width',
    'height',
    'maxWidth',
    'minHeight',
    'children',
    'class',
    'style',
  ]);

  const headingId = createUniqueId();
  const variant = () => (VARIANT_CLASSES[local.variant] ? local.variant : 'section');
  const paddingToken = () => SPACING_STEP_TOKENS[local.padding] ?? '--spacing-4';

  const styleValue = () => ({
    padding: `var(${paddingToken()})`,
    ...(local.paddingBlock != null && SPACING_STEP_TOKENS[local.paddingBlock]
      ? { 'padding-block': `var(${SPACING_STEP_TOKENS[local.paddingBlock]})` }
      : {}),
    ...(local.width != null ? { width: toSize(local.width) } : {}),
    ...(local.height != null ? { height: toSize(local.height) } : {}),
    ...(local.maxWidth != null ? { 'max-width': toSize(local.maxWidth) } : {}),
    ...(local.minHeight != null ? { 'min-height': toSize(local.minHeight) } : {}),
    ...(typeof local.style === 'object' ? local.style : {}),
  });

  return (
    <section
      {...rest}
      class={cx(
        'astryx-section box-border',
        VARIANT_CLASSES[variant()],
        local.dividers?.length && 'border-border',
        ...(local.dividers ?? []).map((side) => DIVIDER_CLASSES[side]),
        local.class,
      )}
      style={styleValue()}
      data-variant={variant()}
      aria-labelledby={local.title ? headingId : undefined}
    >
      <Show when={local.title}>
        <Heading level={local.headingLevel} id={headingId} class="mb-3">
          {local.title}
        </Heading>
      </Show>
      {local.children}
    </section>
  );
}
