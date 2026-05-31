import { createSignal } from 'solid-js';

function CalendarView() {
  return (
    <div class="calendar-container">
      <div class="month-grid">
        <div class="calendar-header">
          <button class="icon-btn">&lt;</button>
          <h2>May 2026</h2>
          <button class="icon-btn">&gt;</button>
        </div>
        <div class="weekdays">
          <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
        </div>
        <div class="days-grid">
          {/* Placeholder for days */}
          {Array.from({ length: 35 }).map((_, i) => (
            <div class="day-cell">{i + 1}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default CalendarView;
