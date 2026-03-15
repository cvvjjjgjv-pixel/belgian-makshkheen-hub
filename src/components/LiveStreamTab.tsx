import { useState, useRef, useEffect } from "react";
import { Play, Loader2, Radio, X } from "lucide-react";

declare global {
  interface Window {
    mpegts: any;
    Hls: any;
  }
}

export default function LiveStreamTab() {
  const [url, setUrl] = useState("http://feeds.legaliptv.live:80/ScribdFreeM3U-IPTV-2026/FreebeINSports/1");
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);

  useEffect(() => {
    // Chargement forcé des moteurs
    const scripts = [
      "https://cdn.jsdelivr.net/npm/mpegts.js@latest/dist/mpegts.min.js",
      "https://cdn.jsdelivr.net/npm/hls.js@latest",
    ];
    scripts.forEach((src) => {
      const s = document.createElement("script");
      s.src = src;
      document.head.appendChild(s);
    });
  }, []);

  const play = () => {
    if (!videoRef.current || !window.mpegts) return;
    setLoading(true);

    if (playerRef.current) {
      playerRef.current.destroy();
    }

    // On force le moteur MPEGTS (VLC Core)
    const player = window.mpegts.createPlayer(
      {
        type: "mse",
        isLive: true,
        url: url,
        cors: true,
      },
      {
        enableStashBuffer: false, // Pas de délai
        stashInitialSize: 128,
      },
    );

    player.attachMediaElement(videoRef.current);
    player.load();
    player
      .play()
      .then(() => {
        setLoading(false);
      })
      .catch(() => {
        // Si ça échoue, on tente le lien direct
        videoRef.current!.src = url;
        videoRef.current!.play();
        setLoading(false);
      });

    playerRef.current = player;
  };

  return (
    <div className="min-h-screen bg-black text-white p-6 flex flex-col items-center">
      <div className="flex items-center gap-2 mb-8">
        <Radio className="text-red-600 animate-pulse" />
        <h1 className="text-2xl font-bold italic text-red-600">MKAKHINES TV</h1>
      </div>

      <div className="w-full max-w-2xl space-y-4">
        <div className="flex gap-2 bg-zinc-900 p-2 rounded-xl border border-white/5">
          <input
            className="flex-1 bg-transparent px-4 py-2 text-xs outline-none"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button onClick={play} className="bg-red-600 p-3 rounded-lg hover:bg-red-700 transition-all">
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
          </button>
        </div>

        <div className="relative aspect-video bg-zinc-950 rounded-2xl overflow-hidden border border-white/5 shadow-2xl">
          <video ref={videoRef} className="w-full h-full" controls playsInline />
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60">
              <Loader2 className="w-10 h-10 text-red-600 animate-spin mb-2" />
              <p className="text-xs font-bold text-zinc-400">CONNEXION AU FLUX...</p>
            </div>
          )}
        </div>
      </div>

      <p className="mt-6 text-[10px] text-zinc-600 uppercase tracking-widest font-bold">
        localhost:8080 • Mkakhines Streaming Center
      </p>
    </div>
  );
}
