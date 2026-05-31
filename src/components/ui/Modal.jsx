import { Show, createSignal, onMount } from 'solid-js';
import { uiStore } from '../../stores/uiStore';

function Modal(props) {
  let overlayRef;
  
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef) {
      uiStore.setActiveModal(null);
    }
  };

  return (
    <Show when={uiStore.state.activeModal === props.id}>
      <div 
        id={props.id}
        class="modal-overlay" 
        ref={overlayRef} 
        onClick={handleOverlayClick}
      >
        <div class={`modal-sheet ${props.compact ? 'modal-sheet--compact' : ''}`}>
          <div class="modal-top-bar">
            <div class="modal-drag-handle"></div>
            <button class="modal-close" onClick={() => uiStore.setActiveModal(null)}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div style={{ "padding": "0 24px 24px" }}>
            {props.children}
          </div>
        </div>
      </div>
    </Show>
  );
}

export default Modal;
