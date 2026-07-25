// Kit TextArea — SolidJS re-implementation of Astryx TextArea.
// Spec: `npx astryx component TextArea` (rows, maxLength counter, status,
// disabled-message a11y).
// React source studied via `npx astryx swizzle TextArea` + `swizzle Field`
// (scratch/swizzle-textarea, scratch/swizzle-field, scratch/swizzle-fieldstatus).
//
// Every styling value is an Astryx token via the Tailwind bridge or a
// var(--*) custom property. Status border/focus/hover colors are routed
// through private CSS variables set inline (see TextInput.jsx for rationale).
// The field chrome (label / description / status message) is intentionally
// inlined here per kit rules — TextInput.jsx carries the same pattern.
import { createSignal, createUniqueId, mergeProps, splitProps, Show, useContext } from 'solid-js';
import { cx } from './cx';
import { FormLayoutContext } from './FormLayout';

const LABEL_BASE = cx(
  'flex items-center gap-1 font-sans font-medium',
  'text-base leading-[var(--text-label-leading)]',
);
const INDICATOR_CLASSES = 'font-normal text-sm leading-[var(--text-supporting-leading)] text-secondary';
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

// Same wrapper chrome as TextInput, but top-aligned (multi-line) and without
// a fixed height — the textarea's `rows` controls height. Size affects padding.
const WRAPPER_BASE = cx(
  'astryx-textarea relative z-[1] box-border flex items-start gap-2 px-2',
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
const SIZE_CLASSES = { sm: 'py-1', md: 'py-1', lg: 'py-2' };
const statusWrapperVars = (type) => ({
  '--input-border': `var(--color-${type})`,
  '--input-focus-border': `var(--color-${type})`,
  '--input-hover-shadow': `var(--shadow-inset-${type})`,
});

const TEXTAREA_CLASSES = cx(
  'block flex-1 min-w-0 border-0 p-0 bg-transparent outline-none resize-y',
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

/** Minimal inline spinner; secondary text color. */
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
 * Multi-line text input with an always-associated label (for/id), optional
 * description, character counter, and validation status wired via
 * aria-describedby.
 *
 * Props (per the Astryx TextArea spec, adapted to Solid):
 * @param {string} label - Label text (required). Associated via for/id;
 *   visually hidden with `isLabelHidden`.
 * @param {string} value - Current value.
 * @param {(value: string, e: InputEvent) => void} [onChange] - Fired on input.
 * @param {(value: string, e: InputEvent) => void|Promise<void>} [changeAction]
 *   Async action fired after onChange (unless defaultPrevented); shows the
 *   spinner and aria-busy while pending.
 * @param {boolean} [isLabelHidden=false] - Visually hide label + description.
 * @param {string} [description] - Helper text, joined into aria-describedby.
 * @param {boolean} [isOptional=false] - "Optional" indicator.
 * @param {boolean} [isRequired=false] - "Required" indicator + aria-required.
 * @param {boolean} [isDisabled=false] - Disables the textarea.
 * @param {string} [disabledMessage] - Why it's disabled; keeps the textarea
 *   focusable via aria-disabled + readOnly and exposes the message through
 *   aria-describedby (and a native title tooltip).
 * @param {boolean} [isLoading=false] - Spinner + aria-busy.
 * @param {string} [placeholder] - Placeholder text (never a label substitute).
 * @param {number} [rows=3] - Visible text rows.
 * @param {number} [maxLength] - Shows a current/max character counter below the
 *   textarea (not natively enforced); over the limit the counter turns to the
 *   error color and the textarea is marked aria-invalid.
 * @param {{type: 'error'|'warning'|'success', message?: string}} [status]
 *   Colored border + status icon; message rendered below (role=alert for
 *   error) and joined into aria-describedby. Error sets aria-invalid.
 * @param {string} [labelTooltip] - Info hint at the end of the label (native
 *   title tooltip in this kit).
 * @param {import('solid-js').JSX.Element} [startIcon] - Leading adornment
 *   inside the wrapper (pass an aria-hidden icon element).
 * @param {boolean} [hasSpellCheck=true] - Browser spell checking.
 * @param {boolean} [hasAutoFocus=false] - Autofocus on mount.
 * @param {'sm'|'md'|'lg'} [size='md'] - Padding size (height comes from rows).
 * @param {string} [htmlName] - HTML name attribute.
 * @param {number|string} [width] - Width of the whole field (number = px).
 * @param {(e: ClipboardEvent) => void} [onPaste] - Paste passthrough.
 * @param {(e: FocusEvent) => void} [onFocus] - Focus passthrough.
 * @param {(e: FocusEvent) => void} [onBlur] - Blur passthrough.
 * @param {string} [class] - Extra classes merged onto the textarea wrapper.
 * Remaining props (aria-*, ...) are spread onto the <textarea>.
 */
export function TextArea(props) {
  const merged = mergeProps(
    {
      isLabelHidden: false,
      isOptional: false,
      isRequired: false,
      isDisabled: false,
      isLoading: false,
      hasSpellCheck: true,
      hasAutoFocus: false,
      rows: 3,
      size: 'md',
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
    'startIcon',
    'status',
    'size',
    'onChange',
    'changeAction',
    'isLoading',
    'value',
    'placeholder',
    'rows',
    'maxLength',
    'labelTooltip',
    'hasSpellCheck',
    'hasAutoFocus',
    'htmlName',
    'width',
    'onPaste',
    'onFocus',
    'onBlur',
    'class',
    'ref',
  ]);

  const layout = useContext(FormLayoutContext);
  const isHorizontalLabels = () => layout.direction === 'horizontal-labels';

  const id = createUniqueId();
  const descriptionId = `${id}-desc`;
  const statusMessageId = `${id}-status`;
  const counterId = `${id}-counter`;
  const disabledMessageId = `${id}-disabled`;

  let textareaEl;

  const [isPending, setPending] = createSignal(false);
  let actionId = 0;
  const isBusy = () => local.isLoading || isPending();
  const showsDisabledMessage = () => local.isDisabled && !!local.disabledMessage;
  const size = () => (SIZE_CLASSES[local.size] ? local.size : 'md');
  const hasCounter = () => local.maxLength != null;
  const isOverLimit = () => hasCounter() && local.value.length > local.maxLength;

  const indicator = () =>
    local.isOptional ? 'Optional' : local.isRequired ? 'Required' : null;

  const ariaDescribedBy = () =>
    cx(
      local.description && descriptionId,
      local.status?.message && statusMessageId,
      hasCounter() && counterId,
      showsDisabledMessage() && disabledMessageId,
    ) || undefined;

  const handleInput = (e) => {
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

  const handleWrapperClick = (e) => {
    if (local.isDisabled || e.target === textareaEl) return;
    textareaEl?.focus();
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

  const wrapperNode = () => (
    <div
      class={cx(
        WRAPPER_BASE,
        SIZE_CLASSES[size()],
        (local.isDisabled || isBusy()) && WRAPPER_DISABLED,
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
      <textarea
        {...rest}
        ref={(el) => {
          textareaEl = el;
          if (typeof local.ref === 'function') local.ref(el);
        }}
        id={id}
        name={local.htmlName}
        value={local.value}
        placeholder={local.placeholder}
        rows={local.rows}
        onInput={handleInput}
        onPaste={local.onPaste}
        onFocus={local.onFocus}
        onBlur={local.onBlur}
        disabled={local.isDisabled && !showsDisabledMessage()}
        aria-disabled={showsDisabledMessage() ? 'true' : undefined}
        readOnly={showsDisabledMessage() || undefined}
        spellcheck={local.hasSpellCheck}
        autofocus={local.hasAutoFocus || undefined}
        aria-describedby={ariaDescribedBy()}
        aria-required={local.isRequired && !local.isOptional ? 'true' : undefined}
        aria-invalid={local.status?.type === 'error' || isOverLimit() ? 'true' : undefined}
        aria-busy={isBusy() || undefined}
        class={cx(
          TEXTAREA_CLASSES,
          local.isDisabled && 'cursor-not-allowed',
          // Reserve space so text doesn't flow under the absolute status icon.
          local.status && 'pe-6',
        )}
      />
      <Show when={isBusy()}>
        <InlineSpinner />
      </Show>
      <Show when={local.status}>
        <span class="absolute top-2 end-2 flex pointer-events-none">
          <StatusIcon type={local.status.type} />
        </span>
      </Show>
    </div>
  );

  const counterNode = () => (
    <Show when={hasCounter()}>
      <div
        id={counterId}
        class={cx(
          'flex justify-end mt-1 font-sans text-sm leading-[var(--text-supporting-leading)]',
          isOverLimit() ? 'text-error' : 'text-secondary',
        )}
      >
        {local.value.length}/{local.maxLength}
        <span class="sr-only" aria-live="polite">
          {isOverLimit()
            ? `${local.value.length - local.maxLength} characters over limit`
            : ''}
        </span>
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

  return (
    <Show
      when={!isHorizontalLabels()}
      fallback={
        <div class="contents">
          <div class="pt-[calc(var(--border-width)+var(--spacing-1))]">{labelNode()}</div>
          <div class="flex flex-col isolate">
            {descriptionNode()}
            {wrapperNode()}
            {counterNode()}
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
          {wrapperNode()}
          {counterNode()}
          {statusMessageNode()}
        </div>
        {disabledMessageNode()}
      </div>
    </Show>
  );
}
