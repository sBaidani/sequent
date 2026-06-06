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
    <div class="fixed inset-0 bg-bg-theme/80 backdrop-blur-md flex items-center justify-center z-[10000]">
      <div class="bg-modal-bg w-full max-w-[480px] rounded-[20px] p-10 text-center border border-border-theme text-text-primary shadow-2xl">
        <div class="flex gap-2 justify-center mb-8">
          <div class={`w-8 h-1 rounded-full transition-colors ${step() >= 1 ? 'bg-accent' : 'bg-text-primary/20'}`} />
          <div class={`w-8 h-1 rounded-full transition-colors ${step() >= 2 ? 'bg-accent' : 'bg-text-primary/20'}`} />
          <div class={`w-8 h-1 rounded-full transition-colors ${step() >= 3 ? 'bg-accent' : 'bg-text-primary/20'}`} />
        </div>

        {step() === 1 && (
          <div>
            <h2 class="font-display lowercase mb-4 text-2xl font-bold text-text-primary">Welcome to Sequent</h2>
            <p class="text-[#888] leading-relaxed mb-8">
              Sequent is your unified timeline for everything. We combine your tasks, calendar events, and reminders into one seamless flow.
            </p>
          </div>
        )}

        {step() === 2 && (
          <div>
            <h2 class="font-display lowercase mb-4 text-2xl font-bold text-text-primary">Offline First</h2>
            <p class="text-[#888] leading-relaxed mb-8">
              Your data is instantly available, even without an internet connection. Make changes offline, and Sequent will sync them to the cloud automatically when you reconnect.
            </p>
          </div>
        )}

        {step() === 3 && (
          <div>
            <h2 class="font-display lowercase mb-4 text-2xl font-bold text-text-primary">Let's Get Started</h2>
            <p class="text-[#888] leading-relaxed mb-8">
              Ready to take control of your time? You can switch between Timeline, Calendar, and Lists views using the sidebar.
            </p>
          </div>
        )}

        <button 
          onClick={handleNext}
          class="w-full p-3.5 rounded-xl bg-accent text-text-primary font-bold border-none cursor-pointer text-base hover:bg-accent/80 transition-colors shadow-lg shadow-accent/20"
        >
          {step() === 3 ? "Dive In" : "Continue"}
        </button>
      </div>
    </div>
  );
}

export default OnboardingModal;
