import { Show } from 'solid-js';

function EmptyState(props) {
  return (
    <div class="flex flex-col items-center justify-center py-8 px-4 text-center text-text-primary w-full opacity-90 drop-shadow-sm">
      <Show when={props.type === 'tasks'}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-4 text-[#52c41a]">
          <path d="M9 11l3 3L22 4"></path>
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
        </svg>
      </Show>
      <Show when={props.type === 'timeline'}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-4 text-accent">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M12 6v6l4 2"></path>
        </svg>
      </Show>
      <Show when={props.type === 'calendar'}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="mb-4 text-[#1FA7A7]">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
          <line x1="16" y1="2" x2="16" y2="6"></line>
          <line x1="8" y1="2" x2="8" y2="6"></line>
          <line x1="3" y1="10" x2="21" y2="10"></line>
        </svg>
      </Show>
      <p class="text-sm font-medium m-0">{props.message || "Nothing here yet"}</p>
    </div>
  );
}

export default EmptyState;
