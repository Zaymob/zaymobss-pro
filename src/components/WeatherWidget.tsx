import React, { useState, useEffect } from 'react';
import {
  Sun,
  Cloud,
  CloudSun,
  CloudRain,
  CloudDrizzle,
  CloudLightning,
  Snowflake,
  CloudFog,
  Wind,
  Droplets,
  MapPin,
  Search,
  RefreshCw,
  Compass,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface WeatherData {
  city: string;
  country: string;
  temperature: number;
  tempMin: number;
  tempMax: number;
  apparentTemp: number;
  humidity: number;
  windSpeed: number;
  weatherCode: number;
  condition: string;
  forecast: Array<{
    day: string;
    weatherCode: number;
    tempMin: number;
    tempMax: number;
  }>;
}

const getWeatherCondition = (code: number): { text: string; icon: React.ReactNode; bgGradient: string } => {
  if (code === 0) {
    return {
      text: 'Clear Sky',
      icon: <Sun className="w-8 h-8 text-amber-400 animate-spin-slow" />,
      bgGradient: 'from-amber-500/10 via-amber-500/5 to-transparent',
    };
  }
  if (code >= 1 && code <= 3) {
    return {
      text: code === 1 ? 'Mainly Clear' : code === 2 ? 'Partly Cloudy' : 'Overcast',
      icon: <CloudSun className="w-8 h-8 text-amber-300" />,
      bgGradient: 'from-blue-500/10 via-zinc-800/10 to-transparent',
    };
  }
  if (code === 45 || code === 48) {
    return {
      text: 'Foggy',
      icon: <CloudFog className="w-8 h-8 text-zinc-400" />,
      bgGradient: 'from-zinc-500/10 via-zinc-800/10 to-transparent',
    };
  }
  if (code >= 51 && code <= 55) {
    return {
      text: 'Light Drizzle',
      icon: <CloudDrizzle className="w-8 h-8 text-cyan-400" />,
      bgGradient: 'from-cyan-500/10 via-blue-500/5 to-transparent',
    };
  }
  if (code >= 61 && code <= 67) {
    return {
      text: 'Rainy',
      icon: <CloudRain className="w-8 h-8 text-blue-400" />,
      bgGradient: 'from-blue-600/15 via-blue-500/5 to-transparent',
    };
  }
  if (code >= 71 && code <= 77) {
    return {
      text: 'Snowfall',
      icon: <Snowflake className="w-8 h-8 text-sky-300" />,
      bgGradient: 'from-sky-400/15 via-blue-900/10 to-transparent',
    };
  }
  if (code >= 80 && code <= 82) {
    return {
      text: 'Rain Showers',
      icon: <CloudRain className="w-8 h-8 text-indigo-400" />,
      bgGradient: 'from-indigo-500/15 via-blue-500/5 to-transparent',
    };
  }
  if (code >= 95) {
    return {
      text: 'Thunderstorm',
      icon: <CloudLightning className="w-8 h-8 text-amber-400 animate-pulse" />,
      bgGradient: 'from-amber-600/15 via-purple-900/15 to-transparent',
    };
  }
  return {
    text: 'Cloudy',
    icon: <Cloud className="w-8 h-8 text-zinc-300" />,
    bgGradient: 'from-zinc-500/10 via-zinc-800/5 to-transparent',
  };
};

export const WeatherWidget: React.FC = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchCity, setSearchCity] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [showSearchInput, setShowSearchInput] = useState<boolean>(false);
  const [showForecast, setShowForecast] = useState<boolean>(false);

  // Fetch weather given lat and lon
  const fetchWeatherByCoords = async (lat: number, lon: number, cityName?: string, countryName?: string) => {
    setLoading(true);
    setError(null);
    try {
      const weatherRes = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=celsius&wind_speed_unit=kmh&timezone=auto`
      );

      if (!weatherRes.ok) throw new Error('Weather service unavailable');
      const data = await weatherRes.json();

      let resolvedCity = cityName || 'Local Area';
      let resolvedCountry = countryName || '';

      if (!cityName) {
        try {
          const geoRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          if (geoRes.ok) {
            const geoData = await geoRes.json();
            resolvedCity = geoData.locality || geoData.city || geoData.principalSubdivision || 'Local Area';
            resolvedCountry = geoData.countryName || '';
          }
        } catch (e) {
          console.warn('Reverse geocode fallback:', e);
        }
      }

      const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const forecastItems = (data.daily?.time || []).slice(1, 4).map((timeStr: string, idx: number) => {
        const dateObj = new Date(timeStr);
        return {
          day: daysOfWeek[dateObj.getDay()],
          weatherCode: data.daily?.weather_code?.[idx + 1] ?? 0,
          tempMin: Math.round(data.daily?.temperature_2m_min?.[idx + 1] ?? 0),
          tempMax: Math.round(data.daily?.temperature_2m_max?.[idx + 1] ?? 0),
        };
      });

      setWeather({
        city: resolvedCity,
        country: resolvedCountry,
        temperature: Math.round(data.current?.temperature_2m ?? 20),
        tempMin: Math.round(data.daily?.temperature_2m_min?.[0] ?? 15),
        tempMax: Math.round(data.daily?.temperature_2m_max?.[0] ?? 25),
        apparentTemp: Math.round(data.current?.apparent_temperature ?? 20),
        humidity: Math.round(data.current?.relative_humidity_2m ?? 50),
        windSpeed: Math.round(data.current?.wind_speed_10m ?? 10),
        weatherCode: data.current?.weather_code ?? 0,
        condition: getWeatherCondition(data.current?.weather_code ?? 0).text,
        forecast: forecastItems,
      });
    } catch (err: any) {
      setError('Unable to load weather');
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    setLoading(true);
    setError(null);
    if (!navigator.geolocation) {
      fetchWeatherByCityName('Tokyo');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        fetchWeatherByCoords(pos.coords.latitude, pos.coords.longitude);
      },
      (err) => {
        console.warn('Geolocation fallback:', err.message);
        fetchWeatherByCityName('Tokyo');
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const fetchWeatherByCityName = async (query: string) => {
    if (!query.trim()) return;
    setIsSearching(true);
    setLoading(true);
    setError(null);
    try {
      const geoRes = await fetch(
        `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`
      );
      if (!geoRes.ok) throw new Error('City search failed');
      const geoData = await geoRes.json();

      if (!geoData.results || geoData.results.length === 0) {
        setError(`No location found for "${query}"`);
        setLoading(false);
        setIsSearching(false);
        return;
      }

      const match = geoData.results[0];
      await fetchWeatherByCoords(match.latitude, match.longitude, match.name, match.country);
      setShowSearchInput(false);
      setSearchCity('');
    } catch (err) {
      setError('Failed to search');
      setLoading(false);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    handleGetLocation();
  }, []);

  const cond = weather ? getWeatherCondition(weather.weatherCode) : null;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-zinc-900 border border-zinc-800 p-2.5 sm:p-3 shadow-md transition-colors hover:border-zinc-700">

      {loading ? (
        <div className="relative z-10 flex items-center justify-between px-2 py-1 text-zinc-400 text-xs">
          <div className="flex items-center space-x-2 font-mono">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-400" />
            <span>Weather...</span>
          </div>
        </div>
      ) : error ? (
        <div className="relative z-10 flex items-center justify-between px-2 py-0.5 text-xs">
          <span className="text-red-400 text-[11px] truncate max-w-[180px]">{error}</span>
          <button
            type="button"
            onClick={handleGetLocation}
            className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 hover:text-white"
          >
            Retry
          </button>
        </div>
      ) : weather ? (
        <div className="relative z-10 space-y-2">
          {/* Main Mini Weather Bar */}
          <div className="flex items-center justify-between gap-3">
            {/* Left: Weather Icon & City */}
            <div className="flex items-center space-x-2 truncate">
              <div className="p-1.5 rounded-xl bg-zinc-900/90 border border-zinc-800 flex-shrink-0">
                {cond?.icon && React.cloneElement(cond.icon as React.ReactElement, { className: 'w-5 h-5 text-amber-400' })}
              </div>
              <div className="truncate min-w-0">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-black text-white truncate">{weather.city}</span>
                  {weather.country && (
                    <span className="text-[9px] font-mono px-1 rounded bg-zinc-900 text-zinc-400 border border-zinc-800/60 hidden sm:inline">
                      {weather.country}
                    </span>
                  )}
                </div>
                <p className="text-[10px] font-medium text-amber-300/90 truncate">{cond?.text}</p>
              </div>
            </div>

            {/* Right: Temp & Quick Controls */}
            <div className="flex items-center space-x-2 flex-shrink-0">
              <div className="text-right">
                <div className="text-base font-black text-white leading-none">
                  {weather.temperature}°<span className="text-[10px] font-mono text-zinc-400">C</span>
                </div>
                <div className="text-[9px] font-mono text-zinc-400 leading-tight">
                  {weather.tempMax}° / {weather.tempMin}°
                </div>
              </div>

              <div className="flex items-center space-x-1 border-l border-zinc-800/80 pl-2">
                <button
                  type="button"
                  onClick={() => setShowSearchInput(!showSearchInput)}
                  className="p-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Search City"
                >
                  <Search className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={handleGetLocation}
                  className="p-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-amber-400 hover:text-amber-300 transition-colors"
                  title="GPS Location"
                >
                  <Compass className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => setShowForecast(!showForecast)}
                  className="p-1 rounded-lg bg-zinc-900/80 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                  title="Forecast"
                >
                  {showForecast ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Search Drawer */}
          {showSearchInput && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                fetchWeatherByCityName(searchCity);
              }}
              className="flex gap-1.5 pt-1 border-t border-zinc-800/60"
            >
              <input
                type="text"
                value={searchCity}
                onChange={(e) => setSearchCity(e.target.value)}
                placeholder="City name (e.g. Miami, Tokyo)..."
                className="flex-1 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-[11px] text-white placeholder-zinc-500 focus:outline-none focus:border-amber-400"
                autoFocus
              />
              <button
                type="submit"
                disabled={isSearching}
                className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-bold text-[11px] shadow transition-all disabled:opacity-50"
              >
                {isSearching ? <RefreshCw className="w-3 h-3 animate-spin" /> : 'Go'}
              </button>
            </form>
          )}

          {/* 3-Day Forecast Drawer */}
          {showForecast && weather.forecast.length > 0 && (
            <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-zinc-800/60">
              {weather.forecast.map((f, i) => {
                const fCond = getWeatherCondition(f.weatherCode);
                return (
                  <div
                    key={i}
                    className="p-1 rounded-lg bg-zinc-900/80 border border-zinc-800/80 text-center space-y-0.5"
                  >
                    <span className="text-[9px] font-mono font-bold text-zinc-400 block">{f.day}</span>
                    <div className="flex justify-center my-0.5">
                      {fCond.icon && React.cloneElement(fCond.icon as React.ReactElement, { className: 'w-3.5 h-3.5 text-amber-300' })}
                    </div>
                    <div className="text-[9px] font-mono text-zinc-300">
                      {f.tempMax}° / <span className="text-zinc-500">{f.tempMin}°</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
};
