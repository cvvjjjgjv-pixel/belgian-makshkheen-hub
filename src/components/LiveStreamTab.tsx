import { useState, useEffect, useRef, useCallback } from "react";
import { Video, X, Eye, Radio, Globe, Play, Loader2, Trash2, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import Hls from "hls.js";
// @ts-ignore
import mpegts from "mpegts.js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const STREAM_HISTORY_KEY = "vlc-stream-history";

// === VLC-like Network Stream Player ===
const NetworkStreamPlayer = () => {
  const [streamUrl, setStreamUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(STREAM_HISTORY_KEY) || "[]");
    } catch {
      return [];
    }
  });

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const stopPlayback = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      mpegtsRef.current.pause();
      mpegtsRef.current.unload();
      mpegtsRef.current.detachMediaElement();
      mpegtsRef.current.destroy();
      mpegtsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.src = "";
      videoRef.current.load();
    }
    setIsPlaying(false);
    setIsLoading(false);
    setError("");
  };

  const playStream = (url?: string) => {
    const targetUrl = (url || streamUrl).trim();
    if (!targetUrl) {
      toast.error("Colle un lien de flux réseau");
      return;
    }

    stopPlayback();
    setStreamUrl(targetUrl);
    setIsLoading(true);

    const updated = [targetUrl, ...history.filter((h) => h !== targetUrl)].slice(0, 15);
    setHistory(updated);
    localStorage.setItem(STREAM_HISTORY_KEY, JSON.stringify(updated));

    const video = videoRef.current;
    if (!video) return;

    const isHls = targetUrl.includes("m3u8");
    const isTs = targetUrl.match(/\/\d+$/) || targetUrl.includes(".ts");

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(targetUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
        setIsLoading(false);
        setIsPlaying(true);
      });
      hlsRef.current = hls;
    } else if (isTs && (mpegts.getFeatureList() as any).isNetworkMagical) {
      const player = mpegts.createPlayer({
        type: "mse",
        isLive: true,
        url: targetUrl,
        cors: true,
      });
      player.attachMediaElement(video);
      player.load();

      const playPromise = player.play();
      if (playPromise !== undefined && typeof playPromise.then === "function") {
        playPromise
          .then(() => {
            setIsLoading(false);
            setIsPlaying(true);
          })
          .catch(() => {
            setError("Erreur de décodage TS");
            setIsLoading(false);
          });
      } else {
        setIsLoading(false);
        setIsPlaying(true);
      }
      mpegtsRef.current = player;
    } else {
      video.src = targetUrl;
      video
        .play()
        .then(() => {
          setIsLoading(false);
          setIsPlaying(true);
        })
        .catch(() => {
          setError("Format non supporté");
          setIsLoading(false);
        });
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    } else {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    }
  };

  return (
    <div className="space-y-4">
      <div className="mx-4 p-4 rounded-2xl bg-card border border-border shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Globe className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-bold">VLC Network Player</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-bold uppercase">
            TS/HLS
          </span>
        </div>
        <div className="flex gap-2">
          <Input
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && playStream()}
            placeholder="URL : http://.../1"
            className="flex-1 text-xs bg-secondary"
          />
          <Button onClick={() => playStream()} disabled={isLoading} size="sm" className="bg-accent">
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          </Button>
        </div>
        {error && <p className="text-[11px] text-destructive mt-2 font-medium">{error}</p>}
      </div>

      <AnimatePresence>
        {(isPlaying || isLoading) && (
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mx-4 rounded-2xl overflow-hidden bg-black relative shadow-2xl"
          >
            <video ref={videoRef} className="w-full aspect-video" autoPlay playsInline />
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
                <Loader2 className="w-8 h-8 text-accent animate-spin mb-2" />
                <span className="text-white text-[10px]">Chargement du flux...</span>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 p-3 flex justify-between">
              <button onClick={toggleMute} className="text-white bg-white/10 p-2 rounded-full">
                {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </button>
              <div className="flex gap-2">
                <button onClick={toggleFullscreen} className="text-white bg-white/10 p-2 rounded-full">
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
                <button onClick={stopPlayback} className="text-white bg-destructive p-2 rounded-full">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Composant principal simplifié (ajuste selon tes besoins Supabase)
const LiveStreamTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user)
    return (
      <div className="p-8 text-center">
        <Button onClick={() => navigate("/auth")}>Se connecter</Button>
      </div>
    );

  return (
    <div className="pb-4 space-y-6">
      <NetworkStreamPlayer />
      <div className="p-4">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Radio className="w-5 h-5 text-destructive" /> Chaînes en Direct
        </h2>
      </div>
    </div>
  );
};

export default LiveStreamTab;
