import { createStore } from 'solid-js/store';
import { uiStore } from './uiStore';

const loadSetting = (key, defaultValue) => {
  const stored = localStorage.getItem(`sequent_setting_${key}`);
  return stored !== null ? stored : defaultValue;
};

const loadWeatherLocation = () => {
  const stored = localStorage.getItem(`sequent_setting_weatherLocation`);
  if (!stored) return { name: 'New York, NY', lat: '40.7128', lon: '-74.0060' };
  try {
    if (stored.startsWith('{')) {
      return JSON.parse(stored);
    }
    // Handle old string format
    const [lat, lon] = stored.split(',').map(s => s.trim());
    return { name: `${lat}, ${lon}`, lat, lon };
  } catch (e) {
    return { name: 'New York, NY', lat: '40.7128', lon: '-74.0060' };
  }
};

const [state, setState] = createStore({
  startOfWeek: loadSetting('startOfWeek', 'monday'),
  defaultDuration: parseInt(loadSetting('defaultDuration', '60'), 10),
  showTasksInTimeline: loadSetting('showTasksInTimeline', 'false') === 'true',
  use24HourClock: loadSetting('use24HourClock', 'false') === 'true',
  showSeconds: loadSetting('showSeconds', 'false') === 'true',
  weatherLocation: loadWeatherLocation(),
  weatherUnits: loadSetting('weatherUnits', 'metric'),
  focusDuration: parseInt(loadSetting('focusDuration', '25'), 10),
  restDuration: parseInt(loadSetting('restDuration', '5'), 10),
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
  },

  setUse24HourClock: (use24h) => {
    setState('use24HourClock', use24h);
    localStorage.setItem('sequent_setting_use24HourClock', use24h ? 'true' : 'false');
  },

  setShowSeconds: (showSecs) => {
    setState('showSeconds', showSecs);
    localStorage.setItem('sequent_setting_showSeconds', showSecs ? 'true' : 'false');
  },

  setWeatherLocation: (locationObj) => {
    setState('weatherLocation', locationObj);
    localStorage.setItem('sequent_setting_weatherLocation', JSON.stringify(locationObj));
  },

  setWeatherUnits: (units) => {
    setState('weatherUnits', units);
    localStorage.setItem('sequent_setting_weatherUnits', units);
  },

  setFocusDuration: (mins) => {
    setState('focusDuration', mins);
    localStorage.setItem('sequent_setting_focusDuration', mins.toString());
  },

  setRestDuration: (mins) => {
    setState('restDuration', mins);
    localStorage.setItem('sequent_setting_restDuration', mins.toString());
  }
};
