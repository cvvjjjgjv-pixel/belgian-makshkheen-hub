import { useState, useEffect } from "react";
import { Cloud, CloudRain, Sun, Snowflake, CloudLightning, Wind, Droplets, MapPin, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";

interface WeatherData {
  temperature: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
  isDay: boolean;
  city: string;
}

const weatherDescriptions: Record<number, { label: string; icon: React.ReactNode }> = {
  0: { label: "Ciel dégagé", icon: <Sun className="w-8 h-8 text-yellow-400" /> },
  1: { label: "Peu nuageux", icon: <Sun className="w-8 h-8 text-yellow-400" /> },
  2: { label: "Partiellement nuageux", icon: <Cloud className="w-8 h-8 text-muted-foreground" /> },
  3: { label: "Couvert", icon: <Cloud className="w-8 h-8 text-muted-foreground" /> },
  45: { label: "Brouillard", icon: <Cloud className="w-8 h-8 text-muted-foreground" /> },
  48: { label: "Brouillard givrant", icon: <Cloud className="w-8 h-8 text-muted-foreground" /> },
  51: { label: "Bruine légère", icon: <CloudRain className="w-8 h-8 text-blue-400" /> },
  53: { label: "Bruine modérée", icon: <CloudRain className="w-8 h-8 text-blue-400" /> },
  55: { label: "Bruine forte", icon: <CloudRain className="w-8 h-8 text-blue-400" /> },
  61: { label: "Pluie légère", icon: <CloudRain className="w-8 h-8 text-blue-400" /> },
  63: { label: "Pluie modérée", icon: <CloudRain className="w-8 h-8 text-blue-500" /> },
  65: { label: "Pluie forte", icon: <CloudRain className="w-8 h-8 text-blue-600" /> },
  71: { label: "Neige légère", icon: <Snowflake className="w-8 h-8 text-sky-300" /> },
  73: { label: "Neige modérée", icon: <Snowflake className="w-8 h-8 text-sky-300" /> },
  75: { label: "Neige forte", icon: <Snowflake className="w-8 h-8 text-sky-200" /> },
  80: { label: "Averses légères", icon: <CloudRain className="w-8 h-8 text-blue-400" /> },
  81: { label: "Averses modérées", icon: <CloudRain className="w-8 h-8 text-blue-500" /> },
  82: { label: "Averses violentes", icon: <CloudRain className="w-8 h-8 text-blue-600" /> },
  95: { label: "Orage", icon: <CloudLightning className="w-8 h-8 text-yellow-500" /> },
  96: { label: "Orage avec grêle", icon: <CloudLightning className="w-8 h-8 text-yellow-500" /> },
  99: { label: "Orage violent", icon: <CloudLightning className="w-8 h-8 text-red-500" /> },
};

const getWeatherInfo = (code: number) => {
  return weatherDescriptions[code] || { label: "Inconnu", icon: <Cloud className="w-8 h-8 text-muted-foreground" /> };
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWeather = async () => {
    setLoading(true);
    setError(null);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000 })
      );

      const { latitude, longitude } = position.coords;

      const [weatherRes, city] = await Promise.all([
        fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day`
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
      });
    } catch (err: any) {
      if (err?.code === 1) {
        setError("Autorise la géolocalisation pour voir la météo");
      } else {
        setError("Impossible de charger la météo");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWeather();
  }, []);

  if (error) {
    return (
      <div className="mx-3 my-2 p-3 rounded-xl bg-card border border-border text-center">
        <p className="text-muted-foreground text-xs">{error}</p>
        <button onClick={fetchWeather} className="text-primary text-xs mt-1 underline">
          Réessayer
        </button>
      </div>
    );
  }

  if (loading || !weather) {
    return (
      <div className="mx-3 my-2 p-4 rounded-xl bg-card border border-border animate-pulse">
        <div className="h-10 bg-muted rounded w-3/4 mx-auto" />
      </div>
    );
  }

  const info = getWeatherInfo(weather.weatherCode);

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-3 my-2 p-3 rounded-xl bg-card border border-border"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-muted/50">{info.icon}</div>
          <div>
            <div className="flex items-center gap-1">
              <span className="text-2xl font-bold text-foreground">{weather.temperature}°C</span>
            </div>
            <p className="text-xs text-muted-foreground">{info.label}</p>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <MapPin className="w-3 h-3" />
            <span className="max-w-[100px] truncate">{weather.city}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Wind className="w-3 h-3" />
              {weather.windSpeed} km/h
            </span>
            <span className="flex items-center gap-0.5">
              <Droplets className="w-3 h-3" />
              {weather.humidity}%
            </span>
          </div>
        </div>
      </div>

      <button
        onClick={fetchWeather}
        className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors mx-auto"
      >
        <RefreshCw className="w-2.5 h-2.5" />
        Actualiser
      </button>
    </motion.div>
  );
};

export default WeatherWidget;
