import { useState, useEffect, useCallback, useRef } from "react";
import Hls from "hls.js";
import { Tv, Settings, X, Play, RefreshCw, Loader2, Globe, SkipForward, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Channel {
  name: string;
  icon: string;
  url: string;
  quality?: string;
  referrer?: string;
  userAgent?: string;
}

interface StreamData {
  channel: string | null;
  feed: string | null;
  title: string;
  url: string;
  referrer: string | null;
  user_agent: string | null;
  quality: string | null;
}

const STREAMS_API = "https://iptv-org.github.io/api/streams.json";
const PROXY_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tv-stream-proxy`;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const FALLBACK_CHANNELS: Channel[] = [
  { name: "CBC News Toronto", icon: "📰", url: "https://amagi-streams.akamaized.net/hls/live/2110961/cbctoronto/master.m3u8", quality: "1080p" },
  { name: "CBC News BC", icon: "📰", url: "https://amagi-streams.akamaized.net/hls/live/2110960/cbcnewsbc/master.m3u8", quality: "1080p" },
  { name: "CBC Comedy", icon: "🎭", url: "https://amagi-streams.akamaized.net/hls/live/2110963/cbccomedy/master.m3u8", quality: "1080p" },
  { name: "CBC Heartland", icon: "❤️", url: "https://amagi-streams.akamaized.net/hls/live/2113391/cbcheartland/master.m3u8", quality: "1080p" },
  { name: "France 24 FR", icon: "🇫🇷", url: "https://static.france24.com/live/F24_FR_HI_HLS/live_tv.m3u8" },
  { name: "France 24 AR", icon: "🇫🇷", url: "https://static.france24.com/live/F24_AR_HI_HLS/live_tv.m3u8" },
  { name: "TRT World", icon: "🇹🇷", url: "https://tv-trtworld.medya.trt.com.tr/master.m3u8" },
];

const SPORT_KEYWORDS = [
  "bein", "sport", "eurosport", "sky sport", "espn", "fox sport",
  "arena sport", "digi sport", "supersport", "al kass", "dubai sport",
  "trt spor", "a spor", "sport tv", "canal+ sport"
];

const STORAGE_KEY = "tv-bein-custom-links";
const STREAMS_CACHE_KEY = "tv-iptv-streams-cache";
const STREAMS_CACHE_TTL = 30 * 60 * 1000;
const DEAD_CHANNELS_KEY = "tv-dead-channels";

const loadCustomLinks = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return Array(10).fill("");
};

const loadDeadChannels = (): Set<string> => {
  try {
    const saved = localStorage.getItem(DEAD_CHANNELS_KEY);
    if (saved) {
      const { urls, timestamp } = JSON.parse(saved);
      if (Date.now() - timestamp < 60 * 60 * 1000) return new Set(urls);
    }
  } catch {}
  return new Set();
};

const buildProxyUrl = (channel: Channel) => {
  const proxy = new URL(PROXY_FUNCTION_URL);
  proxy.searchParams.set("url", channel.url);
  if (channel.referrer) proxy.searchParams.set("ref", channel.referrer);
  if (channel.userAgent) proxy.searchParams.set("ua", channel.userAgent);
  return proxy.toString();
};

const HLSPlayer = ({
  url,
  playing,
  onError,
  onSuccess,
  authToken,
}: {
  url: string;
  playing: boolean;
  onError: () => void;
  onSuccess: () => void;
  authToken: string;
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const errorCountRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    setError(false);
    setLoading(true);
    errorCountRef.current = 0;
    loadedRef.current = false;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    timeoutRef.current = setTimeout(() => {
      if (!loadedRef.current) {
        setError(true);
        setLoading(false);
        onError();
      }
    }, 15000);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        fragLoadingTimeOut: 12000,
        manifestLoadingTimeOut: 12000,
        levelLoadingTimeOut: 12000,
        fragLoadingMaxRetry: 1,
        manifestLoadingMaxRetry: 1,
        levelLoadingMaxRetry: 1,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
          if (PUBLISHABLE_KEY) xhr.setRequestHeader("apikey", PUBLISHABLE_KEY);
          if (authToken) xhr.setRequestHeader("authorization", `Bearer ${authToken}`);
          xhr.setRequestHeader("x-client-info", "tv-player");
        },
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        loadedRef.current = true;
        setLoading(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (playing) {
          video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        }
        onSuccess();
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (!data.fatal) return;

        errorCountRef.current++;
        if (
          errorCountRef.current >= 2 ||
          data.details === "manifestLoadError" ||
          data.details === "manifestLoadTimeOut" ||
          data.details === "levelLoadError"
        ) {
          setError(true);
          setLoading(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          hls.destroy();
          onError();
        } else if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
          hls.startLoad();
        } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError();
        } else {
          setError(true);
          setLoading(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          hls.destroy();
          onError();
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener(
        "loadeddata",
        () => {
          loadedRef.current = true;
          setLoading(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          onSuccess();
        },
        { once: true }
      );
      video.addEventListener(
        "error",
        () => {
          setError(true);
          setLoading(false);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          onError();
        },
        { once: true }
      );
      if (playing) {
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    } else {
      setError(true);
      setLoading(false);
      onError();
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [url, playing, onError, onSuccess, authToken]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (playing) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [playing]);

  if (error) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-black absolute inset-0">
        <div className="text-center">
          <AlertTriangle className="w-10 h-10 text-accent mx-auto mb-2" />
          <p className="text-muted-foreground text-xs">Flux indisponible (CORS/Hors ligne)</p>
          <p className="text-muted-foreground text-[10px] mt-1">Essayez une autre chaîne</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black z-10">
          <Loader2 className="w-10 h-10 text-accent animate-spin" />
        </div>
      )}
      <video
        ref={videoRef}
        controls
        playsInline
        className="w-full h-full object-contain bg-black"
        style={{ position: "absolute", top: 0, left: 0 }}
      />
    </>
  );
};

const TVTab = () => {
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customLinks, setCustomLinks] = useState<string[]>(loadCustomLinks);
  const [playing, setPlaying] = useState(true);
  const [apiChannels, setApiChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [deadChannels, setDeadChannels] = useState<Set<string>>(loadDeadChannels);
  const [authToken, setAuthToken] = useState("");

  useEffect(() => {
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setAuthToken(data.session?.access_token || "");
    };
    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthToken(session?.access_token || "");
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const markDead = useCallback((url: string) => {
    setDeadChannels((prev) => {
      const next = new Set(prev);
      next.add(url);
      localStorage.setItem(DEAD_CHANNELS_KEY, JSON.stringify({ urls: Array.from(next), timestamp: Date.now() }));
      return next;
    });
  }, []);

  const markAlive = useCallback((url: string) => {
    setDeadChannels((prev) => {
      if (!prev.has(url)) return prev;
      const next = new Set(prev);
      next.delete(url);
      localStorage.setItem(DEAD_CHANNELS_KEY, JSON.stringify({ urls: Array.from(next), timestamp: Date.now() }));
      return next;
    });
  }, []);

  const fetchStreams = useCallback(async () => {
    setLoading(true);
    try {
      const cached = localStorage.getItem(STREAMS_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < STREAMS_CACHE_TTL) {
          setApiChannels(data);
          setLoading(false);
          return;
        }
      }

      const response = await fetch(STREAMS_API);
      if (!response.ok) throw new Error("Failed to fetch streams");
      const streams: StreamData[] = await response.json();

      const sportStreams = streams.filter((s) => {
        const title = s.title.toLowerCase();
        const isSport = SPORT_KEYWORDS.some((kw) => title.includes(kw));
        const isHLS = s.url.includes(".m3u8");
        return isSport && isHLS;
      });

      const seen = new Map<string, Channel>();
      for (const s of sportStreams) {
        const key = `${s.title.trim()}-${s.url}`;
        if (!seen.has(key)) {
          seen.set(key, {
            name: s.title,
            icon: "⚽",
            url: s.url,
            quality: s.quality || undefined,
            referrer: s.referrer || undefined,
            userAgent: s.user_agent || undefined,
          });
        }
      }

      const channels = Array.from(seen.values()).slice(0, 50);
      localStorage.setItem(STREAMS_CACHE_KEY, JSON.stringify({ data: channels, timestamp: Date.now() }));
      setApiChannels(channels);
      toast.success(`${channels.length} chaînes sport trouvées`);
    } catch (err) {
      console.error("Error fetching streams:", err);
      toast.error("Erreur de chargement des chaînes");
      setApiChannels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreams();
  }, [fetchStreams]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customLinks));
  }, [customLinks]);

  const customChannels: Channel[] = customLinks
    .map((url, i) => ({ name: `Custom ${i + 1}`, icon: "🔗", url: url.trim() }))
    .filter((ch) => ch.url.length > 0);

  const allChannels = [...FALLBACK_CHANNELS, ...apiChannels, ...customChannels];

  useEffect(() => {
    if (!activeChannel && allChannels.length > 0) setActiveChannel(allChannels[0]);
  }, [allChannels, activeChannel]);

  const handleChannelClick = (ch: Channel) => {
    if (!ch.url) {
      toast.error("Aucun lien configuré");
      return;
    }
    setActiveChannel(ch);
    setPlaying(true);
  };

  const skipToNext = useCallback(() => {
    if (!activeChannel) return;
    const idx = allChannels.findIndex((c) => c.url === activeChannel.url);
    const nextAlive = allChannels.slice(idx + 1).find((c) => !deadChannels.has(c.url));
    if (nextAlive) {
      setActiveChannel(nextAlive);
      setPlaying(true);
    } else {
      toast.error("Aucune autre chaîne disponible");
    }
  }, [activeChannel, allChannels, deadChannels]);

  const handleRefresh = () => {
    localStorage.removeItem(STREAMS_CACHE_KEY);
    localStorage.removeItem(DEAD_CHANNELS_KEY);
    setDeadChannels(new Set());
    fetchStreams();
  };

  const updateLink = (index: number, value: string) => {
    const updated = [...customLinks];
    updated[index] = value;
    setCustomLinks(updated);
  };

  const liveCount = allChannels.filter((c) => !deadChannels.has(c.url)).length;

  return (
    <div className="pb-4">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Tv className="w-5 h-5 text-accent" />
          TV en Direct
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={handleRefresh} disabled={loading} className="text-muted-foreground hover:text-accent">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)} className="text-muted-foreground hover:text-accent">
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="mx-3 rounded-2xl overflow-hidden border-2 border-accent/30 bg-black">
        <div className="aspect-video relative">
          {activeChannel?.url ? (
            <HLSPlayer
              url={buildProxyUrl(activeChannel)}
              playing={playing}
              authToken={authToken}
              onError={() => markDead(activeChannel.url)}
              onSuccess={() => markAlive(activeChannel.url)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-background aspect-video">
              {loading ? (
                <Loader2 className="w-12 h-12 text-accent animate-spin" />
              ) : (
                <div className="text-center">
                  <Tv className="w-16 h-16 text-accent/30 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">Sélectionnez une chaîne</p>
                </div>
              )}
            </div>
          )}
        </div>

        {activeChannel && (
          <div className="px-4 py-2.5 flex items-center gap-2 bg-card border-t border-border">
            <span className="text-lg">{activeChannel.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-foreground block truncate">{activeChannel.name}</span>
              {activeChannel.quality && <span className="text-[10px] text-muted-foreground">{activeChannel.quality}</span>}
            </div>
            <Button variant="ghost" size="sm" onClick={skipToNext} className="text-muted-foreground hover:text-accent p-1 h-auto">
              <SkipForward className="w-4 h-4" />
            </Button>
            {!deadChannels.has(activeChannel.url) && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-destructive text-white text-[10px] font-bold rounded-full shrink-0">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
            )}
          </div>
        )}
      </div>

      {!loading && (
        <div className="mx-3 mt-2 flex items-center gap-1.5 px-2">
          <Globe className="w-3 h-3 text-accent" />
          <span className="text-[10px] text-muted-foreground">
            {liveCount}/{allChannels.length} chaînes • Les chaînes barrées sont hors ligne
          </span>
        </div>
      )}

      <div className="px-3 py-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3 px-1">📺 CHAÎNES ({allChannels.length})</p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
            {allChannels.map((ch, i) => {
              const isDead = deadChannels.has(ch.url);
              const isActive = activeChannel?.name === ch.name && activeChannel?.url === ch.url;
              return (
                <button
                  key={`${ch.name}-${i}`}
                  onClick={() => handleChannelClick(ch)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95 relative ${
                    isActive
                      ? "border-accent bg-accent/10 shadow-md shadow-accent/20"
                      : isDead
                      ? "border-destructive/30 bg-card/50 opacity-50"
                      : "border-border bg-card hover:border-accent/50"
                  }`}
                >
                  <span className="text-2xl">{ch.icon}</span>
                  <span className={`text-[10px] font-medium leading-tight text-center line-clamp-2 ${isDead ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {ch.name}
                  </span>
                  {ch.quality && <span className="text-[8px] text-accent font-bold">{ch.quality}</span>}
                  {isDead ? (
                    <AlertTriangle className="w-3 h-3 text-destructive" />
                  ) : (
                    <Play className="w-3 h-3 text-accent" />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="mx-3 mb-4 rounded-2xl border-2 border-accent/30 bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">⚙️ Liens personnalisés</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}><X className="w-4 h-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Collez vos liens .m3u8. Sauvegarde automatique.</p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {customLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-14 shrink-0">Lien {i + 1}</span>
                  <Input value={link} onChange={(e) => updateLink(i, e.target.value)} placeholder="https://...m3u8" className="text-xs h-9 bg-secondary border-border" />
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full text-xs" onClick={() => { setCustomLinks(Array(10).fill("")); toast.success("Liens réinitialisés"); }}>
              🗑️ Réinitialiser
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TVTab;
