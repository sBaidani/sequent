import { Show, createSignal } from 'solid-js';
import { uiStore } from '../../stores/uiStore';

function Modal(props) {
  let overlayRef;
  const [touchStart, setTouchStart] = createSignal(null);
  const [touchDelta, setTouchDelta] = createSignal(0);
  
  const handleOverlayClick = (e) => {
    if (e.target === overlayRef) {
      uiStore.setActiveModal(null);
    }
  };

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientY);
    setTouchDelta(0);
  };

  const handleTouchMove = (e) => {
    if (touchStart() === null) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - touchStart();
    if (diff > 0) {
      // Only allow dragging downwards
      setTouchDelta(diff);
    }
  };

  const handleTouchEnd = () => {
    if (touchDelta() > 100) {
      uiStore.setActiveModal(null);
    }
    setTouchStart(null);
    setTouchDelta(0);
  };

  return (
    <Show when={uiStore.state.activeModal === props.id}>
      <div 
        id={props.id}
        class="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 opacity-100 transition-opacity" 
        ref={overlayRef} 
        onClick={handleOverlayClick}
        style={{
          "--click-x": `${uiStore.state.clickCoords.x}px`,
          "--click-y": `${uiStore.state.clickCoords.y}px`,
          "animation": "clipExpand 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.1) forwards"
        }}
      >
        <div 
          class={`bg-card w-full max-w-[100vw] rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden relative modal-pop-in ${props.compact ? 'sm:w-[400px]' : 'sm:w-[500px]'}`}
          style={{
            "transform": `translateY(${touchDelta()}px)`,
            "transition": touchStart() === null ? "transform 0.3s ease-out" : "none"
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div class="flex items-center justify-between p-4 pb-0 mb-4 cursor-grab active:cursor-grabbing">
            <div class="w-12 h-1.5 bg-white/20 rounded-full mx-auto sm:hidden mb-4"></div>
            <button class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 text-white/50 hover:bg-white/20 hover:text-white transition-colors cursor-pointer border-none absolute right-4 top-4" onClick={() => uiStore.setActiveModal(null)}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div class="px-6 pb-6">
            {props.children}
          </div>
        </div>
      </div>
    </Show>
  );
}

export default Modal;
