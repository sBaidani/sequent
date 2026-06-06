import { createSignal } from 'solid-js';
import { supabase } from '../lib/supabase';
import { settingsStore } from '../stores/settingsStore';

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
  ],
  hourly: Array.from({length: 48}).map((_, i) => {
    const d = new Date();
    d.setHours(d.getHours() + i - 24, 0, 0, 0);
    return {
      time: d.toISOString(),
      temp: 72,
      condition: 'Sunny',
      icon: '☀️'
    };
  })
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
    
    if (!lat || !lon) {
      console.warn("No location provided. Using mock weather data.");
      setTimeout(() => {
        setWeather(MOCK_WEATHER);
        setLoading(false);
      }, 500);
      return;
    }

    try {
      const units = settingsStore.state.weatherUnits || 'metric';

      // Call our Supabase Edge Function to get cached/rate-limited weather
      const { data, error: functionError } = await supabase.functions.invoke('weather-proxy', {
        body: { lat, lon, units }
      });
      
      if (functionError) {
        throw new Error(`Weather API error: ${functionError.message}`);
      }
      if (data?.error) {
        throw new Error(`Weather API error: ${data.error}`);
      }
      
      const mapCodeToIcon = (code) => {
        const mapping = {
          1000: '☀️',
          1100: '🌤️',
          1101: '⛅',
          1102: '🌥️',
          1001: '☁️',
          2000: '🌫️',
          2100: '🌫️',
          3000: '🌬️',
          3001: '🌬️',
          3002: '💨',
          4000: '🌧️',
          4001: '☔',
          4200: '🌦️',
          4201: '⛈️',
          5000: '❄️',
          5001: '❄️',
          5100: '🌨️',
          5101: '❄️',
          6000: '🌧️❄️',
          6001: '🌧️❄️',
          6200: '🌧️❄️',
          6201: '🌧️❄️',
          7000: '🧊',
          7101: '🧊',
          7102: '🧊',
          8000: '🌩️'
        };
        return mapping[code] || '☀️';
      };

      const mapCodeToDesc = (code) => {
        const mapping = {
          1000: 'Clear',
          1100: 'Mostly Clear',
          1101: 'Partly Cloudy',
          1102: 'Mostly Cloudy',
          1001: 'Cloudy',
          2000: 'Fog',
          2100: 'Light Fog',
          3000: 'Light Wind',
          3001: 'Wind',
          3002: 'Strong Wind',
          4000: 'Drizzle',
          4001: 'Rain',
          4200: 'Light Rain',
          4201: 'Heavy Rain',
          5000: 'Snow',
          5001: 'Flurries',
          5100: 'Light Snow',
          5101: 'Heavy Snow',
          6000: 'Freezing Drizzle',
          6001: 'Freezing Rain',
          6200: 'Light Freezing Rain',
          6201: 'Heavy Freezing Rain',
          7000: 'Ice Pellets',
          7101: 'Heavy Ice Pellets',
          7102: 'Light Ice Pellets',
          8000: 'Thunderstorm'
        };
        return mapping[code] || 'Unknown';
      };

      const getWeatherInsight = (current, todayDaily) => {
        if (!current || !todayDaily) return null;
        
        const currentVals = current.values || {};
        const dailyVals = todayDaily.values || {};

        if (dailyVals.precipitationProbabilityMax > 40) {
          if (dailyVals.rainIntensityMax > 0.5) return "Heavy downpours expected later.";
          return "High chance of rain today, don't forget an umbrella.";
        }
        
        if (dailyVals.uvIndexMax >= 6) {
          return "High UV today, sunscreen is a must if heading out.";
        }
        
        if (currentVals.visibilityAvg < 3) {
          return "Foggy conditions, drive safely.";
        }
        
        if (dailyVals.windGustMax > 20) {
          return "Quite breezy today—hold onto your hat!";
        }
        
        const tempApparent = currentVals.temperatureApparent || currentVals.temperature;
        const tempActual = currentVals.temperature;
        const tempDiff = Math.abs(tempApparent - tempActual);
        
        if (tempDiff > 5) {
          if (tempApparent > tempActual) {
            return "It's humid—feels warmer than it looks.";
          } else {
            return "Wind chill makes it feel cooler than it is.";
          }
        }
        
        if (tempActual < (units === 'metric' ? 10 : 50)) {
          return "Chilly out there, grab a jacket.";
        }

        if (tempActual > (units === 'metric' ? 27 : 80)) {
          return "It's a hot one today, stay hydrated!";
        }

        return "It's looking like a beautiful day.";
      };

      const currentTimestep = data.timelines.hourly[0];
      const todayDailyTimestep = data.timelines.daily[0];
      
      const parsed = {
        current: {
          temp: Math.round(currentTimestep.values.temperature),
          condition: mapCodeToDesc(currentTimestep.values.weatherCode),
          icon: mapCodeToIcon(currentTimestep.values.weatherCode),
          insight: getWeatherInsight(currentTimestep, todayDailyTimestep),
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
