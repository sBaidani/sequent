// Kit IconButton — SolidJS re-implementation of Astryx IconButton.
// Spec: `npx astryx component IconButton`. A thin wrapper over Button with
// isIconOnly always true, mirroring the Astryx source composition.
import { splitProps } from 'solid-js';
import { Button } from './Button';

/**
 * A button that shows only an icon with no visible text. Use in toolbars,
 * table rows, and compact UI where the icon is universally understood.
 *
 * @param {string} label - REQUIRED accessible name. Rendered as aria-label
 *   (never as visible text). Make it specific: "Delete conversation", not "Delete".
 * @param {import('solid-js').JSX.Element} icon - REQUIRED icon element rendered inside the button.
 * @param {'primary'|'secondary'|'ghost'|'destructive'} [variant='secondary'] - Visual style variant.
 * @param {'sm'|'md'|'lg'} [size='md'] - Size variant.
 * @param {boolean} [isDisabled=false] - Disables the button.
 * @param {boolean} [isLoading=false] - Shows a loading spinner and disables interaction.
 * @param {(e: MouseEvent) => void} [onClick] - Standard click handler.
 * @param {(e: MouseEvent) => void|Promise<void>} [clickAction] - Async click handler
 *   with automatic loading state.
 * Remaining props are forwarded to Button; `children`/`endContent` are not
 * supported on an icon-only button and are stripped.
 */
export function IconButton(props) {
  if (!props.label) {
    // label is the button's only accessible name — an IconButton without it is
    // invisible to assistive technology.
    console.error(
      'IconButton: the `label` prop is required — it is the accessible name (aria-label) of an icon-only button.',
    );
  }
  const [, rest] = splitProps(props, ['isIconOnly', 'children', 'endContent']);
  return <Button {...rest} isIconOnly />;
}
