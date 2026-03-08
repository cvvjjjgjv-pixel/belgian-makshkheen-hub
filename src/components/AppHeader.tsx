import { useState, useEffect } from "react";
import { Bell, User, CloudSun, CloudRain, Sun, Cloud, Snowflake, CloudLightning, MapPin } from "lucide-react";
import logo from "@/assets/logo.png";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import NotificationsPanel from "./NotificationsPanel";

const weatherIcons: Record<string, any> = {
  "0": Sun, "1": Sun, "2": CloudSun, "3": Cloud,
  "45": Cloud, "48": Cloud,
  "51": CloudRain, "53": CloudRain, "55": CloudRain,
  "61": CloudRain, "63": CloudRain, "65": CloudRain,
  "71": Snowflake, "73": Snowflake, "75": Snowflake,
  "95": CloudLightning, "96": CloudLightning, "99": CloudLightning,
};

const weatherLabels: Record<string, string> = {
  "0": "Clair", "1": "Dégagé", "2": "Nuageux", "3": "Couvert",
  "45": "Brouillard", "48": "Brouillard",
  "51": "Bruine", "53": "Bruine", "55": "Bruine",
  "61": "Pluie", "63": "Pluie", "65": "Forte pluie",
  "71": "Neige", "73": "Neige", "75": "Forte neige",
  "95": "Orage", "96": "Orage grêle", "99": "Orage grêle",
};

interface AppHeaderProps {
  onProfileClick?: () => void;
}

const AppHeader = ({ onProfileClick }: AppHeaderProps) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifs, setShowNotifs] = useState(false);
  const [weather, setWeather] = useState<{ temp: number; code: string; city: string } | null>(null);

  useEffect(() => {
    if (!user) return;
    const fetchCount = async () => {
      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setUnreadCount(count || 0);
    };
    fetchCount();
    const channel = supabase
      .channel("notif-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` }, () => {
        fetchCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    const fetchWeather = async (lat: number, lon: number) => {
      try {
        // Reverse geocode for city name
        const geoRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`);
        const geoData = await geoRes.json();
        
        // Get city name from reverse geocoding
        let city = "Ma position";
        try {
          const revRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=&count=1&latitude=${lat}&longitude=${lon}`);
          // Fallback: use a simple approach
          city = geoData.timezone?.split("/").pop()?.replace("_", " ") || "Ma position";
        } catch { /* keep default */ }

        setWeather({
          temp: Math.round(geoData.current.temperature_2m),
          code: String(geoData.current.weather_code),
          city,
        });
      } catch { /* silently fail */ }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude),
        () => fetchWeather(50.85, 4.35) // Default: Brussels
      );
    } else {
      fetchWeather(50.85, 4.35);
    }
  }, []);

  const WeatherIcon = weather ? (weatherIcons[weather.code] || CloudSun) : CloudSun;

  return (
    <>
      <header className="sticky top-0 z-50 gradient-header border-b-2 border-accent">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Logo" className="w-10 h-10 rounded-full border-2 border-accent object-cover" />
            <div>
              <h1 className="font-arabic text-lg font-bold text-accent">مكشخين بلجيكا</h1>
              <p className="text-xs text-foreground/70">Makshkheen Belgium</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {weather && (
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-secondary/60 border border-border">
                <WeatherIcon className="w-4 h-4 text-accent" />
                <span className="text-xs font-bold text-foreground">{weather.temp}°</span>
                <span className="text-[9px] text-muted-foreground hidden sm:inline">{weather.city}</span>
              </div>
            )}
            <button onClick={() => setShowNotifs(true)} className="relative text-foreground">
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full text-[10px] flex items-center justify-center font-bold text-white">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>
            <button className="text-foreground">
              <User className="w-6 h-6" />
            </button>
          </div>
        </div>
      </header>

      <NotificationsPanel open={showNotifs} onClose={() => setShowNotifs(false)} />
    </>
  );
};

export default AppHeader;