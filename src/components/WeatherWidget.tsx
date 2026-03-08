import { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, Snowflake, CloudLightning, Wind, Droplets, MapPin, RefreshCw, Thermometer, Eye } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface WeatherData {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  isDay: boolean;
  city: string;
  feelsLike?: number;
}

interface ForecastItem {
  day: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
}

const weatherDescriptions: Record<number, { label: string; iconType: string }> = {
  0: { label: "Ciel dégagé", iconType: "sun" },
  1: { label: "Peu nuageux", iconType: "sun" },
  2: { label: "Partiellement nuageux", iconType: "cloud" },
  3: { label: "Couvert", iconType: "cloud" },
  45: { label: "Brouillard", iconType: "cloud" },
  48: { label: "Brouillard givrant", iconType: "cloud" },
  51: { label: "Bruine légère", iconType: "rain" },
  53: { label: "Bruine modérée", iconType: "rain" },
  55: { label: "Bruine forte", iconType: "rain" },
  61: { label: "Pluie légère", iconType: "rain" },
  63: { label: "Pluie modérée", iconType: "rain" },
  65: { label: "Pluie forte", iconType: "rain" },
  71: { label: "Neige légère", iconType: "snow" },
  73: { label: "Neige modérée", iconType: "snow" },
  75: { label: "Neige forte", iconType: "snow" },
  80: { label: "Averses légères", iconType: "rain" },
  81: { label: "Averses modérées", iconType: "rain" },
  82: { label: "Averses violentes", iconType: "rain" },
  95: { label: "Orage", iconType: "storm" },
  96: { label: "Orage avec grêle", iconType: "storm" },
  99: { label: "Orage violent", iconType: "storm" },
};

const getWeatherIcon = (iconType: string, size = "w-10 h-10") => {
  switch (iconType) {
    case "sun": return <Sun className={`${size} text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]`} />;
    case "cloud": return <Cloud className={`${size} text-slate-400`} />;
    case "rain": return <CloudRain className={`${size} text-blue-400 drop-shadow-[0_0_6px_rgba(96,165,250,0.4)]`} />;
    case "snow": return <Snowflake className={`${size} text-sky-300 drop-shadow-[0_0_6px_rgba(125,211,252,0.4)]`} />;
    case "storm": return <CloudLightning className={`${size} text-yellow-400 drop-shadow-[0_0_8px_rgba(250,204,21,0.5)]`} />;
    default: return <Cloud className={`${size} text-muted-foreground`} />;
  }
};

const getWeatherInfo = (code: number) => {
  return weatherDescriptions[code] || { label: "Inconnu", iconType: "cloud" };
};

const getDayName = (dateStr: string) => {
  const days = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const date = new Date(dateStr);
  const today = new Date();
  if (date.toDateString() === today.toDateString()) return "Auj.";
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (date.toDateString() === tomorrow.toDateString()) return "Dem.";
  return days[date.getDay()];
};

const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&accept-language=fr`
    );
    const data = await res.json();
    return data.address?.city || data.address?.town || data.address?.village || data.address?.state || "Position actuelle";
  } catch {
    return "Position actuelle";
  }
};

const WeatherWidget = () => {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [showForecast, setShowForecast] = useState(false);

  const fetchWeather = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );

      const { latitude, longitude } = position.coords;

      const [weatherRes, forecastRes, city] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day,apparent_temperature`
        ).then((r) => r.json()),
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=temperature_2m_max,temperature_2m_min,weather_code&timezone=auto&forecast_days=5`
        ).then((r) => r.json()),
        reverseGeocode(latitude, longitude),
      ]);

      setWeather({
        temperature: Math.round(weatherRes.current.temperature_2m),
        weatherCode: weatherRes.current.weather_code,
        windSpeed: Math.round(weatherRes.current.wind_speed_10m),
        humidity: weatherRes.current.relative_humidity_2m,
        isDay: weatherRes.current.is_day === 1,
        city,
        feelsLike: Math.round(weatherRes.current.apparent_temperature),
      });

      if (forecastRes.daily) {
        const items: ForecastItem[] = forecastRes.daily.time.map((t: string, i: number) => ({
          day: getDayName(t),
          tempMax: Math.round(forecastRes.daily.temperature_2m_max[i]),
          tempMin: Math.round(forecastRes.daily.temperature_2m_min[i]),
          weatherCode: forecastRes.daily.weather_code[i],
        }));
        setForecast(items);
      }
    } catch (err: any) {
      if (err?.code === 1) {
        setError("Autorise la géolocalisation pour voir la météo");
      } else {
        setError("Impossible de charger la météo");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  if (error) {
    return (
      <div className="mx-3 my-2 p-4 rounded-2xl bg-card border border-border text-center">
        <Cloud className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-muted-foreground text-xs">{error}</p>
        <button onClick={() => fetchWeather()} className="text-primary text-xs mt-2 font-medium hover:underline">
          Réessayer
        </button>
      </div>
    );
  }

  if (loading || !weather) {
    return (
      <div className="mx-3 my-2 p-4 rounded-2xl bg-card border border-border">
        <div className="flex items-center gap-3 animate-pulse">
          <div className="w-12 h-12 bg-muted rounded-xl" />
          <div className="space-y-2 flex-1">
            <div className="h-6 bg-muted rounded w-20" />
            <div className="h-3 bg-muted rounded w-28" />
          </div>
        </div>
      </div>
    );
  }

  const info = getWeatherInfo(weather.weatherCode);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-3 my-2 rounded-2xl bg-gradient-to-br from-card to-card/80 border border-border overflow-hidden"
    >
      {/* Main weather */}
      <div className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="p-2.5 rounded-xl bg-muted/40 backdrop-blur-sm"
            >
              {getWeatherIcon(info.iconType)}
            </motion.div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-foreground tracking-tight">
                  {weather.temperature}°
                </span>
                <span className="text-sm font-medium text-muted-foreground">C</span>
              </div>
              <p className="text-xs text-muted-foreground font-medium">{info.label}</p>
              {weather.feelsLike !== undefined && weather.feelsLike !== weather.temperature && (
                <p className="text-[10px] text-muted-foreground/70 flex items-center gap-0.5 mt-0.5">
                  <Thermometer className="w-2.5 h-2.5" />
                  Ressenti {weather.feelsLike}°
                </p>
              )}
            </div>
          </div>

          <div className="text-right space-y-1.5">
            <div className="flex items-center gap-1 text-xs text-muted-foreground justify-end">
              <MapPin className="w-3 h-3 text-primary" />
              <span className="max-w-[110px] truncate font-medium">{weather.city}</span>
            </div>
            <div className="flex items-center gap-2.5 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1 bg-muted/40 px-1.5 py-0.5 rounded-md">
                <Wind className="w-3 h-3" />
                {weather.windSpeed} km/h
              </span>
              <span className="flex items-center gap-1 bg-muted/40 px-1.5 py-0.5 rounded-md">
                <Droplets className="w-3 h-3" />
                {weather.humidity}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Forecast toggle + refresh */}
      <div className="flex items-center justify-between px-4 pb-2">
        <button
          onClick={() => setShowForecast(!showForecast)}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors font-medium flex items-center gap-1"
        >
          <Eye className="w-3 h-3" />
          {showForecast ? "Masquer prévisions" : "Prévisions 5 jours"}
        </button>
        <button
          onClick={() => fetchWeather(true)}
          disabled={refreshing}
          className="text-[11px] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "..." : "Actualiser"}
        </button>
      </div>

      {/* 5-day forecast */}
      <AnimatePresence>
        {showForecast && forecast.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border px-4 py-3">
              <div className="flex justify-between gap-1">
                {forecast.map((item, i) => {
                  const fInfo = getWeatherInfo(item.weatherCode);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1.5 py-1">
                      <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">
                        {item.day}
                      </span>
                      {getWeatherIcon(fInfo.iconType, "w-5 h-5")}
                      <div className="text-center">
                        <span className="text-xs font-bold text-foreground">{item.tempMax}°</span>
                        <span className="text-[10px] text-muted-foreground ml-0.5">{item.tempMin}°</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default WeatherWidget;
