import { useState, useEffect, useCallback, useRef } from "react";
import Hls from "hls.js";
import { Tv, Settings, X, Play, RefreshCw, Loader2, Globe, Search, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Channel {
  id: string;
  name: string;
  icon: string;
  url: string;
  category: string;
  quality?: string;
}

const P = "https://corsproxy.io/?http://proiptv.net:1234/dalila1/1234567/";

// --- CHAÎNES ---
const CHANNELS_DATA: Channel[] = [
  // Tunisie - Sources officielles HLS
  { id: "watania1", name: "Watania 1", url: "https://corsproxy.io/?https://streaming.alwatanya.tn/live/w1/playlist.m3u8", category: "Tunisie", icon: "🇹🇳" },
  { id: "watania2", name: "Watania 2", url: "https://corsproxy.io/?https://streaming.alwatanya.tn/live/w2/playlist.m3u8", category: "Tunisie", icon: "🇹🇳" },
  // Tunisie - IPTV proiptv
  { id: "tn-nat1", name: "Tunisia Nat 1", url: P+"1", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-nat2", name: "Tunisia Nat 2", url: P+"2", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-elhiwar", name: "Elhiwar Ettounsi", url: P+"3", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-attessia", name: "Attessia TV", url: P+"4", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-nessma", name: "Nessma TV", url: P+"5", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-hannibal", name: "Hannibal TV", url: P+"6", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-janoubia", name: "Al Janoubia", url: P+"7", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-carthage", name: "Carthage TV", url: P+"801", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-telvza", name: "Telvza TV", url: P+"12", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-tunisna", name: "Tunisna TV", url: P+"8", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-mtunisia", name: "M Tunisia", url: P+"14", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-mustakila", name: "Al Mustakila", url: P+"77", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-zitouna", name: "Zitouna TV", url: P+"9", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-alinsen", name: "Al Insen TV", url: P+"745", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-evenement", name: "Chaîne Événement", url: P+"692", category: "Tunisie", icon: "🇹🇳" },
  { id: "tn-tnt-nat1", name: "TNT Nat 1", url: P+"9207", category: "Tunisie TNT", icon: "🇹🇳" },
  { id: "tn-tnt-nat2", name: "TNT Nat 2", url: P+"9208", category: "Tunisie TNT", icon: "🇹🇳" },
  { id: "tn-tnt-nessma", name: "TNT Nessma", url: P+"9209", category: "Tunisie TNT", icon: "🇹🇳" },
  { id: "tn-tnt-hannibal", name: "TNT Hannibal", url: P+"9210", category: "Tunisie TNT", icon: "🇹🇳" },
  // Radio Tunisie
  { id: "tnr-mosaique", name: "Mosaïque FM", url: P+"802", category: "Radio Tunisie", icon: "📻" },
  { id: "tnr-express", name: "Express FM", url: P+"9211", category: "Radio Tunisie", icon: "📻" },
  { id: "tnr-nationale", name: "Radio Nationale", url: P+"9212", category: "Radio Tunisie", icon: "📻" },
  { id: "tnr-cap", name: "Cap FM", url: P+"9213", category: "Radio Tunisie", icon: "📻" },
  { id: "tnr-diwan", name: "Diwan FM", url: P+"9214", category: "Radio Tunisie", icon: "📻" },
  { id: "tnr-ifm", name: "IFM", url: P+"9215", category: "Radio Tunisie", icon: "📻" },
  { id: "tnr-jawhara", name: "Jawhara FM", url: P+"89", category: "Radio Tunisie", icon: "📻" },
  { id: "tnr-shems", name: "Shems FM", url: P+"9227", category: "Radio Tunisie", icon: "📻" },
  { id: "tnr-zitouna", name: "Radio Zitouna", url: P+"9228", category: "Radio Tunisie", icon: "📻" },
  // beIN Sports
  { id: "bein-sport-hd", name: "beIN SPORTS HD", url: P+"400", category: "beIN Sports", icon: "⚽" },
  { id: "bein-news", name: "beIN SPORTS News", url: P+"110", category: "beIN Sports", icon: "⚽" },
  { id: "bein1-hd", name: "beIN 1 HD", url: P+"111", category: "beIN Sports", icon: "⚽" },
  { id: "bein2-hd", name: "beIN 2 HD", url: P+"112", category: "beIN Sports", icon: "⚽" },
  { id: "bein3-hd", name: "beIN 3 HD", url: P+"113", category: "beIN Sports", icon: "⚽" },
  { id: "bein4-hd", name: "beIN 4 HD", url: P+"114", category: "beIN Sports", icon: "⚽" },
  { id: "bein5-hd", name: "beIN 5 HD", url: P+"115", category: "beIN Sports", icon: "⚽" },
  { id: "bein6-hd", name: "beIN 6 HD", url: P+"116", category: "beIN Sports", icon: "⚽" },
  { id: "bein7-hd", name: "beIN 7 HD", url: P+"117", category: "beIN Sports", icon: "⚽" },
  { id: "bein8-hd", name: "beIN 8 HD", url: P+"118", category: "beIN Sports", icon: "⚽" },
  { id: "bein9-hd", name: "beIN 9 HD", url: P+"510", category: "beIN Sports", icon: "⚽" },
  { id: "bein10-hd", name: "beIN 10 HD", url: P+"511", category: "beIN Sports", icon: "⚽" },
  { id: "bein-max1", name: "beIN Max 1 HD", url: P+"9687", category: "beIN Sports", icon: "⚽" },
  { id: "bein-max2", name: "beIN Max 2 HD", url: P+"9693", category: "beIN Sports", icon: "⚽" },
  { id: "bein-max3", name: "beIN Max 3 HD", url: P+"9692", category: "beIN Sports", icon: "⚽" },
  { id: "bein-max4", name: "beIN Max 4 HD", url: P+"9691", category: "beIN Sports", icon: "⚽" },
  { id: "bein-nba", name: "beIN NBA", url: P+"517", category: "beIN Sports", icon: "🏀" },
  { id: "bein-movies1", name: "beIN Movies 1", url: P+"520", category: "beIN Movies", icon: "🎬" },
  { id: "bein-movies2", name: "beIN Movies 2", url: P+"519", category: "beIN Movies", icon: "🎬" },
  { id: "bein-movies3", name: "beIN Movies 3", url: P+"13", category: "beIN Movies", icon: "🎬" },
  { id: "bein-movies4", name: "beIN Movies 4", url: P+"16", category: "beIN Movies", icon: "🎬" },
  { id: "bein-junior", name: "beJunior", url: P+"51", category: "beIN Movies", icon: "👶" },
  // France
  { id: "fr-tf1", name: "TF1", url: P+"207", category: "France", icon: "🇫🇷" },
  { id: "fr-france2", name: "France 2", url: P+"209", category: "France", icon: "🇫🇷" },
  { id: "fr-france3", name: "France 3", url: P+"210", category: "France", icon: "🇫🇷" },
  { id: "fr-france4", name: "France 4", url: P+"219", category: "France", icon: "🇫🇷" },
  { id: "fr-france5", name: "France 5", url: P+"211", category: "France", icon: "🇫🇷" },
  { id: "fr-m6", name: "M6", url: P+"208", category: "France", icon: "🇫🇷" },
  { id: "fr-canal", name: "Canal+", url: P+"200", category: "France", icon: "🇫🇷" },
  { id: "fr-canal-cinema", name: "Canal+ Cinéma", url: P+"201", category: "France", icon: "🇫🇷" },
  { id: "fr-canal-sport", name: "Canal+ Sport", url: P+"202", category: "France", icon: "🇫🇷" },
  { id: "fr-canal-series", name: "Canal+ Séries", url: P+"205", category: "France", icon: "🇫🇷" },
  { id: "fr-c8", name: "C8", url: P+"223", category: "France", icon: "🇫🇷" },
  { id: "fr-cstar", name: "CStar", url: P+"228", category: "France", icon: "🇫🇷" },
  { id: "fr-arte", name: "Arte", url: P+"216", category: "France", icon: "🇫🇷" },
  { id: "fr-w9", name: "W9", url: P+"220", category: "France", icon: "🇫🇷" },
  { id: "fr-tmc", name: "TMC", url: P+"217", category: "France", icon: "🇫🇷" },
  { id: "fr-bfm", name: "BFM TV", url: P+"218", category: "France Infos", icon: "🇫🇷" },
  { id: "fr-cnews", name: "CNews", url: P+"333", category: "France Infos", icon: "🇫🇷" },
  { id: "fr-lci", name: "LCI", url: P+"334", category: "France Infos", icon: "🇫🇷" },
  { id: "fr-france24p", name: "France 24", url: P+"498", category: "France Infos", icon: "🇫🇷" },
  { id: "fr-rmc1", name: "RMC Sport 1", url: P+"685", category: "France Sport", icon: "⚽" },
  { id: "fr-rmc2", name: "RMC Sport 2", url: P+"686", category: "France Sport", icon: "⚽" },
  { id: "fr-euro1", name: "Eurosport 1", url: P+"743", category: "France Sport", icon: "⚽" },
  { id: "fr-euro2", name: "Eurosport 2", url: P+"744", category: "France Sport", icon: "⚽" },
  { id: "fr-equipe", name: "L'Équipe", url: P+"267", category: "France Sport", icon: "⚽" },
  // International fiable (HLS direct)
  { id: "aljazeera", name: "Al Jazeera Arabic", url: "https://live-hls-web-aj.getaj.net/AJAR/index.m3u8", category: "Infos", icon: "📡" },
  { id: "france24", name: "France 24 FR", url: "https://static.france24.com/live/F24_FR_HI_HLS/live_tv.m3u8", category: "Infos", icon: "🇫🇷" },
  { id: "nasa", name: "NASA TV", url: "https://ntv1.akamaized.net/hls/live/2014049/NASA-NTV1-HLS/master.m3u8", category: "Science", icon: "🚀" },
  { id: "dw", name: "DW News", url: "https://dwamdstream102.akamaized.net/hls/live/2015525/dwstream102/index.m3u8", category: "Infos", icon: "🌍" },
  { id: "euronews", name: "Euronews FR", url: "https://rakuten-euronews-fr-2-eu.samsung.wurl.tv/manifest/playlist.m3u8", category: "Infos", icon: "🇪🇺" },
  { id: "trt", name: "TRT World", url: "https://tv-trtworld.medya.trt.com.tr/master.m3u8", category: "Infos", icon: "🇹🇷" },
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

// HLS Video Player
const HLSPlayer = ({ url, onError }: { url: string; onError: () => void }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !url) return;

    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (timeoutRef.current) { clearTimeout(timeoutRef.current); }

    // 8s timeout for dead links
    timeoutRef.current = setTimeout(() => {
      onError();
    }, 8000);

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
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            onError();
            hls.destroy();
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = url;
      video.addEventListener("loadedmetadata", () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      }, { once: true });
      video.play().catch(() => { video.muted = true; video.play().catch(() => {}); });
    } else {
      onError();
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [url]);

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
            <HLSPlayer url={activeChannel.url} onError={() => setHasError(true)} />
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
