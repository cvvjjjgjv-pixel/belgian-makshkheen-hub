import { useState, useEffect, useCallback } from "react";
import ReactPlayer from "react-player";
import { Tv, Settings, X, Play, RefreshCw, Loader2, Globe } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Channel {
  name: string;
  icon: string;
  url: string;
  quality?: string;
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
const CHANNELS_API = "https://iptv-org.github.io/api/channels.json";

// Fallback channels that are known to work
const FALLBACK_CHANNELS: Channel[] = [
  { name: "Al Jazeera Arabic", icon: "📡", url: "https://live-hls-web-aj.getaj.net/AJAR/index.m3u8" },
  { name: "France 24 FR", icon: "🇫🇷", url: "https://static.france24.com/live/F24_FR_HI_HLS/live_tv.m3u8" },
  { name: "NASA TV", icon: "🚀", url: "https://ntv1.akamaized.net/hls/live/2014049/NASA-NTV1-HLS/master.m3u8" },
];

// Sport channel IDs to look for in iptv-org API
const SPORT_KEYWORDS = [
  "bein", "sport", "eurosport", "sky sport", "espn", "fox sport",
  "arena sport", "digi sport", "supersport", "al kass", "dubai sport",
  "trt spor", "a spor", "sport tv", "canal+ sport"
];

const STORAGE_KEY = "tv-bein-custom-links";
const STREAMS_CACHE_KEY = "tv-iptv-streams-cache";
const STREAMS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const loadCustomLinks = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return Array(10).fill("");
};

const TVTab = () => {
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [customLinks, setCustomLinks] = useState<string[]>(loadCustomLinks);
  const [playing, setPlaying] = useState(true);
  const [apiChannels, setApiChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [playerKey, setPlayerKey] = useState(0);

  const fetchStreams = useCallback(async () => {
    setLoading(true);
    try {
      // Check cache first
      const cached = localStorage.getItem(STREAMS_CACHE_KEY);
      if (cached) {
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp < STREAMS_CACHE_TTL) {
          setApiChannels(data);
          if (!activeChannel && data.length > 0) {
            setActiveChannel(data[0]);
          }
          setLoading(false);
          return;
        }
      }

      const response = await fetch(STREAMS_API);
      if (!response.ok) throw new Error("Failed to fetch streams");
      const streams: StreamData[] = await response.json();

      // Filter for sport channels with .m3u8 URLs
      const sportStreams = streams.filter((s) => {
        const title = s.title.toLowerCase();
        const isSport = SPORT_KEYWORDS.some((kw) => title.includes(kw));
        const isHLS = s.url.includes(".m3u8");
        return isSport && isHLS;
      });

      // Deduplicate by title, prefer higher quality
      const seen = new Map<string, Channel>();
      for (const s of sportStreams) {
        const key = s.title.trim();
        if (!seen.has(key)) {
          seen.set(key, {
            name: s.title,
            icon: "⚽",
            url: s.url,
            quality: s.quality || undefined,
          });
        }
      }

      const channels = Array.from(seen.values()).slice(0, 50);

      // Cache results
      localStorage.setItem(
        STREAMS_CACHE_KEY,
        JSON.stringify({ data: channels, timestamp: Date.now() })
      );

      setApiChannels(channels);
      if (!activeChannel && channels.length > 0) {
        setActiveChannel(channels[0]);
      }

      toast.success(`${channels.length} chaînes sport trouvées`);
    } catch (err) {
      console.error("Error fetching streams:", err);
      toast.error("Erreur de chargement des chaînes");
      // Use fallback
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
    .map((url, i) => ({
      name: `beIN Custom ${i + 1}`,
      icon: "🔗",
      url: url.trim(),
    }))
    .filter((ch) => ch.url.length > 0);

  const allChannels = [...apiChannels, ...FALLBACK_CHANNELS, ...customChannels];

  // Set initial active channel
  useEffect(() => {
    if (!activeChannel && allChannels.length > 0) {
      setActiveChannel(allChannels[0]);
    }
  }, [allChannels, activeChannel]);

  const handleChannelClick = (ch: Channel) => {
    if (!ch.url) {
      toast.error("Aucun lien configuré pour cette chaîne");
      return;
    }
    setActiveChannel(ch);
    setPlaying(true);
    setPlayerKey((k) => k + 1);
  };

  const handleRefresh = () => {
    localStorage.removeItem(STREAMS_CACHE_KEY);
    fetchStreams();
  };

  const updateLink = (index: number, value: string) => {
    const updated = [...customLinks];
    updated[index] = value;
    setCustomLinks(updated);
  };

  return (
    <div className="pb-4">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Tv className="w-5 h-5 text-accent" />
          TV en Direct
        </h2>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="text-muted-foreground hover:text-accent"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="text-muted-foreground hover:text-accent"
          >
            <Settings className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {/* Video Player */}
      <div className="mx-3 rounded-2xl overflow-hidden border-2 border-accent/30 bg-black">
        <div className="aspect-video relative">
          {activeChannel?.url ? (
            <ReactPlayer
              key={playerKey}
              src={activeChannel.url}
              playing={playing}
              controls
              width="100%"
              height="100%"
              style={{ position: "absolute", top: 0, left: 0 }}
              onError={(e: any) => {
                console.error("Player error:", e);
                toast.error("Flux indisponible, essayez une autre chaîne");
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-background">
              <div className="text-center">
                {loading ? (
                  <>
                    <Loader2 className="w-12 h-12 text-accent animate-spin mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Chargement des chaînes...</p>
                  </>
                ) : (
                  <>
                    <Tv className="w-16 h-16 text-accent/30 mx-auto mb-3" />
                    <p className="text-muted-foreground text-sm">Sélectionnez une chaîne</p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Now Playing Bar */}
        {activeChannel && (
          <div className="px-4 py-2.5 flex items-center gap-2 bg-card border-t border-border">
            <span className="text-lg">{activeChannel.icon}</span>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-foreground block truncate">{activeChannel.name}</span>
              {activeChannel.quality && (
                <span className="text-[10px] text-muted-foreground">{activeChannel.quality}</span>
              )}
            </div>
            <span className="flex items-center gap-1 px-2 py-0.5 bg-destructive text-white text-[10px] font-bold rounded-full shrink-0">
              <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* API Info */}
      {!loading && apiChannels.length > 0 && (
        <div className="mx-3 mt-2 flex items-center gap-1.5 px-2">
          <Globe className="w-3 h-3 text-accent" />
          <span className="text-[10px] text-muted-foreground">
            {apiChannels.length} chaînes sport via iptv-org API • Actualiser pour mettre à jour
          </span>
        </div>
      )}

      {/* Channel Grid */}
      <div className="px-3 py-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3 px-1">📺 CHAÎNES ({allChannels.length})</p>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 text-accent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
            {allChannels.map((ch, i) => (
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
                <span className="text-[10px] font-medium text-foreground leading-tight text-center line-clamp-2">
                  {ch.name}
                </span>
                {ch.quality && (
                  <span className="text-[8px] text-accent font-bold">{ch.quality}</span>
                )}
                <Play className="w-3 h-3 text-accent" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      <AnimatePresence>
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="mx-3 mb-4 rounded-2xl border-2 border-accent/30 bg-card p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                ⚙️ Liens personnalisés
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Collez vos liens .m3u8. Ils seront sauvegardés automatiquement.
            </p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {customLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-16 shrink-0">
                    Lien {i + 1}
                  </span>
                  <Input
                    value={link}
                    onChange={(e) => updateLink(i, e.target.value)}
                    placeholder="https://...m3u8"
                    className="text-xs h-9 bg-secondary border-border"
                  />
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full text-xs"
              onClick={() => {
                setCustomLinks(Array(10).fill(""));
                toast.success("Liens réinitialisés");
              }}
            >
              🗑️ Réinitialiser tous les liens
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TVTab;
