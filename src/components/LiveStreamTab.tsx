import { useState, useRef, useEffect } from "react";
import { X, Play, Loader2, Radio } from "lucide-react";
import Hls from "hls.js";
// @ts-ignore
import mpegts from "mpegts.js";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function LiveStreamTab() {
  const [streamUrl, setStreamUrl] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const mpegtsRef = useRef<any>(null);

  const stopPlayback = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
    if (mpegtsRef.current) {
      mpegtsRef.current.destroy();
      mpegtsRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.src = "";
    }
    setIsPlaying(false);
    setIsLoading(false);
  };

  const playStream = () => {
    const url = streamUrl.trim();
    if (!url) return;

    stopPlayback();
    setIsLoading(true);

    const video = videoRef.current;
    if (!video) return;

    if (url.includes("m3u8")) {
      if (Hls.isSupported()) {
        const hls = new Hls();
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          const p = video.play() as any;
          if (p && typeof p.catch === "function") p.catch(() => {});
          setIsLoading(false);
          setIsPlaying(true);
        });
        hlsRef.current = hls;
      }
    } else {
      // Correction Erreur isNetworkMagical
      if ((mpegts.getFeatureList() as any).isNetworkMagical) {
        const player = mpegts.createPlayer({ type: "mse", isLive: true, url: url });
        player.attachMediaElement(video);
        player.load();

        // Correction Erreur .catch()
        const playPromise = player.play() as any;
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch((e: any) => console.error("Erreur Play TS:", e));
        }

        mpegtsRef.current = player;
        setIsLoading(false);
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    return () => stopPlayback();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="flex items-center gap-2 mb-6">
        <Radio className="text-red-600 animate-pulse" />
        <h1 className="text-xl font-bold font-arabic uppercase tracking-tighter">Mkakhines TV</h1>
      </div>

      <div className="space-y-4">
        <div className="flex gap-2 bg-zinc-900 p-3 rounded-xl border border-zinc-800 shadow-lg">
          <Input
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="Lien IPTV (HLS ou TS)"
            className="bg-black border-zinc-700 text-xs focus-visible:ring-red-600"
          />
          <Button onClick={playStream} className="bg-red-600 hover:bg-red-700 shadow-md">
            {isLoading ? <Loader2 className="animate-spin" /> : <Play />}
          </Button>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-zinc-950 aspect-video border border-zinc-800 shadow-2xl group">
          <video ref={videoRef} className="w-full h-full" playsInline controls />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
              <div className="text-center">
                <Loader2 className="w-10 h-10 text-red-600 animate-spin mx-auto mb-2" />
                <p className="text-xs text-zinc-400 font-arabic">Connexion au serveur...</p>
              </div>
            </div>
          )}

          {isPlaying && (
            <button
              onClick={stopPlayback}
              className="absolute top-4 right-4 bg-red-600 p-2 rounded-full shadow-lg z-50 hover:scale-110 transition-transform"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
