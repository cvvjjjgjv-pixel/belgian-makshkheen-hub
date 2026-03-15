import { useState, useRef } from "react";
import { X, Globe, Play, Loader2, Radio, Volume2, VolumeX, Maximize, Minimize } from "lucide-react";
import Hls from "hls.js";
// @ts-ignore
import mpegts from "mpegts.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

const NetworkStreamPlayer = () => {
  const [streamUrl, setStreamUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);

  const stopPlayback = () => {
    if (hlsRef.current) hlsRef.current.destroy();
    if (mpegtsRef.current) {
      mpegtsRef.current.destroy();
      mpegtsRef.current = null;
    }
    if (videoRef.current) videoRef.current.src = "";
    setIsPlaying(false);
    setIsLoading(false);
  };

  const playStream = () => {
    if (!streamUrl.trim()) return;
    stopPlayback();
    setIsLoading(true);

    const video = videoRef.current;
    if (!video) return;

    const isTs = streamUrl.match(/\/\d+$/) || streamUrl.includes(".ts") || streamUrl.includes(":80");

    if (isTs && (mpegts.getFeatureList() as any).isNetworkMagical) {
      const player = mpegts.createPlayer({ type: "mse", isLive: true, url: streamUrl });
      player.attachMediaElement(video);
      player.load();
      player.play();
      mpegtsRef.current = player;
      setIsLoading(false);
      setIsPlaying(true);
    } else {
      const hls = new Hls();
      hls.loadSource(streamUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play();
        setIsLoading(false);
        setIsPlaying(true);
      });
      hlsRef.current = hls;
    }
  };

  return (
    <div className="p-4 space-y-4 text-white">
      <div className="flex gap-2 bg-card p-4 rounded-xl border border-border">
        <Input
          value={streamUrl}
          onChange={(e) => setStreamUrl(e.target.value)}
          placeholder="Lien http://.../1"
          className="bg-secondary text-xs"
        />
        <Button onClick={playStream} className="bg-accent">
          {isLoading ? <Loader2 className="animate-spin w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
      </div>

      <AnimatePresence>
        {(isPlaying || isLoading) && (
          <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-white/10 shadow-2xl">
            <video ref={videoRef} className="w-full h-full" autoPlay playsInline />
            <button onClick={stopPlayback} className="absolute top-4 right-4 bg-destructive p-2 rounded-full shadow-lg">
              <X className="w-4 h-4 text-white" />
            </button>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function LiveStreamTab() {
  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="p-4 flex items-center gap-2">
        <Radio className="w-6 h-6 text-destructive animate-pulse" />
        <h2 className="text-xl font-bold text-foreground font-arabic">Matchs en Direct</h2>
      </div>
      <NetworkStreamPlayer />
    </div>
  );
}
