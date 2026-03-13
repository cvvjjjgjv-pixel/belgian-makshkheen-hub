import { useState, useEffect, useCallback, useRef } from "react";
import Hls from "hls.js";
import { Tv, Settings, X, Play, RefreshCw, Loader2, Globe, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Channel {
  name: string;
  icon: string;
  url: string;
  quality?: string;
  referrer?: string | null;
  userAgent?: string | null;
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
const PROJECT_ID = import.meta.env.VITE_SUPABASE_PROJECT_ID;
const PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
const IPTV_PROXY_BASE_URL = PROJECT_ID
  ? `https://${PROJECT_ID}.supabase.co/functions/v1/iptv-stream-proxy`
  : "";

// These are known-working public streams with proper CORS headers
const RELIABLE_CHANNELS: Channel[] = [
  { name: "Al Jazeera Arabic", icon: "📡", url: "https://live-hls-web-aj.getaj.net/AJAR/index.m3u8", quality: "HD" },
  { name: "Al Jazeera English", icon: "📡", url: "https://live-hls-web-aje.getaj.net/AJE/index.m3u8", quality: "HD" },
  { name: "France 24 FR", icon: "🇫🇷", url: "https://static.france24.com/live/F24_FR_HI_HLS/live_tv.m3u8", quality: "HD" },
  { name: "France 24 EN", icon: "🇫🇷", url: "https://static.france24.com/live/F24_EN_HI_HLS/live_tv.m3u8", quality: "HD" },
  { name: "France 24 AR", icon: "🇫🇷", url: "https://static.france24.com/live/F24_AR_HI_HLS/live_tv.m3u8", quality: "HD" },
  { name: "NASA TV", icon: "🚀", url: "https://ntv1.akamaized.net/hls/live/2014049/NASA-NTV1-HLS/master.m3u8", quality: "HD" },
  { name: "DW Deutsch", icon: "🇩🇪", url: "https://dwamdstream104.akamaized.net/hls/live/2015530/dwstream104/index.m3u8", quality: "HD" },
  { name: "DW English", icon: "🇬🇧", url: "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8", quality: "HD" },
  { name: "DW Arabic", icon: "🌍", url: "https://dwamdstream103.akamaized.net/hls/live/2015526/dwstream103/index.m3u8", quality: "HD" },
  { name: "TRT World", icon: "🇹🇷", url: "https://tv-trtworld.medya.trt.com.tr/master.m3u8", quality: "HD" },
  { name: "CGTN", icon: "🇨🇳", url: "https://news.cgtn.com/resource/live/english/cgtn-news.m3u8", quality: "HD" },
  { name: "RT", icon: "📺", url: "https://rt-glb.rttv.com/live/rtnews/playlist.m3u8", quality: "HD" },
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

const buildChannelPlaybackUrl = (channel: Channel) => {
  if (!IPTV_PROXY_BASE_URL) return channel.url;

  const params = new URLSearchParams({ url: channel.url });
  if (channel.referrer) params.set("referrer", channel.referrer);
  if (channel.userAgent) params.set("user_agent", channel.userAgent);

  return `${IPTV_PROXY_BASE_URL}?${params.toString()}`;
};

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
      // Reset dead list every hour
      if (Date.now() - timestamp < 60 * 60 * 1000) return new Set(urls);
    }
  } catch {}
  return new Set();
};

// HLS Video Player component with fast failure
const HLSPlayer = ({ url, playing, onError }: { url: string; playing: boolean; onError?: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const retryCount = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    setError(false);
    setLoading(true);
    retryCount.current = 0;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Timeout: if nothing loads in 8 seconds, mark as dead
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        setError(true);
        setLoading(false);
        onError?.();
        if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
        }
      }
    }, 8000);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingMaxRetry: 1,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 1,
        fragLoadingMaxRetry: 1,
        xhrSetup: (xhr, requestUrl) => {
          xhr.withCredentials = false;
          if (IPTV_PROXY_BASE_URL && requestUrl?.startsWith(IPTV_PROXY_BASE_URL) && PUBLISHABLE_KEY) {
            xhr.setRequestHeader("apikey", PUBLISHABLE_KEY);
            xhr.setRequestHeader("Authorization", `Bearer ${PUBLISHABLE_KEY}`);
          }
        },
      });

      hls.loadSource(url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        if (playing) {
          video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          retryCount.current++;
          if (retryCount.current >= 2) {
            setError(true);
            setLoading(false);
            onError?.();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            hls.destroy();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            setError(true);
            setLoading(false);
            onError?.();
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            hls.destroy();
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("canplay", () => {
        setLoading(false);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }, { once: true });
      video.addEventListener("error", () => {
        setError(true);
        setLoading(false);
        onError?.();
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }, { once: true });
      if (playing) {
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    } else {
      setError(true);
      setLoading(false);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [url]);

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
          <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-2" />
          <p className="text-muted-foreground text-xs">Flux indisponible (CORS/hors ligne)</p>
          <p className="text-muted-foreground text-[10px] mt-1">Essayez une autre chaîne</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full absolute inset-0">
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
      />
    </div>
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

  const markDead = useCallback((url: string) => {
    setDeadChannels(prev => {
      const next = new Set(prev);
      next.add(url);
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
        const key = s.title.trim();
        if (!seen.has(key)) {
          seen.set(key, {
            name: s.title,
            icon: "⚽",
            url: s.url,
            quality: s.quality || undefined,
            referrer: s.referrer,
            userAgent: s.user_agent,
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

  useEffect(() => { fetchStreams(); }, [fetchStreams]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customLinks));
  }, [customLinks]);

  const customChannels: Channel[] = customLinks
    .map((url, i) => ({ name: `Custom ${i + 1}`, icon: "🔗", url: url.trim() }))
    .filter((ch) => ch.url.length > 0);

  // Reliable channels first, then API, then custom
  const allChannels = [...RELIABLE_CHANNELS, ...apiChannels, ...customChannels];

  useEffect(() => {
    if (!activeChannel && allChannels.length > 0) {
      // Start with first reliable channel
      setActiveChannel(RELIABLE_CHANNELS[0]);
    }
  }, [allChannels.length]);

  const handleChannelClick = (ch: Channel) => {
    if (!ch.url) { toast.error("Aucun lien configuré"); return; }
    setActiveChannel(ch);
    setPlaying(true);
  };

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

  const isActive = (ch: Channel) => activeChannel?.name === ch.name && activeChannel?.url === ch.url;
  const isDead = (ch: Channel) => deadChannels.has(ch.url);

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

      {/* Video Player */}
      <div className="mx-3 rounded-2xl overflow-hidden border-2 border-accent/30 bg-black">
        <div className="aspect-video relative">
          {activeChannel?.url ? (
            <HLSPlayer
              url={activeChannel.url}
              playing={playing}
              onError={() => markDead(activeChannel.url)}
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
            <span className="flex items-center gap-1 px-2 py-0.5 bg-destructive text-white text-[10px] font-bold rounded-full shrink-0">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mx-3 mt-2 flex items-center gap-1.5 px-2">
        <Globe className="w-3 h-3 text-accent" />
        <span className="text-[10px] text-muted-foreground">
          {RELIABLE_CHANNELS.length} fiables + {apiChannels.length} sport (certaines peuvent être hors ligne)
        </span>
      </div>

      {/* Channel Grid */}
      <div className="px-3 py-4">
        {/* Reliable Section */}
        <p className="text-xs font-semibold text-accent mb-3 px-1">✅ CHAÎNES FIABLES ({RELIABLE_CHANNELS.length})</p>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {RELIABLE_CHANNELS.map((ch, i) => (
            <button
              key={`reliable-${i}`}
              onClick={() => handleChannelClick(ch)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95 ${
                isActive(ch)
                  ? "border-accent bg-accent/10 shadow-md shadow-accent/20"
                  : "border-border bg-card hover:border-accent/50"
              }`}
            >
              <span className="text-2xl">{ch.icon}</span>
              <span className="text-[10px] font-medium text-foreground leading-tight text-center line-clamp-2">{ch.name}</span>
              {ch.quality && <span className="text-[8px] text-green-500 font-bold">{ch.quality}</span>}
            </button>
          ))}
        </div>

        {/* Sport Streams Section */}
        <p className="text-xs font-semibold text-muted-foreground mb-3 px-1">⚽ SPORT IPTV ({apiChannels.length})</p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : apiChannels.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-4">Aucune chaîne sport trouvée</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
            {apiChannels.map((ch, i) => {
              const dead = isDead(ch);
              return (
                <button
                  key={`api-${i}`}
                  onClick={() => handleChannelClick(ch)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95 relative ${
                    dead
                      ? "border-destructive/30 bg-destructive/5 opacity-50"
                      : isActive(ch)
                        ? "border-accent bg-accent/10 shadow-md shadow-accent/20"
                        : "border-border bg-card hover:border-accent/50"
                  }`}
                >
                  {dead && <AlertTriangle className="w-3 h-3 text-destructive absolute top-1 right-1" />}
                  <span className="text-2xl">{ch.icon}</span>
                  <span className="text-[10px] font-medium text-foreground leading-tight text-center line-clamp-2">{ch.name}</span>
                  {ch.quality && <span className="text-[8px] text-accent font-bold">{ch.quality}</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Custom */}
        {customChannels.length > 0 && (
          <>
            <p className="text-xs font-semibold text-muted-foreground mb-3 mt-4 px-1">🔗 PERSONNALISÉES ({customChannels.length})</p>
            <div className="grid grid-cols-3 gap-2">
              {customChannels.map((ch, i) => (
                <button
                  key={`custom-${i}`}
                  onClick={() => handleChannelClick(ch)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95 ${
                    isActive(ch)
                      ? "border-accent bg-accent/10 shadow-md shadow-accent/20"
                      : "border-border bg-card hover:border-accent/50"
                  }`}
                >
                  <span className="text-2xl">{ch.icon}</span>
                  <span className="text-[10px] font-medium text-foreground leading-tight text-center line-clamp-2">{ch.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="mx-3 mb-4 rounded-2xl border-2 border-accent/30 bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">⚙️ Liens personnalisés</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}><X className="w-4 h-4" /></Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Collez vos liens .m3u8 fonctionnels. Beaucoup de flux IPTV sont bloqués par CORS dans le navigateur.</p>
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
