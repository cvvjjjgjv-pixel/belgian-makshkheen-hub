import { useState, useRef, useEffect } from "react";
import { X, Play, Loader2, Radio } from "lucide-react";
import Hls from "hls.js";
// @ts-ignore
import mpegts from "mpegts.js";

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
          (video.play() as any)?.catch(() => {});
          setIsLoading(false);
          setIsPlaying(true);
        });
        hlsRef.current = hls;
      }
    } else {
      // Pour les liens /1 ou .ts (beIN, Watania)
      if ((mpegts.getFeatureList() as any).isNetworkMagical) {
        const player = mpegts.createPlayer({ type: "mse", isLive: true, url: url });
        player.attachMediaElement(video);
        player.load();
        (player.play() as any)?.catch(() => {});
        mpegtsRef.current = player;
        setIsLoading(false);
        setIsPlaying(true);
      }
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Radio className="text-red-600 animate-pulse" />
        <h1 className="text-xl font-bold font-arabic">MKACHKHINES TV</h1>
      </div>

      <div className="max-w-2xl mx-auto space-y-4">
        {/* Input area */}
        <div className="flex gap-2 bg-zinc-900 p-2 rounded-lg border border-zinc-800">
          <input
            type="text"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="Lien IPTV (HTTP autorisè)..."
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none"
          />
          <button onClick={playStream} className="bg-red-600 px-4 py-2 rounded-md hover:bg-red-700 transition-colors">
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5" />}
          </button>
        </div>

        {/* Player Area */}
        <div className="relative rounded-xl overflow-hidden bg-zinc-950 aspect-video border border-zinc-800 shadow-2xl">
          <video ref={videoRef} className="w-full h-full" playsInline controls />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70">
              <div className="text-center">
                <Loader2 className="w-12 h-12 text-red-600 animate-spin mx-auto mb-2" />
                <p className="text-sm font-arabic">Chargement du flux...</p>
              </div>
            </div>
          )}

          {isPlaying && (
            <button onClick={stopPlayback} className="absolute top-4 right-4 bg-red-600 p-2 rounded-full z-20">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
