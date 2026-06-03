import { createStore } from 'solid-js/store';
import { uiStore } from './uiStore';

const loadSetting = (key, defaultValue) => {
  const stored = localStorage.getItem(`sequent_setting_${key}`);
  return stored !== null ? stored : defaultValue;
};

const [state, setState] = createStore({
  startOfWeek: loadSetting('startOfWeek', 'monday'),
  defaultDuration: parseInt(loadSetting('defaultDuration', '60'), 10),
  showTasksInTimeline: loadSetting('showTasksInTimeline', 'true') === 'true',
});

export const settingsStore = {
  get state() { return state; },
  
  setStartOfWeek: (day) => {
    setState('startOfWeek', day);
    localStorage.setItem('sequent_setting_startOfWeek', day);
  },
  
  setDefaultDuration: (mins) => {
    setState('defaultDuration', mins);
    localStorage.setItem('sequent_setting_defaultDuration', mins.toString());
  },
  
  setShowTasksInTimeline: (show) => {
    setState('showTasksInTimeline', show);
    localStorage.setItem('sequent_setting_showTasksInTimeline', show ? 'true' : 'false');
  }
};
