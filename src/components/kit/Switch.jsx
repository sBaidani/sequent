// Kit Switch — SolidJS re-implementation of Astryx Switch.
// Spec: `npx astryx component Switch`; React source studied via
// `npx astryx swizzle Switch` (scratch/swizzle-switch).
// Geometry is fixed by the spec (40x24 track, 16/20px thumb, 4px track
// padding, 14px travel) and expressed through the token-backed Tailwind
// spacing scale (4px base): w-10/h-6/p-1/size-4/size-5/translate-x-3.5.
// All colors/radii/durations are Astryx tokens via the Tailwind bridge or
// var(--*) custom properties.
import { createSignal, createUniqueId, splitProps, mergeProps, Show } from 'solid-js';
import { cx } from './cx';

const TRACK_BASE = cx(
  'astryx-switch flex items-center w-10 h-6 p-1 box-border rounded-full',
  'transition-colors duration-[var(--duration-fast)] ease-out motion-reduce:transition-none',
);

// Focus ring lives on the track, driven by :focus-visible on the (peer) input.
const TRACK_FOCUS = cx(
  'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2',
  'peer-focus-visible:outline-(--color-accent)',
);

// Off/on track colors per the Astryx source: gray background off, accent on,
// with a tint-hover color-mix on row hover (5% off / 15% on).
const TRACK_OFF = cx(
  'bg-gray-subtle',
  'group-hover/switch:[background-color:color-mix(in_srgb,var(--color-background-gray),var(--color-tint-hover)_5%)]',
);
const TRACK_ON = cx(
  'bg-accent-bg',
  'group-hover/switch:[background-color:color-mix(in_srgb,var(--color-accent),var(--color-tint-hover)_15%)]',
);

const THUMB_BASE = cx(
  'astryx-switch-thumb flex items-center justify-center rounded-full bg-surface',
  'transition-[transform,width,height] duration-[var(--duration-fast)] ease-out',
  'motion-reduce:transition-none',
);

const STATUS_CLASSES = {
  error: 'bg-error-muted',
  warning: 'bg-warning-muted',
  success: 'bg-success-muted',
};

/** Small spinner shown inside the thumb while busy; accent on the surface thumb. */
const ThumbSpinner = () => (
  <svg
    class="animate-spin motion-reduce:animate-none text-accent"
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
 * Switch — a toggle control for on/off states that take effect immediately.
 * Renders a real `<input type="checkbox" role="switch">` under the hood.
 *
 * Props (per the Astryx Switch spec, adapted to Solid):
 * @param {string} label - Label text (required; always rendered for accessibility).
 * @param {boolean} value - Whether the switch is on (controlled; required).
 * @param {(checked: boolean, e: Event) => void} [onChange] - Fired when the state changes.
 * @param {(checked: boolean, e: Event) => void|Promise<void>} [changeAction] - Async
 *   action fired after onChange (unless prevented). Shows the optimistic value and a
 *   thumb spinner until the promise settles.
 * @param {boolean} [isLoading=false] - Loading state: spinner in the thumb, aria-busy,
 *   interaction blocked.
 * @param {boolean} [isLabelHidden=false] - Visually hide the label (kept accessible).
 * @param {string} [description] - Description text below the label; linked via
 *   aria-describedby. Hidden together with the label when isLabelHidden.
 * @param {boolean} [isDisabled=false] - Disables the switch.
 * @param {string} [disabledMessage] - With isDisabled, keeps the switch focusable via
 *   aria-disabled and exposes the reason through aria-describedby. Toggling stays blocked.
 * @param {boolean} [isOptional=false] - Shows an "(optional)" hint. Exclusive with isRequired.
 * @param {boolean} [isRequired=false] - Marks required (asterisk + required attribute).
 * @param {{type: 'error'|'warning'|'success', message: string}} [status] - Validation
 *   message box below the switch; error sets aria-invalid.
 * @param {(e: FocusEvent) => void} [onFocus] - Focus callback.
 * @param {(e: FocusEvent) => void} [onBlur] - Blur callback.
 * @param {import('solid-js').JSX.Element} [labelIcon] - Icon rendered before the label text.
 * @param {'start'|'end'} [labelPosition='end'] - Which side of the switch the label is on.
 * @param {'default'|'spread'} [labelSpacing='default'] - 'spread' pushes label and switch
 *   to opposite ends of a full-width row.
 * @param {string} [class] - Extra classes merged onto the field root.
 * Remaining props (name, form, ref, aria-*, ...) are spread onto the `<input>`.
 */
export function Switch(props) {
  const merged = mergeProps(
    {
      isLabelHidden: false,
      isLoading: false,
      isDisabled: false,
      isOptional: false,
      isRequired: false,
      labelPosition: 'end',
      labelSpacing: 'default',
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
    'isOptional',
    'isRequired',
    'status',
    'onFocus',
    'onBlur',
    'labelIcon',
    'labelPosition',
    'labelSpacing',
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

  const isOn = () => (pendingValue() !== null ? pendingValue() : local.value === true);
  const isBusy = () => local.isLoading || pendingValue() !== null;
  // With a disabledMessage the input stays focusable via aria-disabled so the
  // reason is keyboard-discoverable; toggling is blocked in handleChange.
  const showsDisabledMessage = () => local.isDisabled && !!local.disabledMessage;

  const describedBy = () =>
    cx(
      local.description && !local.isLabelHidden && descriptionId,
      local.status?.message && statusMessageId,
      showsDisabledMessage() && disabledMessageId,
    ) || undefined;

  const handleChange = (e) => {
    const input = e.currentTarget;
    if (local.isDisabled || isBusy()) {
      input.checked = isOn();
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
    input.checked = isOn();
  };

  // Space is native checkbox behavior; Enter is added per the switch keyboard
  // contract. Both are normalized through a synthetic click so keydown is
  // deterministic (preventDefault stops scroll and double activation on keyup).
  const handleKeyDown = (e) => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      if (!local.isDisabled && !isBusy()) e.currentTarget.click();
    }
  };

  const switchElement = (
    <span class="relative flex items-center shrink-0 w-10 h-6 isolate">
      <input
        {...rest}
        id={id}
        type="checkbox"
        role="switch"
        checked={isOn()}
        aria-checked={isOn() ? 'true' : 'false'}
        disabled={local.isDisabled && !showsDisabledMessage()}
        aria-disabled={showsDisabledMessage() ? 'true' : undefined}
        required={local.isRequired || undefined}
        aria-describedby={describedBy()}
        aria-invalid={local.status?.type === 'error' ? 'true' : undefined}
        aria-busy={isBusy() || undefined}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onFocus={local.onFocus}
        onBlur={local.onBlur}
        class={cx(
          'peer absolute m-0 p-0 opacity-0 z-1 w-10 h-6 cursor-pointer',
          local.isDisabled && 'cursor-not-allowed',
          isBusy() && 'pointer-events-none',
        )}
      />
      <span
        aria-hidden="true"
        data-checked={isOn() ? '' : undefined}
        data-disabled={local.isDisabled ? '' : undefined}
        class={cx(
          TRACK_BASE,
          isOn() ? TRACK_ON : TRACK_OFF,
          !local.isDisabled && TRACK_FOCUS,
          local.isDisabled && 'opacity-50',
          local.isDisabled && !isOn() && 'bg-gray-subtle',
        )}
      >
        <span
          data-checked={isOn() ? '' : undefined}
          class={cx(THUMB_BASE, isOn() ? 'size-5 translate-x-3.5' : 'size-4 translate-x-0')}
        >
          <Show when={isBusy()}>
            <ThumbSpinner />
          </Show>
        </span>
      </span>
      <Show when={isBusy()}>
        <span class="sr-only" role="status">
          Loading
        </span>
      </Show>
    </span>
  );

  const labelElement = (
    <span class="flex flex-col gap-0.5 justify-center min-h-6">
      <label
        for={id}
        class={cx(
          'inline-flex items-center gap-1 text-base font-medium',
          local.isDisabled ? 'text-disabled cursor-not-allowed' : 'text-primary cursor-pointer',
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
  );

  return (
    <div
      class={cx('astryx-switch-field', local.class)}
      data-label-position={local.labelPosition !== 'end' ? local.labelPosition : undefined}
      data-label-spacing={local.labelSpacing !== 'default' ? local.labelSpacing : undefined}
    >
      <div
        class={cx(
          'group/switch flex items-center gap-2',
          local.labelSpacing === 'spread' && 'justify-between w-full',
        )}
      >
        <Show
          when={local.labelPosition === 'start'}
          fallback={
            <>
              {switchElement}
              {labelElement}
            </>
          }
        >
          {labelElement}
          {switchElement}
        </Show>
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
