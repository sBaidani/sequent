// ToastProvider — Phase 4 migration onto the kit (Astryx spec).
// Renders the toastStore stack through kit ToastRegion + Toast. The store
// contract is unchanged: toastStore.add(message, type = 'success', duration)
// owns each toast's lifetime via its own timer, so kit auto-hide is disabled
// (isAutoHide={false}) and removal stays on the store's clock. The kit dismiss
// button routes manual dismissal through toastStore.remove(id).
import { For } from 'solid-js';
import { toastStore } from '../../stores/toastStore';
import { Toast, ToastRegion } from '../kit';

function ToastProvider() {
  return (
    <ToastRegion>
      <For each={toastStore.state.toasts}>
        {(toast) => (
          <Toast
            message={toast.message}
            type={toast.type}
            isAutoHide={false}
            onDismiss={() => toastStore.remove(toast.id)}
          />
        )}
      </For>
    </ToastRegion>
  );
}

export default ToastProvider;
