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
      videoRef.current.removeAttribute("src");
      videoRef.current.load();
    }
    setIsPlaying(false);
    setIsLoading(false);
  };

  const playStream = () => {
    let url = streamUrl.trim();
    if (!url) return;

    // Nettoyage de l'URL si elle contient des espaces ou caractères bizarres
    url = url.replace(/\s/g, "");

    stopPlayback();
    setIsLoading(true);

    const video = videoRef.current;
    if (!video) return;

    // Détection forcée : si c'est du HTTP ou contient un chiffre à la fin, on utilise mpegts
    const isTs = url.includes(".ts") || url.match(/\/\d+$/) || url.startsWith("http:");

    if (url.includes("m3u8")) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          xhrSetup: (xhr) => {
            xhr.withCredentials = false;
          },
        });
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {
            video.muted = true;
            video.play();
          });
          setIsLoading(false);
          setIsPlaying(true);
        });
        hlsRef.current = hls;
      }
    } else if (isTs && (mpegts.getFeatureList() as any).isNetworkMagical) {
      const player = mpegts.createPlayer(
        {
          type: "mse",
          isLive: true,
          url: url,
          cors: true,
        },
        {
          enableStashBuffer: false,
          stashInitialSize: 128,
        },
      );
      player.attachMediaElement(video);
      player.load();
      player.play().catch(() => {
        // Fallback si le moteur MSE échoue
        video.src = url;
        video.play();
      });
      mpegtsRef.current = player;
      setIsLoading(false);
      setIsPlaying(true);
    } else {
      video.src = url;
      video.play();
      setIsLoading(false);
      setIsPlaying(true);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4">
      <div className="flex items-center gap-2 mb-6 justify-center">
        <Radio className="text-red-600 animate-pulse w-5 h-5" />
        <h1 className="text-xl font-bold tracking-widest text-red-600">MKAKHINES TV</h1>
      </div>

      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex gap-2 bg-zinc-900 p-2 rounded-xl border border-zinc-800 shadow-xl">
          <input
            type="text"
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            placeholder="Lien beIN, Watania ou IPTV..."
            className="flex-1 bg-transparent px-4 py-2 text-xs outline-none text-zinc-300"
          />
          <button
            onClick={playStream}
            className="bg-red-600 px-6 py-2 rounded-lg hover:bg-red-700 active:scale-95 transition-all flex items-center justify-center min-w-[60px]"
          >
            {isLoading ? <Loader2 className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
        </div>

        <div className="relative rounded-2xl overflow-hidden bg-black aspect-video border border-zinc-800 shadow-[0_0_50px_rgba(220,38,38,0.1)]">
          <video ref={videoRef} className="w-full h-full object-contain" playsInline controls />

          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-20">
              <div className="text-center">
                <div className="relative w-16 h-16 mx-auto mb-4">
                  <div className="absolute inset-0 border-4 border-red-600/20 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-t-red-600 rounded-full animate-spin"></div>
                </div>
                <p className="text-sm font-medium text-zinc-400">Tentative de connexion...</p>
              </div>
            </div>
          )}

          {isPlaying && (
            <button
              onClick={stopPlayback}
              className="absolute top-4 right-4 bg-red-600/80 hover:bg-red-600 p-2 rounded-full z-30 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
