// PomodoroWidget — focus/rest timer widget (Phase 4, kit-based).
// Retired here: unlabeled icon <button>s (kit IconButton — enforced aria-label,
// keyboard-visible skip button), raw #1FA7A7 rest color (teal hue token
// --color-border-teal), bg-white/NN + rgba() liquid-fill tints (accent/teal
// tokens via color-mix + --color-tint-hover so the shimmer adapts to light/
// dark), and off-scale text-[11px] type (token type scale). Section is the
// kit's sanctioned Card-equivalent for a dashboard widget like this one.
// The 60px widget height is existing fixed geometry and stays.
import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { settingsStore } from '../../stores/settingsStore';
import { IconButton, Section, Text, cx } from '../kit';

const PlayIcon = () => (
  <svg class="size-full translate-x-0.5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
);
const PauseIcon = () => (
  <svg class="size-full" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
);
const SkipIcon = () => (
  <svg class="size-full" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
);

// Liquid-fill colors per mode: focus follows the theme accent, rest uses the
// teal hue token. Both are 30% color-mix tints with a 40% leading edge, all
// token-derived (no raw hex / palette colors).
const FILL_CLASSES = {
  focus: cx(
    'bg-[color-mix(in_srgb,var(--color-accent)_30%,transparent)]',
    '[background-image:linear-gradient(to_right,transparent,color-mix(in_srgb,var(--color-accent)_40%,transparent))]',
  ),
  rest: cx(
    'bg-[color-mix(in_srgb,var(--color-border-teal)_30%,transparent)]',
    '[background-image:linear-gradient(to_right,transparent,color-mix(in_srgb,var(--color-border-teal)_40%,transparent))]',
  ),
};

function PomodoroWidget() {
  const [mode, setMode] = createSignal('focus'); // 'focus' or 'rest'
  const [isRunning, setIsRunning] = createSignal(false);
  const [timeLeft, setTimeLeft] = createSignal(settingsStore.state.focusDuration * 60);

  let timerInterval;

  const totalSeconds = () => {
    return mode() === 'focus'
      ? settingsStore.state.focusDuration * 60
      : settingsStore.state.restDuration * 60;
  };

  createEffect(() => {
    // Reset timer if settings change and we're not running
    if (!isRunning()) {
      setTimeLeft(totalSeconds());
    }
  });

  const toggleTimer = () => {
    if (isRunning()) {
      clearInterval(timerInterval);
      setIsRunning(false);
    } else {
      setIsRunning(true);
      timerInterval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerInterval);
            setIsRunning(false);
            // Switch mode automatically
            const nextMode = mode() === 'focus' ? 'rest' : 'focus';
            setMode(nextMode);
            return nextMode === 'focus'
              ? settingsStore.state.focusDuration * 60
              : settingsStore.state.restDuration * 60;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const skipMode = () => {
    clearInterval(timerInterval);
    setIsRunning(false);
    const nextMode = mode() === 'focus' ? 'rest' : 'focus';
    setMode(nextMode);
    setTimeLeft(totalSeconds());
  };

  onCleanup(() => {
    if (timerInterval) clearInterval(timerInterval);
  });

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercentage = () => {
    return ((totalSeconds() - timeLeft()) / totalSeconds()) * 100;
  };

  return (
    <Section
      variant="muted"
      padding={0}
      aria-label="Pomodoro timer"
      class="group relative h-[60px] w-full overflow-hidden rounded-md border border-border shadow-(--shadow-low)"
    >
      {/* Liquid background progress (decorative) */}
      <div
        aria-hidden="true"
        class={cx(
          'absolute top-0 bottom-0 left-0 transition-all duration-1000 ease-linear',
          FILL_CLASSES[mode()],
        )}
        style={{ width: `${progressPercentage()}%` }}
      >
        {/* Animated edge to simulate liquid — tint-hover adapts to the theme */}
        <div class="absolute right-0 top-0 bottom-0 w-1 bg-[color-mix(in_srgb,var(--color-tint-hover)_20%,transparent)] shadow-[0_0_8px_color-mix(in_srgb,var(--color-tint-hover)_50%,transparent)]" />
      </div>

      {/* Content overlay */}
      <div class="absolute inset-0 z-10 flex items-center justify-between px-3">
        <div class="flex items-center gap-3">
          <IconButton
            label={isRunning() ? 'Pause timer' : 'Start timer'}
            icon={<Show when={isRunning()} fallback={<PlayIcon />}><PauseIcon /></Show>}
            variant="ghost"
            size="sm"
            class="rounded-full"
            onClick={toggleTimer}
          />
          <Text size="sm" weight="bold" color="secondary" class="uppercase tracking-wider">
            {mode() === 'focus' ? 'Focus' : 'Rest'}
          </Text>
        </div>

        <div class="flex items-center gap-3">
          <Text hasTabularNumbers class="font-display text-xl tracking-wider">
            {formatTime(timeLeft())}
          </Text>

          <IconButton
            label={mode() === 'focus' ? 'Skip to rest' : 'Skip to focus'}
            icon={<SkipIcon />}
            variant="ghost"
            size="sm"
            class="rounded-full opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            onClick={skipMode}
          />
        </div>
      </div>
    </Section>
  );
}

export default PomodoroWidget;
