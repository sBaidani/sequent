import { createSignal, createMemo, onCleanup, onMount, For, Show } from 'solid-js';
import { Portal } from 'solid-js/web';
import { 
  format, addMonths, subMonths, startOfMonth, endOfMonth, 
  startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, parseISO 
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-solid';

function DatePicker(props) {
  const [isOpen, setIsOpen] = createSignal(false);
  const [currentMonth, setCurrentMonth] = createSignal(props.value ? parseISO(props.value) : new Date());
  const [coords, setCoords] = createSignal({ top: 0, left: 0, width: 0 });
  
  let containerRef;
  let popoverRef;

  const handleClickOutside = (e) => {
    if (isOpen() && containerRef && !containerRef.contains(e.target) && popoverRef && !popoverRef.contains(e.target)) {
      setIsOpen(false);
    }
  };

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
  });

  onCleanup(() => {
    document.removeEventListener('mousedown', handleClickOutside);
  });

  const monthDays = createMemo(() => {
    const monthStart = startOfMonth(currentMonth());
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 });
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  });

  const nextMonth = (e) => { e.preventDefault(); setCurrentMonth(addMonths(currentMonth(), 1)); };
  const prevMonth = (e) => { e.preventDefault(); setCurrentMonth(subMonths(currentMonth(), 1)); };

  const handleSelect = (date) => {
    props.onChange(format(date, 'yyyy-MM-dd'));
    setIsOpen(false);
  };

  const togglePicker = (e) => {
    e.preventDefault();
    if (!isOpen()) {
      const rect = containerRef.getBoundingClientRect();
      setCoords({ top: rect.bottom + 8, left: rect.left });
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  const selectedDate = () => props.value ? parseISO(props.value) : null;

  return (
    <div class="relative w-full" ref={containerRef}>
      <button 
        type="button"
        onClick={togglePicker}
        class={props.class || "w-full bg-text-primary/5 border border-border-theme text-text-primary rounded-xl px-4 py-2.5 outline-none focus:border-accent transition-colors text-sm font-medium flex items-center justify-between"}
      >
        <span>{props.value ? format(parseISO(props.value), 'MMM d, yyyy') : 'Select date'}</span>
        <CalendarIcon class="w-4 h-4 text-text-muted" />
      </button>

      <Show when={isOpen()}>
        <Portal>
          <div 
            ref={popoverRef}
            class="fixed z-[9999] p-4 bg-bg-theme/40 border border-border-theme rounded-xl shadow-2xl backdrop-blur-3xl animate-in fade-in zoom-in-95 duration-200 w-[280px]"
            style={{ top: `${coords().top}px`, left: `${coords().left}px` }}
          >
            <div class="flex justify-between items-center mb-4">
            <button type="button" onClick={prevMonth} class="text-text-muted hover:text-text-primary p-1 rounded hover:bg-text-primary/10 transition-colors"><ChevronLeft class="w-4 h-4" /></button>
            <div class="text-sm font-bold text-text-primary">{format(currentMonth(), 'MMMM yyyy')}</div>
            <button type="button" onClick={nextMonth} class="text-text-muted hover:text-text-primary p-1 rounded hover:bg-text-primary/10 transition-colors"><ChevronRight class="w-4 h-4" /></button>
          </div>
          
          <div class="grid grid-cols-7 mb-2">
            <For each={['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']}>
              {day => <div class="text-center text-[10px] font-bold text-text-muted uppercase">{day}</div>}
            </For>
          </div>
          
          <div class="grid grid-cols-7 gap-1">
            <For each={monthDays()}>
              {date => {
                const isSelected = selectedDate() && isSameDay(date, selectedDate());
                const isCurrentMonth = isSameMonth(date, currentMonth());
                const isToday = isSameDay(date, new Date());
                
                return (
                  <button
                    type="button"
                    onClick={() => handleSelect(date)}
                    class={`
                      w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors
                      ${isSelected ? 'bg-accent text-text-primary shadow-md' : 
                        isToday ? 'bg-text-primary/10 text-accent' : 
                        'text-text-primary hover:bg-text-primary/10'}
                      ${!isCurrentMonth && !isSelected ? 'opacity-30' : 'opacity-100'}
                    `}
                  >
                    {format(date, 'd')}
                  </button>
                )
              }}
            </For>
          </div>
        </div>
        </Portal>
      </Show>
    </div>
  );
}

export default DatePicker;
