/**
 * Modal — DEPRECATED thin adapter over the kit Dialog (Phase 4).
 *
 * Preserves the legacy id/uiStore contract for any remaining call sites:
 * the modal is open while `uiStore.state.activeModal === props.id`, and
 * every dismiss path calls `uiStore.setActiveModal(null)`.
 *
 * All in-repo call sites have been migrated to compose the kit Dialog
 * (Dialog/DialogHeader/DialogBody/DialogFooter from '../kit') directly.
 * New code should do the same; do not add new usages of this adapter.
 *
 * Contract changes vs the old hand-rolled Modal (inherited from Dialog):
 * Escape now closes, the close button (rendered by DialogHeader) has
 * aria-label="Close", and the panel is a proper role="dialog" with a
 * focus trap. The click-origin spring animation was retired.
 *
 * @param {object} props
 * @param {string} props.id - Modal id matched against uiStore.state.activeModal.
 * @param {boolean} [props.wide] - 850px panel (Dialog size="lg").
 * @param {boolean} [props.compact] - 400px panel (Dialog size="sm").
 * @param {import('solid-js').JSX.Element} props.children - Dialog content,
 *   typically DialogHeader + DialogBody + optional DialogFooter.
 */
import { Dialog } from '../kit';
import { uiStore } from '../../stores/uiStore';

function Modal(props) {
  return (
    <Dialog
      open={uiStore.state.activeModal === props.id}
      onClose={() => uiStore.setActiveModal(null)}
      size={props.wide ? 'lg' : props.compact ? 'sm' : 'md'}
    >
      {props.children}
    </Dialog>
  );
}

export default Modal;
