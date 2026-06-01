import { For } from 'solid-js';
import { toastStore } from '../../stores/toastStore';

function ToastProvider() {
  return (
    <div class="fixed bottom-6 right-6 flex flex-col gap-3 z-[9999] pointer-events-none">
      <For each={toastStore.state.toasts}>
        {(toast) => (
          <div class={`text-white px-5 py-3 rounded-xl shadow-[0_8px_24px_rgba(0,0,0,0.3)] border border-white/10 text-sm font-semibold pointer-events-auto animate-[slideInRight_0.3s_cubic-bezier(0.175,0.885,0.32,1.275)] ${toast.type === 'error' ? 'bg-[#ff4d4f]' : 'bg-[#222]'}`}>
            {toast.message}
          </div>
        )}
      </For>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default ToastProvider;
