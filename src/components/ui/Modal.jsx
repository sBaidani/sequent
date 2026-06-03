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
        class="absolute inset-0 bg-bg-theme/60 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 opacity-100 transition-opacity" 
        ref={overlayRef} 
        onClick={handleOverlayClick}
        style={{
          "animation": "overlayFadeIn 0.2s ease-out forwards"
        }}
      >
        <div 
          class={`bg-modal-bg backdrop-blur-3xl border-t sm:border border-border-theme w-full max-w-[100vw] rounded-t-2xl sm:rounded-2xl relative modal-pop-in ${props.wide ? 'sm:w-[850px] max-w-full' : (props.compact ? 'sm:w-[400px]' : 'sm:w-[500px]')}`}
          style={{
            "box-shadow": "0 32px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08), 0 0 120px -20px color-mix(in srgb, var(--color-accent) 40%, transparent)",
            "transform": `translateY(${touchDelta()}px)`,
            "transition": touchStart() === null ? "transform 0.3s ease-out" : "none"
          }}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div class="flex items-center justify-between p-4 pb-0 mb-4 cursor-grab active:cursor-grabbing">
            <div class="w-12 h-1.5 bg-text-primary/20 rounded-full mx-auto sm:hidden mb-4"></div>
            <button class="w-8 h-8 flex items-center justify-center rounded-full bg-text-primary/10 text-text-primary/50 hover:bg-text-primary/20 hover:text-text-primary transition-colors cursor-pointer border-none absolute right-4 top-4" onClick={() => uiStore.setActiveModal(null)}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
            </button>
          </div>
          
          <div class={props.noPadding ? '' : 'px-6 pb-6'}>
            {props.children}
          </div>
        </div>
      </div>
    </Show>
  );
}

export default Modal;
