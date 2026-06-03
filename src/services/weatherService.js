import { createSignal } from 'solid-js';

const API_KEY = import.meta.env.VITE_TOMORROW_API_KEY;

// Mock data if no API key
const MOCK_WEATHER = {
  current: {
    temp: 72,
    condition: 'Sunny',
    icon: '☀️',
  },
  forecast: [
    { time: new Date().toISOString(), temp: 72, condition: 'Sunny', icon: '☀️' },
    { time: new Date(Date.now() + 86400000).toISOString(), temp: 68, condition: 'Partly Cloudy', icon: '⛅' },
    { time: new Date(Date.now() + 86400000 * 2).toISOString(), temp: 65, condition: 'Rain', icon: '🌧️' },
  ]
};

const [weather, setWeather] = createSignal(null);
const [loading, setLoading] = createSignal(false);
const [error, setError] = createSignal(null);

export const weatherService = {
  get state() { return weather(); },
  get loading() { return loading(); },
  get error() { return error(); },
  
  fetchWeather: async (lat, lon) => {
    setLoading(true);
    setError(null);
    
    if (!API_KEY) {
      console.warn("No Tomorrow.io API key found. Using mock weather data.");
      setTimeout(() => {
        setWeather(MOCK_WEATHER);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      // Tommorrow.io realtime + forecast API (timelines)
      const res = await fetch(`https://api.tomorrow.io/v4/weather/forecast?location=${lat},${lon}&apikey=${API_KEY}&units=imperial&timesteps=1h,1d`);
      
      if (!res.ok) {
        throw new Error(`Weather API error: ${res.status}`);
      }
      
      const data = await res.json();
      
      // Parse tomorrow.io data
      // This is a basic mapping, would need actual tomorrow.io weather codes
      // https://docs.tomorrow.io/reference/data-layers-weather-codes
      const mapCodeToIcon = (code) => {
        if (code === 1000) return '☀️'; // Clear
        if (code === 1100 || code === 1101 || code === 1102) return '⛅'; // Partly Cloudy
        if (code === 1001) return '☁️'; // Cloudy
        if (code >= 4000 && code < 5000) return '🌧️'; // Rain
        if (code >= 5000 && code < 6000) return '🌨️'; // Snow
        if (code >= 8000) return '⛈️'; // Thunderstorm
        return '☀️';
      };

      const mapCodeToDesc = (code) => {
        if (code === 1000) return 'Clear';
        if (code === 1100 || code === 1101 || code === 1102) return 'Partly Cloudy';
        if (code === 1001) return 'Cloudy';
        if (code >= 4000 && code < 5000) return 'Rain';
        if (code >= 5000 && code < 6000) return 'Snow';
        if (code >= 8000) return 'Thunderstorm';
        return 'Clear';
      };

      const currentTimestep = data.timelines.hourly[0];
      
      const parsed = {
        current: {
          temp: Math.round(currentTimestep.values.temperature),
          condition: mapCodeToDesc(currentTimestep.values.weatherCode),
          icon: mapCodeToIcon(currentTimestep.values.weatherCode),
        },
        forecast: data.timelines.daily.slice(0, 5).map(day => ({
          time: day.time,
          temp: Math.round(day.values.temperatureAvg),
          tempMax: Math.round(day.values.temperatureMax),
          tempMin: Math.round(day.values.temperatureMin),
          condition: mapCodeToDesc(day.values.weatherCodeMax),
          icon: mapCodeToIcon(day.values.weatherCodeMax)
        })),
        hourly: data.timelines.hourly.slice(0, 24).map(hour => ({
          time: hour.time,
          temp: Math.round(hour.values.temperature),
          condition: mapCodeToDesc(hour.values.weatherCode),
          icon: mapCodeToIcon(hour.values.weatherCode),
        }))
      };

      setWeather(parsed);
    } catch (err) {
      console.error("Failed to fetch weather:", err);
      setError(err.message);
      // Fallback to mock data on error so UI still looks good
      setWeather(MOCK_WEATHER);
    } finally {
      setLoading(false);
    }
  }
};
