import { For } from 'solid-js';
import { toastStore } from '../../stores/toastStore';

function ToastProvider() {
  return (
    <div style={{
      "position": "fixed",
      "bottom": "24px",
      "right": "24px",
      "display": "flex",
      "flex-direction": "column",
      "gap": "12px",
      "z-index": "9999",
      "pointer-events": "none"
    }}>
      <For each={toastStore.state.toasts}>
        {(toast) => (
          <div style={{
            "background": toast.type === 'error' ? '#ff4d4f' : '#222',
            "color": "#fff",
            "padding": "12px 20px",
            "border-radius": "12px",
            "box-shadow": "0 8px 24px rgba(0,0,0,0.3)",
            "border": "1px solid rgba(255,255,255,0.1)",
            "font-size": "14px",
            "font-weight": "600",
            "pointer-events": "all",
            "animation": "slideInRight 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)"
          }}>
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
