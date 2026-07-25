// Kit CheckboxInput — SolidJS re-implementation of Astryx CheckboxInput.
// Spec: `npx astryx component CheckboxInput`; React source studied via
// `npx astryx swizzle CheckboxInput` (scratch/swizzle-checkboxinput).
// A real `<input type="checkbox">` sits (visually hidden, opacity-0) over a
// drawn box, so native semantics, forms and the indeterminate DOM property
// all work. Geometry is fixed by the spec per size (sm: 20/18/12/10x2,
// md: 24/22/14/12x2) — 4px-scale values use token-backed utilities, the
// 18/22px boxes are spec-dictated arbitrary px.
// All colors/radii/durations are Astryx tokens, with ONE documented
// exception: the `color` prop accepts a raw CSS color string (per-item user
// colors for Phase 4 task rows) applied via inline style border/background.
import { createEffect, createSignal, createUniqueId, splitProps, mergeProps, Show } from 'solid-js';
import { cx } from './cx';

const WRAPPER_SIZE = { sm: 'size-5', md: 'size-6' };
const BOX_SIZE = { sm: 'w-[18px] h-[18px]', md: 'w-[22px] h-[22px]' };
const CHECKMARK_SIZE = { sm: 'size-3', md: 'size-3.5' };
const DASH_SIZE = { sm: 'w-2.5 h-0.5', md: 'w-3 h-0.5' };

const BOX_BASE = cx(
  'astryx-checkbox flex items-center justify-center border border-solid rounded-sm',
  'transition-colors duration-[var(--duration-fast)] ease-out motion-reduce:transition-none',
);

// Focus ring lives on the box, driven by :focus-visible on the (peer) input.
const BOX_FOCUS = cx(
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
  'peer-focus-visible:outline-(--color-accent)',
);

// Unchecked: surface fill with emphasized border; checked/indeterminate:
// accent fill and border. Row hover applies a tint-hover color-mix (Astryx
// source: 5%/20% unchecked, 15% checked).
const BOX_UNCHECKED = cx(
  'text-accent bg-surface border-border-strong',
  'group-hover/checkbox:[border-color:color-mix(in_srgb,var(--color-border-emphasized),var(--color-tint-hover)_20%)]',
  'group-hover/checkbox:[background-color:color-mix(in_srgb,var(--color-background-surface),var(--color-tint-hover)_5%)]',
);
const BOX_CHECKED = cx(
  'text-on-accent bg-accent-bg border-accent-bg',
  'group-hover/checkbox:[border-color:color-mix(in_srgb,var(--color-accent),var(--color-tint-hover)_15%)]',
  'group-hover/checkbox:[background-color:color-mix(in_srgb,var(--color-accent),var(--color-tint-hover)_15%)]',
);

const STATUS_CLASSES = {
  error: 'bg-error-muted',
  warning: 'bg-warning-muted',
  success: 'bg-success-muted',
};

/** Small spinner shown inside the box while busy; inherits the box foreground. */
const BoxSpinner = () => (
  <svg
    class="animate-spin motion-reduce:animate-none"
    width="12"
    height="12"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-opacity="0.25" stroke-width="2.5" />
    <path
      d="M14.5 8a6.5 6.5 0 0 0-6.5-6.5"
      stroke="currentColor"
      stroke-width="2.5"
      stroke-linecap="round"
    />
  </svg>
);

/**
 * CheckboxInput toggles a single on/off value using a real native
 * `<input type="checkbox">` (with indeterminate support) under a drawn box.
 *
 * Props (per the Astryx CheckboxInput spec, adapted to Solid):
 * @param {string} label - Label text (required; always rendered for accessibility).
 * @param {boolean|'indeterminate'} value - Checked, unchecked, or indeterminate
 *   (controlled; required). Indeterminate is exposed through the native
 *   `indeterminate` DOM property (authoritative; no redundant aria-checked).
 * @param {(checked: boolean, e: Event) => void} [onChange] - Fired when the state changes.
 * @param {(checked: boolean, e: Event) => void|Promise<void>} [changeAction] - Async
 *   action fired after onChange (unless prevented). Shows the optimistic value and a
 *   spinner until the promise settles.
 * @param {boolean} [isLoading=false] - Loading state: spinner, aria-busy, interaction blocked.
 * @param {boolean} [isLabelHidden=false] - Visually hide the label (kept accessible).
 * @param {string} [description] - Description below the label; linked via aria-describedby.
 * @param {boolean} [isDisabled=false] - Disables the checkbox (dimmed).
 * @param {string} [disabledMessage] - With isDisabled, keeps the checkbox focusable via
 *   aria-disabled and exposes the reason through aria-describedby. Toggling stays blocked.
 * @param {boolean} [isReadOnly=false] - Shows the current state at full opacity but
 *   prevents interaction; sets aria-readonly.
 * @param {boolean} [isOptional=false] - Shows an "(optional)" hint. Exclusive with isRequired.
 * @param {boolean} [isRequired=false] - Marks required (asterisk + required attribute).
 * @param {'sm'|'md'} [size='md'] - Checkbox size (sm for compact layouts).
 * @param {string} [color] - Per-item user color (any CSS color string) applied via inline
 *   style: border color always, background when checked/indeterminate. DOCUMENTED TOKEN
 *   EXCEPTION so Phase 4 task rows can pass user colors through. Omit for the token accent.
 * @param {{type: 'error'|'warning'|'success', message: string}} [status] - Validation
 *   message box below the checkbox; error sets aria-invalid.
 * @param {(e: FocusEvent) => void} [onFocus] - Focus callback.
 * @param {(e: FocusEvent) => void} [onBlur] - Blur callback.
 * @param {import('solid-js').JSX.Element} [labelIcon] - Icon rendered before the label text.
 * @param {string} [class] - Extra classes merged onto the field root.
 * Remaining props (name, form, ref, aria-*, ...) are spread onto the `<input>`.
 */
export function CheckboxInput(props) {
  const merged = mergeProps(
    {
      isLabelHidden: false,
      isLoading: false,
      isDisabled: false,
      isReadOnly: false,
      isOptional: false,
      isRequired: false,
      size: 'md',
    },
    props,
  );
  const [local, rest] = splitProps(merged, [
    'label',
    'value',
    'onChange',
    'changeAction',
    'isLoading',
    'isLabelHidden',
    'description',
    'isDisabled',
    'disabledMessage',
    'isReadOnly',
    'isOptional',
    'isRequired',
    'size',
    'color',
    'status',
    'onFocus',
    'onBlur',
    'labelIcon',
    'class',
  ]);

  const id = createUniqueId();
  const descriptionId = createUniqueId();
  const statusMessageId = createUniqueId();
  const disabledMessageId = createUniqueId();

  // Optimistic value while a changeAction is pending (mirrors React useOptimistic):
  // null = no pending action, boolean = the optimistic checked state.
  const [pendingValue, setPendingValue] = createSignal(null);
  let actionId = 0;
  let inputEl;

  const displayedValue = () => (pendingValue() !== null ? pendingValue() : local.value);
  const isChecked = () => displayedValue() === true;
  const isIndeterminate = () => displayedValue() === 'indeterminate';
  const isCheckedOrIndeterminate = () => isChecked() || isIndeterminate();
  const isBusy = () => local.isLoading || pendingValue() !== null;
  // With a disabledMessage the input stays focusable via aria-disabled so the
  // reason is keyboard-discoverable; toggling is blocked in handleChange.
  const showsDisabledMessage = () => local.isDisabled && !!local.disabledMessage;

  // The native `indeterminate` DOM property can't be set as a JSX attribute;
  // keep it in sync with the displayed value.
  createEffect(() => {
    if (inputEl) inputEl.indeterminate = isIndeterminate();
  });

  const describedBy = () =>
    cx(
      local.description && !local.isLabelHidden && descriptionId,
      local.status?.message && statusMessageId,
      showsDisabledMessage() && disabledMessageId,
    ) || undefined;

  const handleChange = (e) => {
    const input = e.currentTarget;
    if (local.isDisabled || isBusy() || local.isReadOnly) {
      input.checked = isChecked();
      input.indeterminate = isIndeterminate();
      return;
    }
    const checked = input.checked;
    if (typeof local.onChange === 'function') local.onChange(checked, e);
    if (local.changeAction && !e.defaultPrevented) {
      const thisAction = ++actionId;
      setPendingValue(checked);
      Promise.resolve()
        .then(() => local.changeAction(checked, e))
        .finally(() => {
          if (thisAction === actionId) setPendingValue(null);
        });
    }
    // Controlled input: re-sync the DOM to the (possibly optimistic) value so
    // the checkbox never drifts from the `value` prop.
    input.checked = isChecked();
    input.indeterminate = isIndeterminate();
  };

  // Documented token exception: per-item user color via inline style.
  // Inline style wins over the hover color-mix classes, which is intended.
  const boxStyle = () => {
    if (!local.color || local.isDisabled) return undefined;
    return isCheckedOrIndeterminate()
      ? { 'border-color': local.color, 'background-color': local.color }
      : { 'border-color': local.color };
  };

  return (
    <div class={cx('astryx-checkbox-input', local.class)} data-size={local.size}>
      <div
        class={cx(
          'group/checkbox flex items-center',
          local.isLabelHidden ? 'gap-0' : 'gap-2',
        )}
      >
        <span
          class={cx(
            'relative flex items-center justify-center shrink-0 isolate',
            WRAPPER_SIZE[local.size],
          )}
        >
          <input
            {...rest}
            ref={inputEl}
            id={id}
            type="checkbox"
            checked={isChecked()}
            disabled={local.isDisabled && !showsDisabledMessage()}
            aria-disabled={showsDisabledMessage() ? 'true' : undefined}
            readonly={local.isReadOnly || undefined}
            aria-readonly={local.isReadOnly || undefined}
            required={local.isRequired || undefined}
            aria-describedby={describedBy()}
            aria-invalid={local.status?.type === 'error' ? 'true' : undefined}
            aria-busy={isBusy() || undefined}
            data-size={local.size}
            onChange={handleChange}
            onFocus={local.onFocus}
            onBlur={local.onBlur}
            class={cx(
              'peer absolute m-0 p-0 opacity-0 z-1 cursor-pointer',
              WRAPPER_SIZE[local.size],
              local.isDisabled && 'cursor-not-allowed',
              local.isReadOnly && !local.isDisabled && 'cursor-default',
              isBusy() && 'pointer-events-none',
            )}
          />
          <span
            aria-hidden="true"
            data-checked={isChecked() ? '' : isIndeterminate() ? 'indeterminate' : undefined}
            data-disabled={local.isDisabled ? '' : undefined}
            style={boxStyle()}
            class={cx(
              BOX_BASE,
              BOX_SIZE[local.size],
              !local.isDisabled && BOX_FOCUS,
              isCheckedOrIndeterminate() ? BOX_CHECKED : BOX_UNCHECKED,
              local.isDisabled &&
                'opacity-50 border-border group-hover/checkbox:[border-color:var(--color-border)]',
              local.isDisabled &&
                !isCheckedOrIndeterminate() &&
                'bg-muted group-hover/checkbox:[background-color:var(--color-background-muted)]',
            )}
          >
            <Show
              when={!isBusy()}
              fallback={<BoxSpinner />}
            >
              <Show when={isChecked()}>
                <svg viewBox="0 0 10 10" class={CHECKMARK_SIZE[local.size]} aria-hidden="true">
                  <path
                    d="M8.5 2.5L4 7.5L1.5 5"
                    stroke="currentColor"
                    stroke-width="1.5"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>
              </Show>
              <Show when={isIndeterminate()}>
                <span class={cx('bg-on-accent rounded-[1px]', DASH_SIZE[local.size])} />
              </Show>
            </Show>
          </span>
          <Show when={isBusy()}>
            <span class="sr-only" role="status">
              Loading
            </span>
          </Show>
        </span>
        <span class="flex flex-col gap-0.5">
          <label
            for={id}
            class={cx(
              'inline-flex items-center gap-1 font-medium',
              local.size === 'sm' ? 'text-sm' : 'text-base',
              local.isDisabled ? 'text-disabled cursor-not-allowed' : 'text-primary cursor-pointer',
              local.isReadOnly && !local.isDisabled && 'cursor-default',
              local.isLabelHidden && 'sr-only',
            )}
          >
            <Show when={local.labelIcon}>
              <span class="inline-flex items-center justify-center shrink-0 size-4">
                {local.labelIcon}
              </span>
            </Show>
            {local.label}
            <Show when={local.isRequired}>
              <span aria-hidden="true" class="text-error">
                *
              </span>
            </Show>
            <Show when={local.isOptional && !local.isRequired}>
              <span class="text-secondary font-normal text-sm">(optional)</span>
            </Show>
          </label>
          <Show when={local.description && !local.isLabelHidden}>
            <span id={descriptionId} class="text-sm text-secondary">
              {local.description}
            </span>
          </Show>
        </span>
      </div>
      <Show when={local.status?.message}>
        <div
          id={statusMessageId}
          data-status-type={local.status.type}
          class={cx(
            'mt-2 rounded-md px-3 py-2 text-sm text-primary',
            STATUS_CLASSES[local.status.type],
          )}
        >
          {local.status.message}
        </div>
      </Show>
      <Show when={showsDisabledMessage()}>
        {/* Tooltip rendering is out of scope for this kit slice; the reason is
            still exposed to AT through aria-describedby. */}
        <span id={disabledMessageId} class="sr-only">
          {local.disabledMessage}
        </span>
      </Show>
    </div>
  );
}
