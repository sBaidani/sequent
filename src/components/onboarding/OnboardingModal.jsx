import { createSignal } from 'solid-js';
import { uiStore } from '../../stores/uiStore';

function OnboardingModal() {
  const [step, setStep] = createSignal(1);

  const handleNext = () => {
    if (step() === 3) {
      uiStore.completeOnboarding();
    } else {
      setStep(step() + 1);
    }
  };

  return (
    <div class="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-[10000]">
      <div class="bg-[#1A1A1A] w-full max-w-[480px] rounded-[20px] p-10 text-center border border-[#333] text-[#F3F3F3] shadow-2xl">
        <div class="flex justify-center gap-2 mb-8">
          <div class={`w-8 h-1 rounded-full transition-colors ${step() >= 1 ? 'bg-accent' : 'bg-[#333]'}`}></div>
          <div class={`w-8 h-1 rounded-full transition-colors ${step() >= 2 ? 'bg-accent' : 'bg-[#333]'}`}></div>
          <div class={`w-8 h-1 rounded-full transition-colors ${step() >= 3 ? 'bg-accent' : 'bg-[#333]'}`}></div>
        </div>

        {step() === 1 && (
          <div>
            <h2 class="mb-4 text-2xl font-bold text-white">Welcome to Sequent</h2>
            <p class="text-[#888] leading-relaxed mb-8">
              Sequent is your unified timeline for everything. We combine your tasks, calendar events, and reminders into one seamless flow.
            </p>
          </div>
        )}

        {step() === 2 && (
          <div>
            <h2 class="mb-4 text-2xl font-bold text-white">Offline First</h2>
            <p class="text-[#888] leading-relaxed mb-8">
              Your data is instantly available, even without an internet connection. Make changes offline, and Sequent will sync them to the cloud automatically when you reconnect.
            </p>
          </div>
        )}

        {step() === 3 && (
          <div>
            <h2 class="mb-4 text-2xl font-bold text-white">Let's Get Started</h2>
            <p class="text-[#888] leading-relaxed mb-8">
              Ready to take control of your time? You can switch between Timeline, Calendar, and Lists views using the sidebar.
            </p>
          </div>
        )}

        <button 
          onClick={handleNext}
          class="w-full p-3.5 rounded-xl bg-accent text-white font-bold border-none cursor-pointer text-base hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20"
        >
          {step() === 3 ? "Dive In" : "Continue"}
        </button>
      </div>
    </div>
  );
}

export default OnboardingModal;
