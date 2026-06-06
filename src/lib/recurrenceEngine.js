import { RRule } from 'rrule';
import { parseISO } from 'date-fns';

export const expandRecurringItems = (items, viewStart, viewEnd) => {
  const expanded = [];
  
  items.forEach(item => {
    if (!item.rrule) {
      expanded.push(item);
      return;
    }
    
    try {
      const dtstart = parseISO(item.type === 'event' ? item.start_time : item.scheduled_date || item.created_at);
      const rule = RRule.fromString(item.rrule);
      // Ensure dtstart is correctly associated with the rule
      rule.options.dtstart = dtstart;
      
      // Calculate occurrences between view ranges
      const dates = rule.between(new Date(viewStart), new Date(viewEnd), true);
      
      dates.forEach((date, index) => {
        const instance = { ...item, id: `${item.id}-r${index}`, originalId: item.id, isInstance: true };
        
        if (item.type === 'event') {
          const originalStart = parseISO(item.start_time);
          const originalEnd = parseISO(item.end_time);
          const duration = originalEnd.getTime() - originalStart.getTime();
          
          const newStart = new Date(date);
          newStart.setHours(originalStart.getHours(), originalStart.getMinutes(), 0, 0);
          const newEnd = new Date(newStart.getTime() + duration);
          
          instance.start_time = newStart.toISOString();
          instance.end_time = newEnd.toISOString();
        } else if (item.type === 'task') {
          const originalDate = item.scheduled_date ? parseISO(item.scheduled_date) : null;
          const newDate = new Date(date);
          if (originalDate) {
            newDate.setHours(originalDate.getHours(), originalDate.getMinutes(), 0, 0);
          } else {
            newDate.setHours(0, 0, 0, 0);
          }
          instance.scheduled_date = newDate.toISOString();
        }
        
        expanded.push(instance);
      });
    } catch (e) {
      console.error('Failed to parse rrule for item', item.id, e);
      expanded.push(item);
    }
  });
  
  return expanded;
};
