import { useState, useEffect, useCallback, useRef } from "react";
import Hls from "hls.js";
import { Tv, Settings, X, Play, RefreshCw, Loader2, Globe, Search, AlertTriangle, ChevronUp, ChevronDown, Volume2, VolumeX, Power, SkipForward, SkipBack, Maximize, Minimize } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// Extract YouTube video ID or channel ID for embedding
const getYouTubeEmbedUrl = (url: string): string | null => {
  // Channel live format: yt-channel://CHANNEL_ID
  if (url.startsWith("yt-channel://")) {
    return `https://www.youtube.com/embed/live_stream?channel=${url.replace("yt-channel://", "")}&autoplay=1`;
  }
  // Standard video URL
  const m = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return m ? `https://www.youtube.com/embed/${m[1]}?autoplay=1&rel=0` : null;
};
const isYouTubeUrl = (url: string) => url.includes("youtube.com") || url.includes("youtu.be") || url.startsWith("yt-channel://");

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
  // === INFOS - YouTube Channel Live (toujours à jour) ===
  { id: "aljazeera", name: "Al Jazeera Arabic", url: "yt-channel://UCfiwzLy-8yKzIbsmZTzxDgw", category: "Infos", icon: "📡", quality: "YT" },
  { id: "aljazeera-en", name: "Al Jazeera English", url: "yt-channel://UCNye-wNBqNL5ZzHSJj3l8Bg", category: "Infos", icon: "📡", quality: "YT" },
  { id: "france24-fr", name: "France 24 FR", url: "yt-channel://UCCCPCZNChQdGa9EkATeye4g", category: "Infos", icon: "🇫🇷", quality: "YT" },
  { id: "france24-ar", name: "France 24 Arabic", url: "yt-channel://UCDFHjBCIKYwMISMB2JDlnaQ", category: "Infos", icon: "🇫🇷", quality: "YT" },
  { id: "dw", name: "DW News", url: "yt-channel://UCknLrEdhRCp1aegoMqRaCZg", category: "Infos", icon: "🌍", quality: "YT" },
  { id: "dw-ar", name: "DW عربية", url: "yt-channel://UCjQxXq6dFqKOqOJnkDGgW8A", category: "Infos", icon: "🌍", quality: "YT" },
  { id: "euronews", name: "Euronews FR", url: "yt-channel://UCW2QcKZiU8aUGg4yxCIditg", category: "Infos", icon: "🇪🇺", quality: "YT" },
  { id: "trt", name: "TRT World", url: "yt-channel://UC7fWeaHhqgM4Lba0JzhRlwg", category: "Infos", icon: "🇹🇷", quality: "YT" },
  { id: "sky-news-ar", name: "Sky News Arabia", url: "yt-channel://UCfiwzLy-8yKzIbsmZTzxDgw", category: "Infos", icon: "📡", quality: "YT" },
  { id: "alarabiya", name: "Al Arabiya", url: "yt-channel://UCbyxxGIjqZiJn4VmMOCd8Wg", category: "Infos", icon: "📡", quality: "YT" },
  // === SPORT ===
  { id: "bein-xtra", name: "beIN SPORTS Xtra", url: "yt-channel://UCxVmaFbMvkBP4NalU3Rwi8g", category: "Sports", icon: "⚽", quality: "YT" },
  // === SCIENCE ===
  { id: "nasa", name: "NASA TV", url: "yt-channel://UCLA_DiR1FfKNvjuUpBHmylQ", category: "Science", icon: "🚀", quality: "YT" },
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
const StreamPlayer = ({ url, onError, onReady }: { url: string; onError: () => void; onReady?: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isYouTube = isYouTubeUrl(url);

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
  }, [url, isYouTube]);

  if (isYouTube) {
    const embedUrl = getYouTubeEmbedUrl(url);
    // YouTube embeds are generally reliable — mark as online after load
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
const TVTab = () => {
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customLinks, setCustomLinks] = useState<string[]>(loadCustomLinks);
  const [hasError, setHasError] = useState(false);
  const [search, setSearch] = useState("");
  const [apiChannels, setApiChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [channelStatus, setChannelStatus] = useState<Record<string, "online" | "offline">>({});

  const markChannelStatus = useCallback((channelId: string, status: "online" | "offline") => {
    setChannelStatus((prev) => ({ ...prev, [channelId]: status }));
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
            <StreamPlayer url={activeChannel.url} onError={() => { setHasError(true); markChannelStatus(activeChannel.id, "offline"); }} onReady={() => markChannelStatus(activeChannel.id, "online")} />
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
                        <div className="flex items-center gap-1.5">
                          <h4 className={`font-bold text-sm truncate ${activeChannel?.id === ch.id ? "text-accent" : "text-foreground"}`}>
                            {ch.name}
                          </h4>
                          {channelStatus[ch.id] === "online" && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 bg-green-500/15 text-green-500 text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border border-green-500/30">
                              <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />EN LIGNE
                            </span>
                          )}
                          {channelStatus[ch.id] === "offline" && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 bg-destructive/15 text-destructive text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full border border-destructive/30">
                              <span className="w-1.5 h-1.5 bg-destructive rounded-full" />HORS LIGNE
                            </span>
                          )}
                        </div>
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
