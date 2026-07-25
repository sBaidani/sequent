// Kit FormLayout — SolidJS re-implementation of Astryx FormLayout.
// Spec: `npx astryx component FormLayout` (direction variants, nesting).
// React source studied via `npx astryx swizzle FormLayout` (scratch/swizzle-formlayout).
//
// Pure spatial layout for form fields — no form state or submission (wrap in
// <form> for that). Provides direction context so field components (TextInput,
// TextArea) can switch to the grid-cell rendering that `horizontal-labels`
// requires. All gaps are Astryx spacing tokens via the Tailwind bridge
// (gap-4 → --spacing-4, gap-3 → --spacing-3).
import { createContext, mergeProps, splitProps, useContext } from 'solid-js';
import { cx } from './cx';

/**
 * Direction context consumed by kit field components. A nested FormLayout
 * provides a fresh value, so mixing directions works like the React original.
 */
export const FormLayoutContext = createContext({ direction: 'vertical' });

/** Read the current FormLayout direction ('vertical' outside any FormLayout). */
export const useFormLayoutDirection = () => {
  const context = useContext(FormLayoutContext);
  return () => context.direction;
};

const DIRECTION_CLASSES = {
  // Fields stack top-to-bottom.
  vertical: 'flex flex-col gap-4',
  // Equal-width columns, one per child.
  horizontal: 'grid grid-flow-col auto-cols-fr gap-4',
  // Labels in column 1, inputs in column 2; collapses to vertical <=480px
  // (fields render display:contents cells via FormLayoutContext).
  'horizontal-labels': cx(
    'grid grid-cols-[auto_1fr] items-start gap-x-4 gap-y-3',
    'max-[480px]:flex max-[480px]:flex-col max-[480px]:gap-4',
  ),
};

/**
 * Arranges form fields with consistent spacing and direction.
 *
 * Props (per the Astryx FormLayout spec, adapted to Solid):
 * @param {'vertical'|'horizontal'|'horizontal-labels'} [direction='vertical']
 *   Field arrangement. `horizontal-labels` uses CSS Grid with labels beside
 *   inputs and must be the outermost layout (don't nest it).
 * @param {import('solid-js').JSX.Element} [children] - Form fields to arrange.
 * @param {string} [class] - Extra classes merged onto the root element.
 * Remaining props (id, role, aria-*, ref, ...) are spread onto the root <div>.
 */
export function FormLayout(props) {
  const merged = mergeProps({ direction: 'vertical' }, props);
  const [local, rest] = splitProps(merged, ['direction', 'children', 'class']);
  const direction = () =>
    DIRECTION_CLASSES[local.direction] ? local.direction : 'vertical';

  return (
    <FormLayoutContext.Provider
      value={{
        get direction() {
          return direction();
        },
      }}
    >
      <div
        {...rest}
        class={cx('astryx-form-layout', DIRECTION_CLASSES[direction()], local.class)}
        data-direction={direction()}
      >
        {local.children}
      </div>
    </FormLayoutContext.Provider>
  );
}
