import { useState, useEffect, useCallback, useRef } from "react";
import Hls from "hls.js";
import { Tv, Settings, X, Play, RefreshCw, Loader2, Globe, Search, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const getYouTubeId = (url: string) => {
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
};

interface Channel {
  id: string;
  name: string;
  icon: string;
  url: string;
  category: string;
  quality?: string;
}

// --- CHAÎNES VÉRIFIÉES ET FONCTIONNELLES ---
const CHANNELS_DATA: Channel[] = [
  // === TUNISIE - Sources HLS vérifiées ===
  { id: "watania1", name: "Watania 1", url: "https://streaming.alwatanya.tn/live/w1/playlist.m3u8", category: "Tunisie", icon: "🇹🇳" },
  { id: "watania2", name: "Watania 2", url: "https://streaming.alwatanya.tn/live/w2/playlist.m3u8", category: "Tunisie", icon: "🇹🇳" },
  { id: "nessma-yt", name: "Nessma TV", url: "https://www.youtube.com/watch?v=xAZDxSrkyqc", category: "Tunisie", icon: "🇹🇳", quality: "YT" },
  { id: "mosaique", name: "Mosaïque FM TV", url: "https://webcam.mosaiquefm.net/mosatv/_definst_/studio/playlist.m3u8?DVR", category: "Tunisie", icon: "🇹🇳", quality: "1080p" },
  { id: "jawhara-tv", name: "Jawhara TV", url: "https://streaming.toutech.net/live/jtv/index.m3u8", category: "Tunisie", icon: "🇹🇳", quality: "720p" },
  // === INFOS INTERNATIONALES - YouTube Live (fiable, pas de CORS) ===
  { id: "aljazeera", name: "Al Jazeera Arabic", url: "https://www.youtube.com/watch?v=uPh_v39Cbow", category: "Infos", icon: "📡", quality: "YT" },
  { id: "aljazeera-en", name: "Al Jazeera English", url: "https://www.youtube.com/watch?v=gCNeDWCI0vo", category: "Infos", icon: "📡", quality: "YT" },
  { id: "france24", name: "France 24 FR", url: "https://www.youtube.com/watch?v=l8PMl7tUDIE", category: "Infos", icon: "🇫🇷", quality: "YT" },
  { id: "france24-ar", name: "France 24 Arabic", url: "https://www.youtube.com/watch?v=UsSxJrkYOD0", category: "Infos", icon: "🇫🇷", quality: "YT" },
  { id: "dw", name: "DW News", url: "https://www.youtube.com/watch?v=GE_SfNVNyqk", category: "Infos", icon: "🌍", quality: "YT" },
  { id: "dw-ar", name: "DW Arabic", url: "https://www.youtube.com/watch?v=xq9gRWBCx0s", category: "Infos", icon: "🌍", quality: "YT" },
  { id: "euronews", name: "Euronews FR", url: "https://www.youtube.com/watch?v=NiRIbKwGLlE", category: "Infos", icon: "🇪🇺", quality: "YT" },
  { id: "trt", name: "TRT World", url: "https://www.youtube.com/watch?v=CV5Fooi8YJE", category: "Infos", icon: "🇹🇷", quality: "YT" },
  { id: "rt-ar", name: "RT Arabic", url: "https://www.youtube.com/watch?v=OZTqFgkKnHc", category: "Infos", icon: "📡", quality: "YT" },
  { id: "sky-news-ar", name: "Sky News Arabia", url: "https://www.youtube.com/watch?v=cLFZepUSmPE", category: "Infos", icon: "📡", quality: "YT" },
  { id: "alarabiya", name: "Al Arabiya", url: "https://www.youtube.com/watch?v=1IZxnmJKbfk", category: "Infos", icon: "📡", quality: "YT" },
  // === SPORT ===
  { id: "bein-xtra", name: "beIN SPORTS Xtra", url: "https://www.youtube.com/watch?v=T_DEYhnqopI", category: "Sports", icon: "⚽", quality: "YT" },
  { id: "alkass", name: "Al Kass Sports", url: "https://www.youtube.com/watch?v=Gv4MJ3ypfA4", category: "Sports", icon: "⚽", quality: "YT" },
  // === SCIENCE / CULTURE ===
  { id: "nasa", name: "NASA TV", url: "https://www.youtube.com/watch?v=21X5lGlDOfg", category: "Science", icon: "🚀", quality: "YT" },
  { id: "cgtn", name: "CGTN", url: "https://www.youtube.com/watch?v=TUGjklKqkGk", category: "Infos", icon: "🌏", quality: "YT" },
  // === DIVERTISSEMENT ===
  { id: "rotana-cinema", name: "Rotana Cinema", url: "https://www.youtube.com/watch?v=AMZmHAzhko0", category: "Cinéma", icon: "🎬", quality: "YT" },
];

const STORAGE_KEY = "tv-bein-custom-links";
const STREAMS_CACHE_KEY = "tv-iptv-streams-cache";
const STREAMS_CACHE_TTL = 30 * 60 * 1000;
const STREAMS_API = "https://iptv-org.github.io/api/streams.json";

const SPORT_KEYWORDS = [
  "bein", "sport", "eurosport", "sky sport", "espn", "fox sport",
  "arena sport", "digi sport", "supersport", "al kass", "dubai sport",
  "trt spor", "a spor", "sport tv", "canal+ sport"
];

const loadCustomLinks = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return Array(10).fill("");
};

// Stream Player - handles HLS (.m3u8) and YouTube
const StreamPlayer = ({ url, onError }: { url: string; onError: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");

  useEffect(() => {
    if (isYouTube) return; // React Player handles YouTube
    const video = videoRef.current;
    if (!video || !url) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); }

    timeoutRef.current = setTimeout(() => onError(), 10000);

    const playVideo = () => {
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    };

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        xhrSetup: (xhr) => { xhr.withCredentials = false; },
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        playVideo();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else { if (timeoutRef.current) clearTimeout(timeoutRef.current); onError(); hls.destroy(); }
        }
      });
      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }, { once: true });
      playVideo();
    } else {
      onError();
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [url, isYouTube]);

  if (isYouTube) {
    const ytId = getYouTubeId(url);
    return (
      <iframe
        src={`https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`}
        className="w-full h-full absolute inset-0 border-0"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }

  return (
    <video
      ref={videoRef}
      controls
      playsInline
      className="w-full h-full object-contain bg-black absolute inset-0"
    />
  );
};

const TVTab = () => {
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customLinks, setCustomLinks] = useState<string[]>(loadCustomLinks);
  const [hasError, setHasError] = useState(false);
  const [search, setSearch] = useState("");
  const [apiChannels, setApiChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);

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
      if (!response.ok) throw new Error("Failed");
      const streams = await response.json();

      const sportStreams = streams.filter((s: any) => {
        const title = (s.title || "").toLowerCase();
        return SPORT_KEYWORDS.some((kw) => title.includes(kw)) && s.url?.includes(".m3u8");
      });

      const seen = new Map<string, Channel>();
      let idx = 0;
      for (const s of sportStreams) {
        const key = s.title?.trim();
        if (key && !seen.has(key)) {
          seen.set(key, {
            id: `api-${idx++}`,
            name: s.title,
            icon: "⚽",
            url: s.url,
            category: "Sports IPTV",
            quality: s.quality || undefined,
          });
        }
      }

      const channels = Array.from(seen.values()).slice(0, 50);
      localStorage.setItem(STREAMS_CACHE_KEY, JSON.stringify({ data: channels, timestamp: Date.now() }));
      setApiChannels(channels);
    } catch {
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
    .map((url, i) => ({ id: `custom-${i}`, name: `Custom ${i + 1}`, icon: "🔗", url: url.trim(), category: "Perso" }))
    .filter((ch) => ch.url.length > 0);

  const allChannels = [...CHANNELS_DATA, ...apiChannels, ...customChannels];

  // Set first channel on load
  useEffect(() => {
    if (!activeChannel && allChannels.length > 0) setActiveChannel(allChannels[0]);
  }, [allChannels.length]);

  const filteredChannels = allChannels.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.category.toLowerCase().includes(search.toLowerCase())
  );

  const categories = [...new Set(filteredChannels.map((c) => c.category))];

  const handleChannelClick = (ch: Channel) => {
    setHasError(false);
    setActiveChannel(ch);
  };

  const handleRefresh = () => {
    localStorage.removeItem(STREAMS_CACHE_KEY);
    fetchStreams();
    toast.success("Actualisation des chaînes...");
  };

  const handleRetry = () => {
    setHasError(false);
  };

  const updateLink = (index: number, value: string) => {
    const updated = [...customLinks];
    updated[index] = value;
    setCustomLinks(updated);
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="p-4 flex items-center justify-between bg-primary rounded-b-2xl mx-1">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-accent rounded-full flex items-center justify-center font-bold text-accent-foreground text-sm">M</div>
          <div>
            <h2 className="text-sm font-bold text-primary-foreground uppercase tracking-wide">Makshkheen TV</h2>
            <p className="text-[10px] text-primary-foreground/60 uppercase">En Direct</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={handleRefresh} disabled={loading} className="text-primary-foreground/70 hover:text-accent h-8 w-8">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          </Button>
          <Button variant="ghost" size="icon" onClick={() => setShowSettings(!showSettings)} className="text-primary-foreground/70 hover:text-accent h-8 w-8">
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Video Player */}
      <div className="mx-3 mt-3 rounded-2xl overflow-hidden border-2 border-accent/30 bg-black">
        <div className="aspect-video relative">
          {hasError ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 text-center p-6 z-10">
              <AlertTriangle className="w-10 h-10 text-accent mb-3" />
              <p className="font-bold text-foreground text-sm uppercase">Flux indisponible</p>
              <p className="text-[11px] text-muted-foreground mt-1">Le lien est expiré ou bloqué par CORS.<br/>Essayez une autre chaîne.</p>
              <Button size="sm" onClick={handleRetry} className="mt-4 bg-accent text-accent-foreground hover:bg-accent/80 text-xs font-bold uppercase">
                Réessayer
              </Button>
            </div>
          ) : activeChannel?.url ? (
            <StreamPlayer url={activeChannel.url} onError={() => setHasError(true)} />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-background aspect-video">
              {loading ? (
                <Loader2 className="w-10 h-10 text-accent animate-spin" />
              ) : (
                <div className="text-center">
                  <Tv className="w-14 h-14 text-accent/30 mx-auto mb-2" />
                  <p className="text-muted-foreground text-sm">Sélectionnez une chaîne</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Channel info bar */}
        {activeChannel && (
          <div className="px-4 py-2.5 flex items-center gap-2 bg-card border-t border-border">
            <div className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
            <span className="text-sm font-bold text-foreground flex-1 truncate">{activeChannel.name}</span>
            <span className="text-[10px] bg-accent text-accent-foreground px-2 py-0.5 rounded font-black uppercase">Live</span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="mx-3 mt-4 relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Rechercher une chaîne..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 h-10 bg-card border-border text-sm focus-visible:ring-accent"
        />
      </div>

      {/* API info */}
      {!loading && apiChannels.length > 0 && (
        <div className="mx-3 mt-2 flex items-center gap-1.5 px-1">
          <Globe className="w-3 h-3 text-accent" />
          <span className="text-[10px] text-muted-foreground">{apiChannels.length} chaînes sport via iptv-org</span>
        </div>
      )}

      {/* Channel Grid by category */}
      <div className="px-3 py-4 space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : (
          categories.map((cat) => {
            const catChannels = filteredChannels.filter((c) => c.category === cat);
            return (
              <div key={cat}>
                <p className="text-xs font-bold text-muted-foreground mb-2 px-1 uppercase tracking-wide">
                  {cat} ({catChannels.length})
                </p>
                <div className="space-y-1.5">
                  {catChannels.map((ch) => (
                    <button
                      key={ch.id}
                      onClick={() => handleChannelClick(ch)}
                      className={`flex items-center w-full p-3 rounded-xl transition-all border ${
                        activeChannel?.id === ch.id
                          ? "bg-accent/10 border-accent shadow-md shadow-accent/10"
                          : "bg-card border-border hover:border-accent/40"
                      }`}
                    >
                      <div className="w-10 h-10 bg-background rounded-lg flex items-center justify-center text-lg mr-3 border border-border shrink-0">
                        {ch.icon}
                      </div>
                      <div className="flex-1 text-left min-w-0">
                        <h4 className={`font-bold text-sm truncate ${activeChannel?.id === ch.id ? "text-accent" : "text-foreground"}`}>
                          {ch.name}
                        </h4>
                        <p className="text-[10px] text-muted-foreground uppercase">{ch.category}</p>
                      </div>
                      {ch.quality && <span className="text-[9px] text-accent font-bold mr-2">{ch.quality}</span>}
                      <Play className={`w-4 h-4 shrink-0 ${activeChannel?.id === ch.id ? "text-accent" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="mx-3 mb-4 rounded-2xl border-2 border-accent/30 bg-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground">⚙️ Liens personnalisés</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)} className="h-8 w-8"><X className="w-4 h-4" /></Button>
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
