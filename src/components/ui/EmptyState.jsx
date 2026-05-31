import { Show } from 'solid-js';

function EmptyState(props) {
  return (
    <div style={{
      "display": "flex", "flex-direction": "column", "align-items": "center",
      "justify-content": "center", "padding": "32px 16px", "text-align": "center",
      "color": "#888", "width": "100%", "opacity": "0.7"
    }}>
      <Show when={props.type === 'tasks'}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style={{ "margin-bottom": "16px", "color": "#52c41a" }}>
          <path d="M9 11l3 3L22 4"></path>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
        </svg>
      </Show>
      <Show when={props.type === 'timeline'}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style={{ "margin-bottom": "16px", "color": "#E8942A" }}>
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 6v6l4 2"></path>
        </svg>
      </Show>
      <Show when={props.type === 'calendar'}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style={{ "margin-bottom": "16px", "color": "#1FA7A7" }}>
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </Show>
      <p style={{ "font-size": "14px", "font-weight": "500", "margin": "0" }}>{props.message || "Nothing here yet"}</p>
    </div>
  );
}

export default EmptyState;
