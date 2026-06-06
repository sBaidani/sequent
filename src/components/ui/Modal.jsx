import { Show, createSignal } from 'solid-js';
import { Transition } from 'solid-transition-group';
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
    <Transition
      onEnter={(el, done) => {
        const { x, y } = uiStore.state.clickCoords;
        const content = el.querySelector('.modal-content');
        if (content) {
          const rect = content.getBoundingClientRect();
          const originX = x - rect.left;
          const originY = y - rect.top;
          content.style.transformOrigin = `${originX}px ${originY}px`;
          content.style.animation = "modalPopIn 0.5s var(--ease-spring-bouncy) forwards";
        }
        
        const anim = el.animate([{opacity: 0}, {opacity: 1}], {duration: 300, easing: 'ease-out', fill: 'forwards'});
        
        let contentDone = false;
        let overlayDone = false;
        const checkDone = () => { if (contentDone && overlayDone) done(); };
        
        anim.onfinish = () => { overlayDone = true; checkDone(); };
        if (content) {
          content.addEventListener('animationend', () => { contentDone = true; checkDone(); }, {once:true});
        } else {
          contentDone = true;
        }
      }}
      onExit={(el, done) => {
        const content = el.querySelector('.modal-content');
        if (content) {
          content.style.animation = "modalPopOut 0.4s var(--ease-spring-smooth) forwards";
        }
        const anim = el.animate([{opacity: 1}, {opacity: 0}], {duration: 300, easing: 'ease-in', fill: 'forwards'});
        
        let contentDone = false;
        let overlayDone = false;
        const checkDone = () => { if (contentDone && overlayDone) done(); };
        
        anim.onfinish = () => { overlayDone = true; checkDone(); };
        if (content) {
          content.addEventListener('animationend', () => { contentDone = true; checkDone(); }, {once:true});
        } else {
          contentDone = true;
        }
      }}
    >
      <Show when={uiStore.state.activeModal === props.id}>
        <div 
          id={props.id}
          class="absolute inset-0 bg-bg-theme/60 backdrop-blur-[2px] z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 opacity-100 transition-opacity" 
          ref={overlayRef} 
          onClick={handleOverlayClick}
        >
          <div 
            class={`modal-content bg-modal-bg backdrop-blur-3xl border-t sm:border border-border-theme w-full max-w-[100vw] rounded-t-2xl sm:rounded-2xl relative flex flex-col max-h-[90vh] ${props.wide ? 'sm:w-[850px] max-w-full' : (props.compact ? 'sm:w-[400px]' : 'sm:w-[500px]')}`}
            style={{
              "box-shadow": "0 32px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08), 0 0 120px -20px color-mix(in srgb, var(--color-accent) 40%, transparent)",
              "transform": `translateY(${touchDelta()}px)`,
              "transition": touchStart() === null ? "transform 0.3s ease-out" : "none"
            }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            <div class="flex items-center justify-between p-4 pb-0 mb-4 cursor-grab active:cursor-grabbing shrink-0">
              <div class="w-12 h-1.5 bg-text-primary/20 rounded-full mx-auto sm:hidden mb-4" />
              <button class="w-8 h-8 flex items-center justify-center rounded-full bg-text-primary/10 text-text-primary/50 hover:bg-text-primary/20 hover:text-text-primary transition-colors cursor-pointer border-none absolute right-4 top-4 z-50" onClick={() => uiStore.setActiveModal(null)}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" class="w-5 h-5"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div class={`flex-1 min-h-0 overflow-hidden ${props.noPadding ? 'flex flex-col' : 'px-6 pb-6 overflow-y-auto'}`}>
              {props.children}
            </div>
          </div>
        </div>
      </Show>
    </Transition>
  );
}

export default Modal;
