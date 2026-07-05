import { createSignal, For } from 'solid-js';
import { Dialog, DialogHeader, DialogBody, DialogFooter, Text, Button, cx } from '../kit';
import { uiStore } from '../../stores/uiStore';

const STEPS = [
  {
    title: 'Welcome to Sequent',
    body: 'Sequent is your unified timeline for everything. We combine your tasks, calendar events, and reminders into one seamless flow.',
  },
  {
    title: 'Offline First',
    body: 'Your data is instantly available, even without an internet connection. Make changes offline, and Sequent will sync them to the cloud automatically when you reconnect.',
  },
  {
    title: "Let's Get Started",
    body: 'Ready to take control of your time? You can switch between Timeline, Calendar, and Lists views using the sidebar.',
  },
];

function OnboardingModal() {
  const [step, setStep] = createSignal(1);

  const handleNext = () => {
    if (step() === STEPS.length) {
      uiStore.completeOnboarding();
    } else {
      setStep(step() + 1);
    }
  };

  return (
    <Dialog
      open={!uiStore.state.hasSeenOnboarding}
      // Dismissing (Escape / backdrop / close button) skips the remaining
      // steps — completing onboarding was already the only way out.
      onClose={() => uiStore.completeOnboarding()}
      size="sm"
    >
      <DialogHeader title={STEPS[step() - 1].title} hasDivider={false} />
      <DialogBody class="flex flex-col gap-4">
        <div class="flex justify-center gap-2" role="progressbar" aria-label="Onboarding progress" aria-valuemin="1" aria-valuemax={STEPS.length} aria-valuenow={step()}>
          <For each={STEPS}>{(_, i) => (
            <div
              class={cx(
                'h-1 w-8 rounded-full transition-colors',
                step() >= i() + 1 ? 'bg-accent-bg' : 'bg-neutral',
              )}
            />
          )}</For>
        </div>
        <Text as="p" color="secondary" class="leading-relaxed">
          {STEPS[step() - 1].body}
        </Text>
      </DialogBody>
      <DialogFooter hasDivider={false}>
        <Button
          variant="primary"
          class="w-full"
          onClick={handleNext}
          label={step() === STEPS.length ? 'Dive In' : 'Continue'}
        />
      </DialogFooter>
    </Dialog>
  );
}

export default OnboardingModal;
