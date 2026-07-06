// Kit TextInput — SolidJS re-implementation of Astryx TextInput.
// Spec: `npx astryx component TextInput` (label/description/status anatomy,
// sizes, clear button, loading, disabled-message a11y).
// React source studied via `npx astryx swizzle TextInput` + `swizzle Field`
// (scratch/swizzle-textinput, scratch/swizzle-field, scratch/swizzle-fieldstatus).
//
// Every styling value is an Astryx token via the Tailwind bridge
// (@astryxdesign/core/src/tailwind-theme.css) or a var(--*) custom property.
// Status border/focus/hover colors are routed through private CSS variables
// (--input-border / --input-focus-border / --input-hover-shadow) set inline,
// so a single utility per property wins deterministically.
import { createSignal, createUniqueId, mergeProps, splitProps, Show, useContext } from 'solid-js';
import { cx } from './cx';
import { FormLayoutContext } from './FormLayout';

// ─── Shared field chrome (inlined per kit rules; TextArea mirrors this) ────

const LABEL_BASE = cx(
  'flex items-center gap-1 font-sans font-medium',
  'text-base leading-[var(--text-label-leading)]',
);
const INDICATOR_CLASSES = 'font-normal text-sm leading-[var(--text-supporting-leading)] text-secondary';
const DESCRIPTION_CLASSES =
  'font-sans font-normal text-sm leading-[var(--text-supporting-leading)] text-secondary';

// Attached status message: tucks under the input (negative top margin, the
// input wrapper carries z-index above it), colored by status type.
const STATUS_MESSAGE_BASE = cx(
  'font-sans text-sm leading-[var(--text-supporting-leading)]',
  '-mt-1.5 pt-[calc(var(--spacing-1-5)+var(--spacing-2))] pb-2 px-2 rounded-b-md',
);
const STATUS_MESSAGE_COLORS = {
  error: 'bg-error-muted text-red-vivid',
  warning: 'bg-warning-muted text-yellow-vivid',
  success: 'bg-success-muted text-green-vivid',
};

const WRAPPER_BASE = cx(
  'astryx-text-input relative z-[1] box-border flex items-center gap-2 py-1 px-2',
  'rounded-md bg-surface',
  'border-(length:--border-width) border-solid',
  'border-[var(--input-border,var(--color-border-emphasized))]',
  'focus-within:border-[var(--input-focus-border,var(--color-accent))]',
  'focus-within:shadow-[inset_0_0_0_2px_var(--color-accent-muted)]',
  'hover:not-focus-within:shadow-[var(--input-hover-shadow,inset_0_0_0_2px_color-mix(in_srgb,var(--color-border-emphasized)_30%,transparent))]',
  'transition-[border-color,box-shadow] duration-[var(--duration-fast)] ease-out',
  'motion-reduce:transition-none outline-none',
);
const WRAPPER_DISABLED = 'cursor-not-allowed opacity-50';
// Inline CSS vars that recolor border / focus border / hover shadow per status.
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

const INPUT_CLASSES = cx(
  'block flex-1 min-w-0 border-0 p-0 bg-transparent outline-none',
  'font-sans text-base leading-[var(--text-body-leading)]',
  'text-primary placeholder:text-secondary',
);

const STATUS_ICON_COLORS = {
  error: 'text-error',
  warning: 'text-warning',
  success: 'text-success',
};

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

/** Minimal inline spinner; inherits the current text color. */
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

/**
 * Single-line text input with an always-associated label (for/id), optional
 * description and validation status wired via aria-describedby.
 *
 * Props (per the Astryx TextInput spec, adapted to Solid):
 * @param {string} label - Label text (required). Always rendered and associated
 *   with the input via for/id; visually hidden with `isLabelHidden`.
 * @param {string} value - Current value.
 * @param {(value: string, e: InputEvent) => void} [onChange] - Fired on input.
 * @param {(value: string, e: InputEvent) => void|Promise<void>} [changeAction]
 *   Async action fired after onChange (unless the event was defaultPrevented);
 *   shows the spinner and aria-busy while pending.
 * @param {'text'|'password'|'email'} [type='text'] - HTML input type.
 * @param {'sm'|'md'|'lg'} [size='md'] - Size variant (--size-element-*).
 * @param {boolean} [isLabelHidden=false] - Visually hide label + description
 *   (kept for screen readers).
 * @param {string} [description] - Helper text between label and input,
 *   referenced by aria-describedby.
 * @param {boolean} [isOptional=false] - "Optional" indicator (mutually
 *   exclusive with isRequired).
 * @param {boolean} [isRequired=false] - "Required" indicator + aria-required.
 * @param {boolean} [isDisabled=false] - Disables the input.
 * @param {string} [disabledMessage] - Why the input is disabled. With
 *   isDisabled, the input stays focusable via aria-disabled + readOnly and the
 *   message is exposed through aria-describedby (and as a native title tooltip).
 * @param {boolean} [isLoading=false] - Spinner + aria-busy.
 * @param {string} [placeholder] - Placeholder text (never a label substitute).
 * @param {string} [labelTooltip] - Info hint at the end of the label (native
 *   title tooltip in this kit).
 * @param {import('solid-js').JSX.Element} [startIcon] - Leading adornment
 *   inside the input wrapper (pass an aria-hidden icon element).
 * @param {{type: 'error'|'warning'|'success', message?: string}} [status]
 *   Validation status: colored border + trailing status icon; a message is
 *   rendered below (role=alert for error) and joined into aria-describedby.
 *   Error also sets aria-invalid.
 * @param {boolean} [hasClear=false] - Trailing × button when non-empty; clears
 *   the value and refocuses the input.
 * @param {boolean} [hasAutoFocus=false] - Autofocus on mount.
 * @param {string} [htmlName] - HTML name attribute.
 * @param {number|string} [width] - Width of the whole field (number = px).
 * @param {() => void} [onEnter] - Fired when Enter is pressed.
 * @param {(e: KeyboardEvent) => void} [onKeyDown] - Keydown passthrough.
 * @param {string} [class] - Extra classes merged onto the input wrapper.
 * Remaining props (autocomplete, aria-*, ...) are spread onto the <input>.
 */
export function TextInput(props) {
  const merged = mergeProps(
    {
      type: 'text',
      size: 'md',
      isLabelHidden: false,
      isOptional: false,
      isRequired: false,
      isDisabled: false,
      isLoading: false,
      hasClear: false,
      hasAutoFocus: false,
    },
    props,
  );
  const [local, rest] = splitProps(merged, [
    'type',
    'label',
    'isLabelHidden',
    'description',
    'isOptional',
    'isRequired',
    'isDisabled',
    'disabledMessage',
    'startIcon',
    'status',
    'size',
    'onChange',
    'changeAction',
    'isLoading',
    'value',
    'placeholder',
    'labelTooltip',
    'hasClear',
    'hasAutoFocus',
    'htmlName',
    'width',
    'onEnter',
    'onKeyDown',
    'class',
    'ref',
  ]);

  const layout = useContext(FormLayoutContext);
  const isHorizontalLabels = () => layout.direction === 'horizontal-labels';

  const id = createUniqueId();
  const descriptionId = `${id}-desc`;
  const statusMessageId = `${id}-status`;
  const disabledMessageId = `${id}-disabled`;

  let inputEl;

  const [isPending, setPending] = createSignal(false);
  // Monotonic id so a stale changeAction settling doesn't clear a newer one.
  let actionId = 0;
  const isBusy = () => local.isLoading || isPending();
  const showsDisabledMessage = () => local.isDisabled && !!local.disabledMessage;
  const size = () => (SIZE_CLASSES[local.size] ? local.size : 'md');

  const indicator = () =>
    local.isOptional ? 'Optional' : local.isRequired ? 'Required' : null;

  const ariaDescribedBy = () =>
    cx(
      local.description && descriptionId,
      local.status?.message && statusMessageId,
      showsDisabledMessage() && disabledMessageId,
    ) || undefined;

  const handleInput = (e) => {
    // Guard: with a disabledMessage the input is readOnly (not native-disabled)
    // so it stays focusable; never mutate or fire callbacks while disabled.
    if (local.isDisabled) return;
    const newValue = e.target.value;
    local.onChange?.(newValue, e);
    if (local.changeAction && !e.defaultPrevented) {
      const current = ++actionId;
      setPending(true);
      Promise.resolve()
        .then(() => local.changeAction(newValue, e))
        .finally(() => {
          if (current === actionId) setPending(false);
        });
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') local.onEnter?.();
    local.onKeyDown?.(e);
  };

  const handleClear = () => {
    local.onChange?.('', null);
    inputEl?.focus();
  };

  // Clicking wrapper chrome (icons, padding) focuses the input.
  const handleWrapperClick = (e) => {
    if (local.isDisabled || e.target === inputEl) return;
    inputEl?.focus();
  };

  const labelNode = () => (
    <label
      for={id}
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

  const inputWrapper = () => (
    <div
      class={cx(
        WRAPPER_BASE,
        SIZE_CLASSES[size()],
        local.isDisabled && WRAPPER_DISABLED,
        local.class,
      )}
      style={local.status ? statusWrapperVars(local.status.type) : undefined}
      data-size={size()}
      data-status={local.status?.type}
      title={showsDisabledMessage() ? local.disabledMessage : undefined}
      onClick={handleWrapperClick}
    >
      <Show when={local.startIcon}>
        <span class="inline-flex items-center justify-center shrink-0 text-secondary">
          {local.startIcon}
        </span>
      </Show>
      <input
        {...rest}
        ref={(el) => {
          inputEl = el;
          if (typeof local.ref === 'function') local.ref(el);
        }}
        id={id}
        name={local.htmlName}
        type={local.type}
        value={local.value}
        placeholder={local.placeholder}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        // With a disabledMessage the input keeps focusability via aria-disabled
        // so the reason stays discoverable; readOnly + the handleInput guard
        // keep the value from changing.
        disabled={local.isDisabled && !showsDisabledMessage()}
        aria-disabled={showsDisabledMessage() ? 'true' : undefined}
        readOnly={showsDisabledMessage() || undefined}
        autofocus={local.hasAutoFocus || undefined}
        aria-describedby={ariaDescribedBy()}
        required={local.isRequired && !local.isOptional ? true : undefined}
        aria-required={local.isRequired && !local.isOptional ? 'true' : undefined}
        aria-invalid={local.status?.type === 'error' ? 'true' : undefined}
        aria-busy={isBusy() || undefined}
        class={cx(INPUT_CLASSES, local.isDisabled && 'cursor-not-allowed')}
      />
      <Show when={local.hasClear && local.value !== '' && !local.isDisabled}>
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
      <Show when={isBusy()}>
        <InlineSpinner />
      </Show>
      <Show when={local.status}>
        <StatusIcon type={local.status.type} />
      </Show>
    </div>
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

  // ── horizontal-labels: render as grid cells (label col / input col) ──
  return (
    <Show
      when={!isHorizontalLabels()}
      fallback={
        <div class="contents">
          <div class="pt-[calc(var(--border-width)+var(--spacing-1))]">{labelNode()}</div>
          <div class="flex flex-col isolate">
            {descriptionNode()}
            {inputWrapper()}
            {statusMessageNode()}
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
        <div class="flex flex-col isolate">
          {inputWrapper()}
          {statusMessageNode()}
        </div>
        {disabledMessageNode()}
      </div>
    </Show>
  );
}
