import { useState, useEffect } from "react";
import ReactPlayer from "react-player";
import { Tv, Settings, X, Play } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface Channel {
  name: string;
  icon: string;
  url: string;
}

const DEFAULT_CHANNELS: Channel[] = [
  { name: "beIN Sports 1", icon: "⚽", url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8" },
  { name: "beIN Sports 2", icon: "⚽", url: "https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8" },
  { name: "beIN Sports 3", icon: "⚽", url: "https://cph-p2p-msl.akamaized.net/hls/live/2000341/test/master.m3u8" },
  { name: "beIN Sports 4", icon: "⚽", url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/bipbop_16x9/bipbop_16x9_variant.m3u8" },
  { name: "beIN Sports 5", icon: "⚽", url: "https://devstreaming-cdn.apple.com/videos/streaming/examples/img_bipbop_adv_example_fmp4/master.m3u8" },
  { name: "Al Jazeera", icon: "📡", url: "https://live-hls-web-aj.getaj.net/AJAR/index.m3u8" },
  { name: "France 24", icon: "🇫🇷", url: "https://static.france24.com/live/F24_FR_HI_HLS/live_tv.m3u8" },
  { name: "NASA TV", icon: "🚀", url: "https://ntv1.akamaized.net/hls/live/2014049/NASA-NTV1-HLS/master.m3u8" },
];

const STORAGE_KEY = "tv-bein-custom-links";

const loadCustomLinks = (): string[] => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {}
  return Array(10).fill("");
};

const TVTab = () => {
  const [activeChannel, setActiveChannel] = useState<Channel>(DEFAULT_CHANNELS[0]);
  const [showSettings, setShowSettings] = useState(false);
  const [customLinks, setCustomLinks] = useState<string[]>(loadCustomLinks);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customLinks));
  }, [customLinks]);

  const customChannels: Channel[] = customLinks
    .map((url, i) => ({
      name: `beIN ${i + 1}`,
      icon: "⚽",
      url: url.trim(),
    }))
    .filter((ch) => ch.url.length > 0);

  const allChannels = [...DEFAULT_CHANNELS, ...customChannels];

  const handleChannelClick = (ch: Channel) => {
    if (!ch.url) {
      toast.error("Aucun lien configuré pour cette chaîne");
      return;
    }
    setActiveChannel(ch);
    setPlaying(true);
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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowSettings(!showSettings)}
          className="text-muted-foreground hover:text-accent"
        >
          <Settings className="w-5 h-5" />
        </Button>
      </div>

      {/* Video Player */}
      <div className="mx-3 rounded-2xl overflow-hidden border-2 border-accent/30 bg-black">
        <div className="aspect-video relative">
          {activeChannel.url ? (
            <ReactPlayer
              src={activeChannel.url}
              playing={playing}
              controls
              width="100%"
              height="100%"
              style={{ position: "absolute", top: 0, left: 0 }}
              onError={(e: any) => {
                console.error("Player error:", e);
                toast.error("Erreur de lecture du flux");
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-background">
              <div className="text-center">
                <Tv className="w-16 h-16 text-accent/30 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">Sélectionnez une chaîne</p>
              </div>
            </div>
          )}
        </div>

        {/* Now Playing Bar */}
        <div className="px-4 py-2.5 flex items-center gap-2 bg-card border-t border-border">
          <span className="text-lg">{activeChannel.icon}</span>
          <span className="text-sm font-bold text-foreground flex-1">{activeChannel.name}</span>
          <span className="flex items-center gap-1 px-2 py-0.5 bg-destructive text-white text-[10px] font-bold rounded-full">
            <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
            LIVE
          </span>
        </div>
      </div>

      {/* Channel Grid */}
      <div className="px-3 py-4">
        <p className="text-xs font-semibold text-muted-foreground mb-3 px-1">📺 CHAÎNES</p>
        <div className="grid grid-cols-3 gap-2">
          {allChannels.map((ch, i) => (
            <button
              key={`${ch.name}-${i}`}
              onClick={() => handleChannelClick(ch)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all active:scale-95 ${
                activeChannel.name === ch.name && activeChannel.url === ch.url
                  ? "border-accent bg-accent/10 shadow-md shadow-accent/20"
                  : "border-border bg-card hover:border-accent/50"
              } ${!ch.url ? "opacity-50" : ""}`}
            >
              <span className="text-2xl">{ch.icon}</span>
              <span className="text-[11px] font-medium text-foreground leading-tight text-center line-clamp-1">
                {ch.name}
              </span>
              {ch.url ? (
                <Play className="w-3 h-3 text-accent" />
              ) : (
                <span className="text-[9px] text-muted-foreground">Non configuré</span>
              )}
            </button>
          ))}
        </div>
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
                ⚙️ Liens beIN Sports personnalisés
              </h3>
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Collez vos liens .m3u8 beIN Sports. Ils seront sauvegardés automatiquement.
            </p>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {customLinks.map((link, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-muted-foreground w-16 shrink-0">
                    beIN {i + 1}
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
