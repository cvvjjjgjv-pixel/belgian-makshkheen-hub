import { useState, useEffect, useCallback, useRef } from "react";
import Hls from "hls.js";
import { Tv, Settings, X, Play, RefreshCw, Loader2, Globe, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Channel {
  name: string;
  icon: string;
  url: string;
  quality?: string;
  category?: string;
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

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const PROXY_URL = `${SUPABASE_URL}/functions/v1/stream-proxy`;
const STREAMS_API = "https://iptv-org.github.io/api/streams.json";

const proxyUrl = (url: string) => `${PROXY_URL}?url=${encodeURIComponent(url)}`;

// beIN Sports are prioritized first
const BEIN_KEYWORDS = ["bein sport", "bein sports", "beinsport"];
const SPORT_KEYWORDS = [
  ...BEIN_KEYWORDS,
  "eurosport", "sky sport", "espn", "fox sport",
  "arena sport", "digi sport", "supersport", "al kass", "dubai sport",
  "trt spor", "a spor", "sport tv", "canal+ sport", "sport klub",
  "bt sport", "tsn", "nba", "nfl", "mbc sport"
];

const FALLBACK_CHANNELS: Channel[] = [
  { name: "Al Jazeera Arabic", icon: "📡", url: "https://live-hls-web-aj.getaj.net/AJAR/index.m3u8", category: "info" },
  { name: "France 24 FR", icon: "🇫🇷", url: "https://static.france24.com/live/F24_FR_HI_HLS/live_tv.m3u8", category: "info" },
  { name: "NASA TV", icon: "🚀", url: "https://ntv1.akamaized.net/hls/live/2014049/NASA-NTV1-HLS/master.m3u8", category: "info" },
];

const STORAGE_KEY = "tv-bein-custom-links";
const STREAMS_CACHE_KEY = "tv-iptv-streams-cache-v2";
const STREAMS_CACHE_TTL = 30 * 60 * 1000;

const loadCustomLinks = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return Array(10).fill("");
};

// HLS Video Player component
const HLSPlayer = ({ url, playing, useProxy }: { url: string; playing: boolean; useProxy: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [error, setError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    setError(false);
    setRetryCount(0);

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Determine the actual URL to load
    const streamUrl = useProxy ? proxyUrl(url) : url;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        manifestLoadingMaxRetry: 3,
        manifestLoadingRetryDelay: 2000,
        levelLoadingMaxRetry: 3,
        fragLoadingMaxRetry: 3,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (playing) {
          video.play().catch(() => {
            video.muted = true;
            video.play().catch(() => {});
          });
        }
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data.type, data.details);
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              if (retryCount < 2) {
                setRetryCount(prev => prev + 1);
                setTimeout(() => hls.startLoad(), 2000);
              } else {
                setError(true);
                hls.destroy();
              }
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setError(true);
              hls.destroy();
              break;
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = streamUrl;
      if (playing) {
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }
    } else {
      setError(true);
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [url, useProxy]);

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
          <X className="w-10 h-10 text-destructive mx-auto mb-2" />
          <p className="text-muted-foreground text-xs">Flux indisponible</p>
          <p className="text-muted-foreground text-[10px] mt-1">Essayez une autre chaîne</p>
        </div>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      autoPlay
      muted
      className="w-full h-full object-contain bg-black absolute inset-0"
    />
  );
};

const TVTab = () => {
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customLinks, setCustomLinks] = useState<string[]>(loadCustomLinks);
  const [playing, setPlaying] = useState(true);
  const [apiChannels, setApiChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [useProxy, setUseProxy] = useState(true);

  const fetchStreams = useCallback(async (forceRefresh = false) => {
    setLoading(true);
    try {
      if (!forceRefresh) {
        const cached = localStorage.getItem(STREAMS_CACHE_KEY);
        if (cached) {
          const { data, timestamp } = JSON.parse(cached);
          if (Date.now() - timestamp < STREAMS_CACHE_TTL) {
            setApiChannels(data);
            if (!activeChannel && data.length > 0) setActiveChannel(data[0]);
            setLoading(false);
            return;
          }
        }
      }

      const response = await fetch(STREAMS_API);
      if (!response.ok) throw new Error("Failed to fetch streams");
      const streams: StreamData[] = await response.json();

      // Filter sport streams, prioritize beIN
      const sportStreams = streams.filter((s) => {
        const title = s.title.toLowerCase();
        const isSport = SPORT_KEYWORDS.some((kw) => title.includes(kw));
        const isHLS = s.url.includes(".m3u8");
        return isSport && isHLS;
      });

      // Separate beIN and others
      const beinStreams: Channel[] = [];
      const otherStreams: Channel[] = [];
      const seen = new Set<string>();

      for (const s of sportStreams) {
        const key = s.title.trim().toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const isBeIn = BEIN_KEYWORDS.some(kw => key.includes(kw));
        const channel: Channel = {
          name: s.title,
          icon: isBeIn ? "🏆" : "⚽",
          url: s.url,
          quality: s.quality || undefined,
          category: isBeIn ? "bein" : "sport",
        };

        if (isBeIn) {
          beinStreams.push(channel);
        } else {
          otherStreams.push(channel);
        }
      }

      // beIN first, then others, max 80
      const channels = [...beinStreams, ...otherStreams].slice(0, 80);
      localStorage.setItem(STREAMS_CACHE_KEY, JSON.stringify({ data: channels, timestamp: Date.now() }));
      setApiChannels(channels);
      if (!activeChannel && channels.length > 0) setActiveChannel(channels[0]);
      toast.success(`${beinStreams.length} beIN + ${otherStreams.length} sport chaînes trouvées`);
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
    .map((url, i) => ({ name: `Custom ${i + 1}`, icon: "🔗", url: url.trim(), category: "custom" }))
    .filter((ch) => ch.url.length > 0);

  const allChannels = [...apiChannels, ...FALLBACK_CHANNELS, ...customChannels];

  const filteredChannels = searchQuery.trim()
    ? allChannels.filter(ch => ch.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : allChannels;

  // Group channels
  const beinChannels = filteredChannels.filter(ch => ch.category === "bein");
  const sportChannels = filteredChannels.filter(ch => ch.category === "sport");
  const infoChannels = filteredChannels.filter(ch => ch.category === "info");
  const customChs = filteredChannels.filter(ch => ch.category === "custom");

  useEffect(() => {
    if (!activeChannel && allChannels.length > 0) setActiveChannel(allChannels[0]);
  }, [allChannels, activeChannel]);

  const handleChannelClick = (ch: Channel) => {
    if (!ch.url) { toast.error("Aucun lien configuré"); return; }
    setActiveChannel(ch);
    setPlaying(true);
  };

  const handleRefresh = () => {
    localStorage.removeItem(STREAMS_CACHE_KEY);
    fetchStreams(true);
  };

  const updateLink = (index: number, value: string) => {
    const updated = [...customLinks];
    updated[index] = value;
    setCustomLinks(updated);
  };

  // Check if current channel needs proxy (non-fallback channels need it)
  const needsProxy = activeChannel ? !FALLBACK_CHANNELS.some(f => f.url === activeChannel.url) : false;

  const renderChannelGroup = (title: string, channels: Channel[], emoji: string) => {
    if (channels.length === 0) return null;
    return (
      <div className="mb-4">
        <p className="text-xs font-semibold text-muted-foreground mb-2 px-1">
          {emoji} {title} ({channels.length})
        </p>
        <div className="grid grid-cols-3 gap-2">
          {channels.map((ch, i) => (
            <button
              key={`${ch.name}-${i}`}
              onClick={() => handleChannelClick(ch)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95 ${
                activeChannel?.name === ch.name && activeChannel?.url === ch.url
                  ? "border-accent bg-accent/10 shadow-md shadow-accent/20"
                  : "border-border bg-card hover:border-accent/50"
              }`}
            >
              <span className="text-2xl">{ch.icon}</span>
              <span className="text-[10px] font-medium text-foreground leading-tight text-center line-clamp-2">{ch.name}</span>
              {ch.quality && <span className="text-[8px] text-accent font-bold">{ch.quality}</span>}
              <Play className="w-3 h-3 text-accent" />
            </button>
          ))}
        </div>
      </div>
    );
  };

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
            <HLSPlayer url={activeChannel.url} playing={playing} useProxy={useProxy && needsProxy} />
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
            <button
              onClick={() => setUseProxy(!useProxy)}
              className={`text-[9px] px-2 py-0.5 rounded-full border ${useProxy ? "border-accent text-accent" : "border-border text-muted-foreground"}`}
            >
              {useProxy ? "Proxy ON" : "Proxy OFF"}
            </button>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-destructive text-white text-[10px] font-bold rounded-full shrink-0">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mx-3 mt-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une chaîne..."
            className="pl-9 text-xs h-9 bg-card border-border"
          />
        </div>
      </div>

      {!loading && apiChannels.length > 0 && (
        <div className="mx-3 mt-2 flex items-center gap-1.5 px-2">
          <Globe className="w-3 h-3 text-accent" />
          <span className="text-[10px] text-muted-foreground">
            {apiChannels.filter(c => c.category === "bein").length} beIN Sports + {apiChannels.filter(c => c.category === "sport").length} sport
          </span>
        </div>
      )}

      {/* Channel Grid - Grouped */}
      <div className="px-3 py-4 max-h-[500px] overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : (
          <>
            {renderChannelGroup("beIN SPORTS", beinChannels, "🏆")}
            {renderChannelGroup("SPORT", sportChannels, "⚽")}
            {renderChannelGroup("INFO", infoChannels, "📺")}
            {renderChannelGroup("CUSTOM", customChs, "🔗")}
            {filteredChannels.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-8">Aucune chaîne trouvée</p>
            )}
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
            <p className="text-xs text-muted-foreground mb-3">Collez vos liens .m3u8. Le proxy contourne les restrictions CORS.</p>
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
