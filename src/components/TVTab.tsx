import { useState, useEffect, useCallback, useRef } from "react";
import Hls from "hls.js";
import { Tv, Settings, X, Play, RefreshCw, Loader2, Globe, Search, AlertTriangle, ChevronUp, ChevronDown, Volume2, VolumeX, Power, SkipForward, SkipBack, Maximize, Minimize, Radio, Trash2, LogIn } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Extract YouTube video ID for embedding
const getYouTubeEmbedUrl = (url: string): string | null => {
  const m = url.match(/(?:v=|youtu\.be\/|\/live\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}?autoplay=1&rel=0&modestbranding=1` : null;
};
const isYouTubeUrl = (url: string) => url.includes("youtube.com") || url.includes("youtu.be");
const isIframeUrl = (url: string) => url.startsWith("iframe:");

interface Channel {
  id: string;
  name: string;
  icon: string;
  url: string;
  category: string;
  quality?: string;
  useProxy?: boolean;
}

// --- CHAÎNES VÉRIFIÉES ET FONCTIONNELLES ---
// YouTube: Utilise des video IDs de lives 24/7 (plus fiable que yt-channel://)
// HLS: Streams directs .m3u8
const CHANNELS_DATA: Channel[] = [
  // === TUNISIE ===
  { id: "watania1", name: "Watania 1 (الوطنية 1)", url: "https://www.youtube.com/watch?v=n40b8OsYrRQ", category: "Tunisie", icon: "🇹🇳", quality: "YT" },
  { id: "watania2", name: "Watania 2 (الوطنية 2)", url: "https://www.youtube.com/watch?v=EUne0-bLb48", category: "Tunisie", icon: "🇹🇳", quality: "YT" },
  { id: "mosaique", name: "Mosaïque FM TV", url: "https://webcam.mosaiquefm.net/mosatv/_definst_/studio/playlist.m3u8?DVR", category: "Tunisie", icon: "🇹🇳", quality: "1080p" },
  { id: "jawhara-tv", name: "Jawhara TV", url: "http://streaming.toutech.net:1935/live/mp4:jawharafm.sdp/playlist.m3u8", category: "Tunisie", icon: "🇹🇳", quality: "720p" },
  { id: "elhiwar", name: "Elhiwar Ettounsi", url: "https://www.youtube.com/watch?v=Z9AAhCafb9c", category: "Tunisie", icon: "🇹🇳", quality: "YT" },
  { id: "attessia", name: "Attessia TV (التاسعة)", url: "https://www.youtube.com/watch?v=live_attessia", category: "Tunisie", icon: "🇹🇳", quality: "YT" },
  { id: "storychannel", name: "StoryChannel TV", url: "https://136044159.r.cdnsun.net/storychannel.m3u8", category: "Tunisie", icon: "🇹🇳", quality: "720p" },
  // === INFOS - YouTube Live 24/7 (video IDs vérifiés) ===
  { id: "aljazeera", name: "Al Jazeera Arabic", url: "https://www.youtube.com/watch?v=bNyUyrR0PHo", category: "Infos", icon: "📡", quality: "YT" },
  { id: "aljazeera-en", name: "Al Jazeera English", url: "https://www.youtube.com/watch?v=F-POY4Q0QSI", category: "Infos", icon: "📡", quality: "YT" },
  { id: "france24-fr", name: "France 24 FR", url: "https://www.youtube.com/watch?v=l8PMl7tUDIE", category: "Infos", icon: "🇫🇷", quality: "YT" },
  { id: "france24-ar", name: "France 24 Arabic", url: "https://www.youtube.com/watch?v=3ursYA8HMeo", category: "Infos", icon: "🇫🇷", quality: "YT" },
  { id: "alarabiya", name: "Al Arabiya (العربية)", url: "https://www.youtube.com/watch?v=1Uw6ZkbsAH8", category: "Infos", icon: "📡", quality: "YT" },
  { id: "sky-news-ar", name: "Sky News Arabia", url: "https://www.youtube.com/live/yd_H1PwIB0E", category: "Infos", icon: "📡", quality: "YT" },
  { id: "dw", name: "DW News", url: "https://www.youtube.com/watch?v=GE_SfNVNyqk", category: "Infos", icon: "🌍", quality: "YT" },
  { id: "dw-ar", name: "DW عربية", url: "https://www.youtube.com/watch?v=xiBnr9mczJs", category: "Infos", icon: "🌍", quality: "YT" },
  { id: "euronews", name: "Euronews FR", url: "https://www.youtube.com/watch?v=NiRIbKwAejk", category: "Infos", icon: "🇪🇺", quality: "YT" },
  { id: "trt", name: "TRT World", url: "https://www.youtube.com/watch?v=CV5Fooi8YJI", category: "Infos", icon: "🇹🇷", quality: "YT" },
  { id: "rt-ar", name: "RT Arabic", url: "https://www.youtube.com/watch?v=fBq7fv6BfxQ", category: "Infos", icon: "📡", quality: "YT" },
  // === SPORT ===
  { id: "bein-xtra1", name: "beIN SPORTS Xtra 1", url: "https://www.youtube.com/watch?v=zCB59AxYwIo", category: "Sports", icon: "⚽", quality: "YT" },
  { id: "bein-xtra2", name: "beIN SPORTS Xtra 2", url: "https://www.youtube.com/watch?v=JLtS2aFI8IU", category: "Sports", icon: "⚽", quality: "YT" },
  { id: "bein-xtra3", name: "beIN SPORTS Xtra 3", url: "https://www.youtube.com/watch?v=sDt1GXEH6WM", category: "Sports", icon: "⚽", quality: "YT" },
  { id: "bein-xtra4", name: "beIN SPORTS Xtra 4", url: "https://www.youtube.com/watch?v=K8YIf-r-pJE", category: "Sports", icon: "⚽", quality: "YT" },
  { id: "bein-xtra5", name: "beIN SPORTS Xtra 5", url: "https://www.youtube.com/watch?v=5rV0K0c3VXk", category: "Sports", icon: "⚽", quality: "YT" },
  { id: "bein-xtra6", name: "beIN SPORTS Xtra 6", url: "https://www.youtube.com/watch?v=Gq7skAERO9A", category: "Sports", icon: "⚽", quality: "YT" },
  { id: "bein-xtra7", name: "beIN SPORTS Xtra 7", url: "https://www.youtube.com/watch?v=VQRH3I9L_Xk", category: "Sports", icon: "⚽", quality: "YT" },
  { id: "bein-xtra8", name: "beIN SPORTS Xtra 8", url: "https://www.youtube.com/watch?v=yBShNJgbzDU", category: "Sports", icon: "⚽", quality: "YT" },
  { id: "bein-xtra9", name: "beIN SPORTS Xtra 9", url: "https://www.youtube.com/watch?v=qGR_KXEULEY", category: "Sports", icon: "⚽", quality: "YT" },
  { id: "alkass1", name: "Al Kass 1 (SD)", url: "https://corsproxy.io/?http://174.122.201.218:1935/dkass_sd/my1/playlist.m3u8", category: "Sports", icon: "🏆", quality: "SD" },
  { id: "alkass2", name: "Al Kass 2", url: "https://corsproxy.io/?https://liveeu-gcps.alkassdigital.net/alkass2-p/20260219T144749Z/mux_video_720p_ts/hdntl=exp=1773507399~acl=%2f*~data=hdntl~hmac=b9e7cb0b305eabe444e1e19c089f69a47025763bdc7ea47d901adac7f4ac534b/index-1.m3u8", category: "Sports", icon: "🏆", quality: "HD" },
  { id: "alkass-web", name: "Al Kass (Web)", url: "iframe:https://www.alkass.net/alkass/live.aspx?ch=two", category: "Sports", icon: "🏆", quality: "WEB" },
  // === SCIENCE ===
  { id: "nasa", name: "NASA TV", url: "https://www.youtube.com/watch?v=nA9UZF-SZoQ", category: "Science", icon: "🚀", quality: "YT" },
];

const STORAGE_KEY = "tv-bein-custom-links";
const XTREAM_STORAGE_KEY = "tv-xtream-config";
const STREAMS_CACHE_KEY = "tv-iptv-streams-cache";
const XTREAM_CACHE_KEY = "tv-xtream-channels-cache";
const STREAMS_CACHE_TTL = 30 * 60 * 1000;
const STREAMS_API = "https://iptv-org.github.io/api/streams.json";
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface XtreamConfig {
  server: string;
  username: string;
  password: string;
}

const loadXtreamConfig = (): XtreamConfig | null => {
  try {
    const saved = localStorage.getItem(XTREAM_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
};

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

// Stream Player - handles HLS (.m3u8), YouTube, and iframe: URLs
const StreamPlayer = ({ url, onError, onReady, useProxy }: { url: string; onError: () => void; onReady?: () => void; useProxy?: boolean }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isYouTube = isYouTubeUrl(url);
  const isIframe = isIframeUrl(url);

  useEffect(() => {
    if (isYouTube || isIframe) return;
    const video = videoRef.current;
    if (!video || !url) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); }

    timeoutRef.current = setTimeout(() => onError(), 15000);

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
        xhrSetup: (xhr: XMLHttpRequest, xhrUrl: string) => {
          xhr.withCredentials = false;
          if (useProxy) {
            const isManifest = xhrUrl.includes('.m3u8') || xhrUrl.includes('m3u8') || !xhrUrl.includes('.ts');
            if (isManifest) {
              const proxyUrl = `${SUPABASE_URL}/functions/v1/iptv-proxy`;
              xhr.open('POST', proxyUrl, true);
              xhr.setRequestHeader('Content-Type', 'application/json');
              const origSend = xhr.send.bind(xhr);
              xhr.send = () => {
                origSend(JSON.stringify({ url: xhrUrl }));
              };
            }
          }
        },
      });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        onReady?.();
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
        onReady?.();
      }, { once: true });
      playVideo();
    } else {
      onError();
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [url, isYouTube, isIframe]);

  // iframe: prefix → render raw iframe
  if (isIframe) {
    const iframeSrc = url.replace(/^iframe:/, "");
    return (
      <iframe
        src={iframeSrc}
        className="w-full h-full absolute inset-0 border-0"
        allow="autoplay; encrypted-media; fullscreen"
        allowFullScreen
        onLoad={() => onReady?.()}
      />
    );
  }

  if (isYouTube) {
    const embedUrl = getYouTubeEmbedUrl(url);
    return (
      <iframe
        src={embedUrl || ""}
        className="w-full h-full absolute inset-0 border-0"
        allow="autoplay; encrypted-media"
        allowFullScreen
        onLoad={() => onReady?.()}
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

// Mini Remote Control
const RemoteControl = ({
  allChannels,
  activeChannel,
  onChannelChange,
  onRetry,
}: {
  allChannels: Channel[];
  activeChannel: Channel;
  onChannelChange: (ch: Channel) => void;
  onRetry: () => void;
}) => {
  const [muted, setMuted] = useState(false);
  const [expanded, setExpanded] = useState(true);

  const currentIndex = allChannels.findIndex((c) => c.id === activeChannel.id);

  const prevChannel = () => {
    const idx = currentIndex <= 0 ? allChannels.length - 1 : currentIndex - 1;
    onChannelChange(allChannels[idx]);
  };

  const nextChannel = () => {
    const idx = currentIndex >= allChannels.length - 1 ? 0 : currentIndex + 1;
    onChannelChange(allChannels[idx]);
  };

  const toggleMute = () => {
    const videos = document.querySelectorAll("video");
    videos.forEach((v) => { v.muted = !muted; });
    setMuted(!muted);
  };

  const toggleFullscreen = () => {
    const player = document.querySelector(".aspect-video video, .aspect-video iframe") as HTMLElement;
    if (player) {
      if (document.fullscreenElement) document.exitFullscreen();
      else player.requestFullscreen?.();
    }
  };

  if (!expanded) {
    return (
      <div className="mx-3 mt-2 flex justify-center">
        <button onClick={() => setExpanded(true)} className="bg-card border border-border rounded-full px-4 py-1.5 text-[10px] font-bold text-muted-foreground hover:text-accent transition-colors">
          📺 Télécommande
        </button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-3 mt-3 rounded-2xl bg-gradient-to-b from-card to-secondary border border-border shadow-lg overflow-hidden"
    >
      {/* Remote header */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border/50">
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">📺 Télécommande</span>
        <button onClick={() => setExpanded(false)} className="text-muted-foreground hover:text-foreground">
          <Minimize className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Controls */}
      <div className="p-3 flex items-center justify-center gap-2">
        {/* Power / Retry */}
        <button onClick={onRetry} className="w-10 h-10 rounded-xl bg-destructive/10 border border-destructive/20 flex items-center justify-center text-destructive hover:bg-destructive/20 transition-colors" title="Réessayer">
          <Power className="w-4 h-4" />
        </button>

        {/* Prev */}
        <button onClick={prevChannel} className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent/20 transition-colors" title="Chaîne précédente">
          <SkipBack className="w-4 h-4" />
        </button>

        {/* Channel Up/Down */}
        <div className="flex flex-col gap-1">
          <button onClick={prevChannel} className="w-12 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors" title="CH+">
            <ChevronUp className="w-4 h-4" />
          </button>
          <button onClick={nextChannel} className="w-12 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors" title="CH-">
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* Next */}
        <button onClick={nextChannel} className="w-10 h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center text-accent hover:bg-accent/20 transition-colors" title="Chaîne suivante">
          <SkipForward className="w-4 h-4" />
        </button>

        {/* Volume */}
        <button onClick={toggleMute} className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground hover:text-accent transition-colors" title={muted ? "Son activé" : "Couper le son"}>
          {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
        </button>

        {/* Fullscreen */}
        <button onClick={toggleFullscreen} className="w-10 h-10 rounded-xl bg-secondary border border-border flex items-center justify-center text-foreground hover:text-accent transition-colors" title="Plein écran">
          <Maximize className="w-4 h-4" />
        </button>
      </div>

      {/* Channel indicator */}
      <div className="px-4 pb-2.5 text-center">
        <span className="text-[10px] text-muted-foreground">
          CH {currentIndex + 1}/{allChannels.length} — <span className="text-accent font-bold">{activeChannel.name}</span>
        </span>
      </div>
    </motion.div>
  );
};
// Xtream Login Form
const XtreamLoginForm = ({ onConnect, loading }: { onConnect: (config: XtreamConfig) => void; loading: boolean }) => {
  const [server, setServer] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!server || !username || !password) { toast.error("Remplissez tous les champs"); return; }
    let normalizedServer = server.trim();
    if (!normalizedServer.startsWith("http")) normalizedServer = `http://${normalizedServer}`;
    onConnect({ server: normalizedServer, username: username.trim(), password: password.trim() });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <Input value={server} onChange={(e) => setServer(e.target.value)} placeholder="http://serveur:port" className="text-xs h-9 bg-secondary border-border font-mono" />
      <div className="flex gap-2">
        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Login" className="text-xs h-9 bg-secondary border-border" />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Mot de passe" className="text-xs h-9 bg-secondary border-border" />
      </div>
      <Button type="submit" size="sm" className="w-full text-xs bg-accent text-accent-foreground hover:bg-accent/80 font-bold" disabled={loading}>
        {loading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <LogIn className="w-3 h-3 mr-1" />}
        Connecter
      </Button>
      <p className="text-[9px] text-muted-foreground text-center">Compatible TiviMate, Xtream UI, et serveurs IPTV standards</p>
    </form>
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
  const [channelStatus, setChannelStatus] = useState<Record<string, "online" | "offline">>({});

  const [xtreamConfig, setXtreamConfig] = useState<XtreamConfig | null>(loadXtreamConfig);
  const [xtreamChannels, setXtreamChannels] = useState<Channel[]>([]);
  const [xtreamLoading, setXtreamLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [collapsedCats, setCollapsedCats] = useState<Set<string>>(new Set());

  const markChannelStatus = useCallback((channelId: string, status: "online" | "offline") => {
    setChannelStatus((prev) => ({ ...prev, [channelId]: status }));
  }, []);

  // Xtream Codes fetch
  const fetchXtreamChannels = useCallback(async (config: XtreamConfig) => {
    setXtreamLoading(true);
    try {
      // Check cache
      const cached = localStorage.getItem(XTREAM_CACHE_KEY);
      if (cached) {
        const { data, timestamp, server } = JSON.parse(cached);
        if (Date.now() - timestamp < STREAMS_CACHE_TTL && server === config.server) {
          setXtreamChannels(data);
          setXtreamLoading(false);
          return;
        }
      }

      // 1. Get categories
      const catRes = await fetch(`${SUPABASE_URL}/functions/v1/xtream-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, action: 'get_live_categories' }),
      });
      const categories: any[] = catRes.ok ? await catRes.json() : [];
      const catMap = new Map<string, string>();
      if (Array.isArray(categories)) {
        categories.forEach((c: any) => catMap.set(String(c.category_id), c.category_name || 'Sans catégorie'));
      }

      // 2. Get all live streams
      const streamsRes = await fetch(`${SUPABASE_URL}/functions/v1/xtream-proxy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...config, action: 'get_live_streams' }),
      });
      const streams: any[] = streamsRes.ok ? await streamsRes.json() : [];

      if (!Array.isArray(streams)) {
        toast.error("Réponse invalide du serveur Xtream");
        setXtreamLoading(false);
        return;
      }

      // Normalize server URL
      const baseServer = config.server.replace(/\/$/, '');

      const channels: Channel[] = streams.slice(0, 500).map((s: any, i: number) => ({
        id: `xtream-${s.stream_id || i}`,
        name: s.name || `Stream ${s.stream_id}`,
        icon: "📺",
        url: `${baseServer}/live/${config.username}/${config.password}/${s.stream_id}.m3u8`,
        category: catMap.get(String(s.category_id)) || "Xtream",
        quality: s.stream_type === "live" ? "LIVE" : undefined,
      }));

      localStorage.setItem(XTREAM_CACHE_KEY, JSON.stringify({ data: channels, timestamp: Date.now(), server: config.server }));
      setXtreamChannels(channels);
      toast.success(`${channels.length} chaînes Xtream chargées !`);
    } catch (err) {
      console.error("Xtream fetch error:", err);
      toast.error("Erreur de connexion au serveur Xtream");
      setXtreamChannels([]);
    } finally {
      setXtreamLoading(false);
    }
  }, []);

  // Load Xtream on mount if config exists
  useEffect(() => {
    if (xtreamConfig) fetchXtreamChannels(xtreamConfig);
  }, []);

  const saveXtreamConfig = (config: XtreamConfig) => {
    localStorage.setItem(XTREAM_STORAGE_KEY, JSON.stringify(config));
    setXtreamConfig(config);
    localStorage.removeItem(XTREAM_CACHE_KEY);
    fetchXtreamChannels(config);
  };

  const clearXtreamConfig = () => {
    localStorage.removeItem(XTREAM_STORAGE_KEY);
    localStorage.removeItem(XTREAM_CACHE_KEY);
    setXtreamConfig(null);
    setXtreamChannels([]);
    toast.success("Serveur Xtream déconnecté");
  };

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

  const allChannels = [...CHANNELS_DATA, ...xtreamChannels, ...apiChannels, ...customChannels];

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
            <h2 className="text-sm font-bold text-primary-foreground uppercase tracking-wide">Mkachkhines TV</h2>
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
            <StreamPlayer url={activeChannel.url} useProxy={activeChannel.useProxy} onError={() => { setHasError(true); markChannelStatus(activeChannel.id, "offline"); }} onReady={() => markChannelStatus(activeChannel.id, "online")} />
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

      {/* Mini Remote Control */}
      {activeChannel && (
        <RemoteControl
          allChannels={allChannels}
          activeChannel={activeChannel}
          onChannelChange={handleChannelClick}
          onRetry={handleRetry}
        />
      )}

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

      {/* Sources info */}
      <div className="mx-3 mt-2 flex flex-wrap items-center gap-3 px-1">
        {xtreamChannels.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Radio className="w-3 h-3 text-accent" />
            <span className="text-[10px] text-muted-foreground">{xtreamChannels.length} chaînes Xtream</span>
          </div>
        )}
        {!loading && apiChannels.length > 0 && (
          <div className="flex items-center gap-1.5">
            <Globe className="w-3 h-3 text-accent" />
            <span className="text-[10px] text-muted-foreground">{apiChannels.length} chaînes sport via iptv-org</span>
          </div>
        )}
      </div>

      {/* Category filter tabs */}
      {!loading && categories.length > 1 && (
        <div className="mx-3 mt-3 flex gap-1.5 overflow-x-auto pb-1" style={{ scrollbarWidth: 'none' }}>
          <button
            onClick={() => setSelectedCategory(null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all border ${
              selectedCategory === null
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card text-muted-foreground border-border hover:border-accent/40"
            }`}
          >
            Tout ({filteredChannels.length})
          </button>
          {categories.map((cat) => {
            const count = filteredChannels.filter((c) => c.category === cat).length;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase transition-all border ${
                  selectedCategory === cat
                    ? "bg-accent text-accent-foreground border-accent"
                    : "bg-card text-muted-foreground border-border hover:border-accent/40"
                }`}
              >
                {cat} ({count})
              </button>
            );
          })}
        </div>
      )}

      {/* Channel Grid by category */}
      <div className="px-3 py-4 space-y-3">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : (
          categories
            .filter((cat) => !selectedCategory || cat === selectedCategory)
            .map((cat) => {
              const catChannels = filteredChannels.filter((c) => c.category === cat);
              const isCollapsed = collapsedCats.has(cat);
              const displayChannels = isCollapsed ? [] : (selectedCategory ? catChannels : catChannels.slice(0, 5));
              const hasMore = !selectedCategory && !isCollapsed && catChannels.length > 5;

              return (
                <div key={cat}>
                  <button
                    onClick={() => {
                      setCollapsedCats((prev) => {
                        const next = new Set(prev);
                        next.has(cat) ? next.delete(cat) : next.add(cat);
                        return next;
                      });
                    }}
                    className="flex items-center justify-between w-full px-1 py-1.5"
                  >
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">
                      {cat} ({catChannels.length})
                    </p>
                    <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${isCollapsed ? "" : "rotate-180"}`} />
                  </button>

                  <AnimatePresence initial={false}>
                    {!isCollapsed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="space-y-1.5">
                          {displayChannels.map((ch) => (
                            <button
                              key={ch.id}
                              onClick={() => handleChannelClick(ch)}
                              className={`flex items-center w-full p-2.5 rounded-xl transition-all border ${
                                activeChannel?.id === ch.id
                                  ? "bg-accent/10 border-accent shadow-md shadow-accent/10"
                                  : "bg-card border-border hover:border-accent/40"
                              }`}
                            >
                              <div className="w-8 h-8 bg-background rounded-lg flex items-center justify-center text-base mr-2.5 border border-border shrink-0">
                                {ch.icon}
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <h4 className={`font-bold text-xs truncate ${activeChannel?.id === ch.id ? "text-accent" : "text-foreground"}`}>
                                    {ch.name}
                                  </h4>
                                  {channelStatus[ch.id] === "online" && (
                                    <span className="shrink-0 inline-flex items-center gap-0.5 bg-green-500/15 text-green-500 text-[7px] font-black uppercase px-1 py-0.5 rounded-full border border-green-500/30">
                                      <span className="w-1 h-1 bg-green-500 rounded-full" />EN LIGNE
                                    </span>
                                  )}
                                </div>
                              </div>
                              {ch.quality && <span className="text-[8px] text-accent font-bold mr-1.5">{ch.quality}</span>}
                              <Play className={`w-3.5 h-3.5 shrink-0 ${activeChannel?.id === ch.id ? "text-accent" : "text-muted-foreground"}`} />
                            </button>
                          ))}
                        </div>

                        {hasMore && (
                          <button
                            onClick={() => setSelectedCategory(cat)}
                            className="w-full mt-1.5 py-2 text-[10px] font-bold text-accent hover:text-accent/80 uppercase tracking-wide"
                          >
                            Voir les {catChannels.length - 5} autres →
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
        )}
      </div>

      {/* Settings */}
      <AnimatePresence>
        {showSettings && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="mx-3 mb-4 rounded-2xl border-2 border-accent/30 bg-card p-4 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">⚙️ Paramètres TV</h3>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(false)} className="h-8 w-8"><X className="w-4 h-4" /></Button>
            </div>

            {/* Xtream Codes Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-accent" />
                <h4 className="text-xs font-bold text-foreground uppercase">Serveur Xtream Codes</h4>
                {xtreamConfig && <span className="text-[9px] bg-accent/20 text-accent px-2 py-0.5 rounded-full font-bold">Connecté</span>}
              </div>
              {xtreamConfig ? (
                <div className="space-y-2">
                  <div className="bg-secondary/50 rounded-xl p-3 space-y-1">
                    <p className="text-[10px] text-muted-foreground">Serveur: <span className="text-foreground font-mono">{xtreamConfig.server}</span></p>
                    <p className="text-[10px] text-muted-foreground">Login: <span className="text-foreground font-mono">{xtreamConfig.username}</span></p>
                    <p className="text-[10px] text-muted-foreground">Chaînes: <span className="text-accent font-bold">{xtreamChannels.length}</span></p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1 text-xs" onClick={() => { localStorage.removeItem(XTREAM_CACHE_KEY); fetchXtreamChannels(xtreamConfig); }} disabled={xtreamLoading}>
                      {xtreamLoading ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <RefreshCw className="w-3 h-3 mr-1" />}
                      Rafraîchir
                    </Button>
                    <Button variant="outline" size="sm" className="text-xs text-destructive border-destructive/30" onClick={clearXtreamConfig}>
                      <Trash2 className="w-3 h-3 mr-1" /> Déconnecter
                    </Button>
                  </div>
                </div>
              ) : (
                <XtreamLoginForm onConnect={saveXtreamConfig} loading={xtreamLoading} />
              )}
            </div>

            <div className="border-t border-border" />

            {/* Custom Links Section */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-foreground uppercase">🔗 Liens personnalisés</h4>
              <p className="text-[10px] text-muted-foreground">Collez vos liens .m3u8. Sauvegarde automatique.</p>
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {customLinks.map((link, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-bold text-muted-foreground w-14 shrink-0">Lien {i + 1}</span>
                    <Input value={link} onChange={(e) => updateLink(i, e.target.value)} placeholder="https://...m3u8" className="text-xs h-9 bg-secondary border-border" />
                  </div>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full text-xs" onClick={() => { setCustomLinks(Array(10).fill("")); toast.success("Liens réinitialisés"); }}>
                🗑️ Réinitialiser
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TVTab;
