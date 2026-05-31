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
    <div style={{
      "position": "fixed", "top": "0", "left": "0", "right": "0", "bottom": "0",
      "background": "rgba(0,0,0,0.8)", "backdrop-filter": "blur(8px)",
      "display": "flex", "align-items": "center", "justify-content": "center",
      "z-index": "10000"
    }}>
      <div style={{
        "background": "#1A1A1A", "width": "100%", "max-width": "480px",
        "border-radius": "20px", "padding": "40px", "text-align": "center",
        "border": "1px solid #333", "color": "#F3F3F3"
      }}>
        <div style={{ "display": "flex", "justify-content": "center", "gap": "8px", "margin-bottom": "32px" }}>
          <div style={{ "width": "30px", "height": "4px", "border-radius": "2px", "background": step() >= 1 ? "#E8942A" : "#333" }}></div>
          <div style={{ "width": "30px", "height": "4px", "border-radius": "2px", "background": step() >= 2 ? "#E8942A" : "#333" }}></div>
          <div style={{ "width": "30px", "height": "4px", "border-radius": "2px", "background": step() >= 3 ? "#E8942A" : "#333" }}></div>
        </div>

        {step() === 1 && (
          <div>
            <h2 style={{ "margin-bottom": "16px", "font-size": "24px" }}>Welcome to Sequent</h2>
            <p style={{ "color": "#888", "line-height": "1.6", "margin-bottom": "32px" }}>
              Sequent is your unified timeline for everything. We combine your tasks, calendar events, and reminders into one seamless flow.
            </p>
          </div>
        )}

        {step() === 2 && (
          <div>
            <h2 style={{ "margin-bottom": "16px", "font-size": "24px" }}>Offline First</h2>
            <p style={{ "color": "#888", "line-height": "1.6", "margin-bottom": "32px" }}>
              Your data is instantly available, even without an internet connection. Make changes offline, and Sequent will sync them to the cloud automatically when you reconnect.
            </p>
          </div>
        )}

        {step() === 3 && (
          <div>
            <h2 style={{ "margin-bottom": "16px", "font-size": "24px" }}>Let's Get Started</h2>
            <p style={{ "color": "#888", "line-height": "1.6", "margin-bottom": "32px" }}>
              Ready to take control of your time? You can switch between Timeline, Calendar, and Lists views using the sidebar.
            </p>
          </div>
        )}

        <button 
          onClick={handleNext}
          style={{
            "width": "100%", "padding": "14px", "border-radius": "12px",
            "background": "#E8942A", "color": "#fff", "font-weight": "700",
            "border": "none", "cursor": "pointer", "font-size": "16px"
          }}
        >
          {step() === 3 ? "Dive In" : "Continue"}
        </button>
      </div>
    </div>
  );
}

export default OnboardingModal;
