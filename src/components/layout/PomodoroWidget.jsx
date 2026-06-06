import { createSignal, createEffect, onCleanup, Show } from 'solid-js';
import { settingsStore } from '../../stores/settingsStore';

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
    <div class="relative w-full h-[60px] rounded-xl bg-white/5 border border-white/10 overflow-hidden shadow-sm group">
      {/* Liquid background progress */}
      <div 
        class={`absolute top-0 bottom-0 left-0 transition-all duration-1000 ease-linear ${mode() === 'focus' ? 'bg-accent/30' : 'bg-[#1FA7A7]/30'}`}
        style={{ width: `${progressPercentage()}%` }}
      >
        <div class={`absolute inset-0 bg-gradient-to-r ${mode() === 'focus' ? 'from-accent/0 to-accent/40' : 'from-[#1FA7A7]/0 to-[#1FA7A7]/40'} opacity-50`}></div>
        {/* Animated edge to simulate liquid */}
        <div class="absolute right-0 top-0 bottom-0 w-1 bg-white/20 shadow-[0_0_8px_rgba(255,255,255,0.5)]"></div>
      </div>

      {/* Content overlay */}
      <div class="absolute inset-0 flex items-center justify-between px-3 z-10">
        <div class="flex items-center gap-3">
          <button 
            onClick={toggleTimer}
            class="w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors border border-white/5 cursor-pointer backdrop-blur-md"
          >
            <Show when={isRunning()} fallback={
              <svg class="w-4 h-4 translate-x-0.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
            }>
              <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
            </Show>
          </button>
          
          <div class="flex flex-col">
            <span class="text-[11px] font-bold tracking-wider uppercase text-white/60">
              {mode() === 'focus' ? 'Focus' : 'Rest'}
            </span>
          </div>
        </div>

        <div class="flex items-center gap-3">
          <div class="font-display text-xl font-light text-white tracking-wider tabular-nums">
            {formatTime(timeLeft())}
          </div>
          
          <button 
            onClick={skipMode}
            class="w-6 h-6 flex items-center justify-center rounded-full text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer opacity-0 group-hover:opacity-100"
            title="Skip"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 5l7 7-7 7M5 5l7 7-7 7"></path></svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export default PomodoroWidget;
