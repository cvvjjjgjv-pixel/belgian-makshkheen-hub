import { useState, useEffect, useRef, useCallback } from "react";
import { Video, VideoOff, Send, X, Eye, Radio, StopCircle, Users, Globe, Play, Loader2, Trash2, Plus, Link2, Volume2, VolumeX, Maximize, Minimize, SkipBack, SkipForward } from "lucide-react";
import Hls from "hls.js";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const STREAM_HISTORY_KEY = "vlc-stream-history";

interface LiveStream {
  id: string;
  user_id: string;
  title: string;
  is_active: boolean;
  viewers_count: number;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
}

interface LiveChatMsg {
  id: string;
  live_id: string;
  user_id: string;
  content: string;
  created_at: string;
  author_name?: string;
}

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
    } catch { return []; }
  });
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const saveHistory = (url: string) => {
    const updated = [url, ...history.filter(h => h !== url)].slice(0, 15);
    setHistory(updated);
    localStorage.setItem(STREAM_HISTORY_KEY, JSON.stringify(updated));
  };

  const removeFromHistory = (url: string) => {
    const updated = history.filter(h => h !== url);
    setHistory(updated);
    localStorage.setItem(STREAM_HISTORY_KEY, JSON.stringify(updated));
  };

  const stopPlayback = () => {
    if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    if (videoRef.current) { videoRef.current.src = ""; videoRef.current.load(); }
    setIsPlaying(false);
    setIsLoading(false);
    setError("");
  };

  const playStream = (url?: string) => {
    const targetUrl = (url || streamUrl).trim();
    if (!targetUrl) { toast.error("Colle un lien de flux réseau"); return; }

    stopPlayback();
    setStreamUrl(targetUrl);
    setIsLoading(true);
    setError("");
    saveHistory(targetUrl);

    const video = videoRef.current;
    if (!video) return;

    const timeout = setTimeout(() => {
      setIsLoading(false);
      setError("Timeout - Le flux ne répond pas");
    }, 20000);

    const playVideo = () => {
      video.play().catch(() => {
        video.muted = true;
        setIsMuted(true);
        video.play().catch(() => {});
      });
    };

    // All streams go through proxy to bypass CORS/security
    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        xhrSetup: (xhr: XMLHttpRequest, xhrUrl: string) => {
          xhr.withCredentials = false;
          const proxyUrl = `${SUPABASE_URL}/functions/v1/iptv-proxy`;
          xhr.open('POST', proxyUrl, true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          const origSend = xhr.send.bind(xhr);
          xhr.send = () => {
            origSend(JSON.stringify({ url: xhrUrl }));
          };
        },
      });
      hls.loadSource(targetUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        clearTimeout(timeout);
        setIsLoading(false);
        setIsPlaying(true);
        playVideo();
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            clearTimeout(timeout);
            setIsLoading(false);
            setError("Impossible de lire ce flux");
            hls.destroy();
          }
        }
      });
      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      const proxyUrl = `${SUPABASE_URL}/functions/v1/iptv-proxy`;
      fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      }).then(r => r.blob()).then(blob => {
        video.src = URL.createObjectURL(blob);
        video.addEventListener("loadedmetadata", () => {
          clearTimeout(timeout);
          setIsLoading(false);
          setIsPlaying(true);
        }, { once: true });
        playVideo();
      }).catch(() => {
        clearTimeout(timeout);
        setIsLoading(false);
        setError("Erreur de chargement");
      });
    } else {
      const proxyUrl = `${SUPABASE_URL}/functions/v1/iptv-proxy`;
      fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl })
      }).then(r => r.blob()).then(blob => {
        video.src = URL.createObjectURL(blob);
        video.addEventListener("loadedmetadata", () => {
          clearTimeout(timeout);
          setIsLoading(false);
          setIsPlaying(true);
        }, { once: true });
        video.addEventListener("error", () => {
          clearTimeout(timeout);
          setIsLoading(false);
          setError("Format non supporté");
        }, { once: true });
        playVideo();
      }).catch(() => {
        clearTimeout(timeout);
        setIsLoading(false);
        setError("Erreur réseau");
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

  useEffect(() => {
    return () => { if (hlsRef.current) hlsRef.current.destroy(); };
  }, []);

  return (
    <div className="space-y-4">
      {/* URL Input */}
      <div className="mx-4 p-4 rounded-2xl bg-card border border-border space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-5 h-5 text-accent" />
          <h3 className="text-sm font-bold text-foreground">Lecteur Flux Réseau</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 text-accent font-semibold">VLC</span>
        </div>
        <div className="flex gap-2">
          <Input
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && playStream()}
            placeholder="Coller un lien flux (m3u8, ts, iptv...)"
            className="flex-1 text-xs bg-secondary border-border"
          />
          <Button
            onClick={() => playStream()}
            disabled={isLoading}
            size="sm"
            className="bg-accent text-accent-foreground hover:bg-accent/90 shrink-0"
          >
            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
          </Button>
        </div>
        {error && (
          <p className="text-xs text-destructive flex items-center gap-1">
            <X className="w-3 h-3" /> {error}
          </p>
        )}
      </div>

      {/* Video Player */}
      <AnimatePresence>
        {(isPlaying || isLoading) && (
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="mx-4 rounded-2xl overflow-hidden bg-black relative"
          >
            <video
              ref={videoRef}
              className="w-full aspect-video bg-black"
              controls={false}
              autoPlay
              playsInline
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-8 h-8 text-accent animate-spin" />
                  <span className="text-white text-xs">Connexion au flux...</span>
                </div>
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30">
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>
                <span className="text-[10px] text-white/70 font-mono truncate max-w-[200px]">{streamUrl}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={toggleFullscreen} className="w-8 h-8 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30">
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
                <button onClick={stopPlayback} className="w-8 h-8 rounded-full bg-destructive/80 text-white flex items-center justify-center hover:bg-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* History */}
      {history.length > 0 && (
        <div className="mx-4 space-y-2">
          <p className="text-xs font-bold text-muted-foreground px-1">Historique des flux</p>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {history.map((url, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-card border border-border group hover:border-accent/50 transition-colors">
                <button
                  onClick={() => { setStreamUrl(url); playStream(url); }}
                  className="flex-1 min-w-0 flex items-center gap-2 text-left"
                >
                  <Play className="w-3.5 h-3.5 text-accent shrink-0" />
                  <span className="text-[11px] text-foreground truncate font-mono">{url}</span>
                </button>
                <button
                  onClick={() => removeFromHistory(url)}
                  className="w-6 h-6 rounded-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const LiveStreamTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeLives, setActiveLives] = useState<LiveStream[]>([]);
  const [myLive, setMyLive] = useState<LiveStream | null>(null);
  const [watchingLive, setWatchingLive] = useState<LiveStream | null>(null);
  const [chatMessages, setChatMessages] = useState<LiveChatMsg[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [liveTitle, setLiveTitle] = useState("");
  const [showStartForm, setShowStartForm] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollChatToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Fetch active lives
  const fetchLives = useCallback(async () => {
    const { data } = await supabase
      .from("live_streams")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) {
      setActiveLives([]);
      return;
    }

    const userIds = [...new Set(data.map((l: any) => l.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

    const enriched = data.map((l: any) => {
      const profile = profileMap.get(l.user_id);
      return {
        ...l,
        author_name: profile?.display_name || "Utilisateur",
        author_avatar: profile?.avatar_url || "",
      };
    });

    setActiveLives(enriched);

    // Update myLive if exists
    if (user) {
      const mine = enriched.find((l: LiveStream) => l.user_id === user.id);
      if (mine) setMyLive(mine);
    }
  }, [user]);

  // Fetch chat messages for a live
  const fetchChat = useCallback(async (liveId: string) => {
    const { data: msgs } = await supabase
      .from("live_chat_messages")
      .select("*")
      .eq("live_id", liveId)
      .order("created_at", { ascending: true })
      .limit(100);

    if (!msgs || msgs.length === 0) {
      setChatMessages([]);
      return;
    }

    const userIds = [...new Set(msgs.map((m: any) => m.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

    setChatMessages(
      msgs.map((m: any) => ({
        ...m,
        author_name: profileMap.get(m.user_id)?.display_name || "Utilisateur",
      }))
    );
  }, []);

  useEffect(() => {
    fetchLives();
  }, [fetchLives]);

  useEffect(() => {
    scrollChatToBottom();
  }, [chatMessages]);

  // Realtime for lives
  useEffect(() => {
    const channel = supabase
      .channel("lives-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "live_streams" }, () => {
        fetchLives();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchLives]);

  // Realtime for chat when watching
  useEffect(() => {
    const targetLive = watchingLive || myLive;
    if (!targetLive) return;

    fetchChat(targetLive.id);

    const channel = supabase
      .channel(`live-chat-${targetLive.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "live_chat_messages",
        filter: `live_id=eq.${targetLive.id}`,
      }, () => {
        fetchChat(targetLive.id);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [watchingLive, myLive, fetchChat]);

  // Start camera
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      toast.error("Impossible d'accéder à la caméra");
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  };

  // Start live
  const startLive = async () => {
    if (!user) return;

    await startCamera();

    const { data, error } = await supabase
      .from("live_streams")
      .insert({
        user_id: user.id,
        title: liveTitle.trim() || "Live 🔴",
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      toast.error("Erreur: " + error.message);
      stopCamera();
      return;
    }

    setMyLive(data as LiveStream);
    setShowStartForm(false);
    setLiveTitle("");
    toast.success("Tu es en live ! 🔴");
  };

  // End live
  const endLive = async () => {
    if (!myLive) return;

    await supabase
      .from("live_streams")
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq("id", myLive.id);

    stopCamera();
    setMyLive(null);
    toast.success("Live terminé");
  };

  // Send chat
  const sendChat = async () => {
    if (!user || !chatInput.trim()) return;

    const targetLive = watchingLive || myLive;
    if (!targetLive) return;

    await supabase.from("live_chat_messages").insert({
      live_id: targetLive.id,
      user_id: user.id,
      content: chatInput.trim(),
    });

    setChatInput("");
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Connecte-toi pour accéder aux lives</p>
        <button onClick={() => navigate("/auth")} className="px-6 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm">
          Se connecter
        </button>
      </div>
    );
  }

  // === Streaming view (I'm live) ===
  if (myLive && cameraActive) {
    return (
      <div className="flex flex-col h-[calc(100dvh-140px)]">
        {/* Camera + overlay */}
        <div className="relative bg-black aspect-video">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full h-full object-cover mirror"
            style={{ transform: "scaleX(-1)" }}
          />
          {/* Live indicator */}
          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-destructive text-white text-xs font-bold rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
            <span className="flex items-center gap-1 px-2 py-1 bg-black/60 text-white text-xs rounded-full">
              <Eye className="w-3 h-3" /> {myLive.viewers_count}
            </span>
          </div>
          {/* End button */}
          <button
            onClick={endLive}
            className="absolute top-3 right-3 flex items-center gap-1.5 px-3 py-1.5 bg-destructive text-white text-xs font-bold rounded-full"
          >
            <StopCircle className="w-4 h-4" /> Terminer
          </button>
          {/* Title */}
          <div className="absolute bottom-3 left-3 right-3">
            <p className="text-white text-sm font-bold drop-shadow-lg">{myLive.title}</p>
          </div>
        </div>

        {/* Live chat */}
        <div className="flex-1 flex flex-col bg-card">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-bold text-foreground">Chat en direct</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="flex gap-1.5 items-start">
                <span className="text-[11px] font-bold text-accent shrink-0">{msg.author_name}</span>
                <span className="text-[11px] text-foreground break-words">{msg.content}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-2 border-t border-border flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Commenter..."
              className="flex-1 min-w-0 bg-secondary rounded-full px-3 py-2 text-xs text-foreground outline-none"
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim()}
              className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center disabled:opacity-30"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === Watching view ===
  if (watchingLive) {
    return (
      <div className="flex flex-col h-[calc(100dvh-140px)]">
        {/* Streamer info */}
        <div className="bg-gradient-to-b from-muted to-background aspect-video flex flex-col items-center justify-center relative">
          <img
            src={watchingLive.author_avatar || `https://ui-avatars.com/api/?name=${watchingLive.author_name}&background=random&size=80`}
            alt=""
            className="w-20 h-20 rounded-full border-3 border-destructive object-cover mb-3"
          />
          <p className="text-foreground font-bold text-lg">{watchingLive.author_name}</p>
          <p className="text-muted-foreground text-sm">{watchingLive.title}</p>

          <div className="absolute top-3 left-3 flex items-center gap-2">
            <span className="flex items-center gap-1.5 px-3 py-1 bg-destructive text-white text-xs font-bold rounded-full">
              <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
              LIVE
            </span>
            <span className="flex items-center gap-1 px-2 py-1 bg-black/40 text-white text-xs rounded-full">
              <Eye className="w-3 h-3" /> {watchingLive.viewers_count}
            </span>
          </div>

          <button
            onClick={() => setWatchingLive(null)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 text-white flex items-center justify-center"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Chat */}
        <div className="flex-1 flex flex-col bg-card">
          <div className="px-3 py-2 border-b border-border">
            <p className="text-xs font-bold text-foreground">Chat en direct</p>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {chatMessages.map((msg) => (
              <div key={msg.id} className="flex gap-1.5 items-start">
                <span className="text-[11px] font-bold text-accent shrink-0">{msg.author_name}</span>
                <span className="text-[11px] text-foreground break-words">{msg.content}</span>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>
          <div className="p-2 border-t border-border flex gap-2">
            <input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              placeholder="Commenter..."
              className="flex-1 min-w-0 bg-secondary rounded-full px-3 py-2 text-xs text-foreground outline-none"
            />
            <button
              onClick={sendChat}
              disabled={!chatInput.trim()}
              className="w-8 h-8 rounded-full bg-accent text-accent-foreground flex items-center justify-center disabled:opacity-30"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // === Main view: list of lives + go live button ===
  return (
    <div className="pb-4 space-y-6">
      {/* VLC-like Network Stream Player */}
      <NetworkStreamPlayer />
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Radio className="w-5 h-5 text-destructive" />
          Lives
        </h2>
        <button
          onClick={() => setShowStartForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-destructive text-white text-xs font-bold"
        >
          <Video className="w-4 h-4" /> Go Live
        </button>
      </div>

      {/* Start live form */}
      <AnimatePresence>
        {showStartForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mb-4 p-4 rounded-2xl bg-card border border-border space-y-3">
              <input
                value={liveTitle}
                onChange={(e) => setLiveTitle(e.target.value)}
                placeholder="Titre du live (ex: Match EST vs CA)"
                className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-destructive/50"
              />
              <div className="flex gap-2">
                <button
                  onClick={startLive}
                  className="flex-1 py-3 rounded-xl bg-destructive text-white font-bold text-sm flex items-center justify-center gap-2"
                >
                  <Video className="w-4 h-4" /> Démarrer le live
                </button>
                <button
                  onClick={() => setShowStartForm(false)}
                  className="px-4 py-3 rounded-xl bg-secondary text-foreground text-sm"
                >
                  Annuler
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active lives list */}
      {activeLives.length === 0 ? (
        <div className="px-4 py-16 text-center">
          <Radio className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Aucun live en cours</p>
          <p className="text-muted-foreground/60 text-xs mt-1">Sois le premier à lancer un live !</p>
        </div>
      ) : (
        <div className="px-4 space-y-3">
          {activeLives.map((live) => (
            <motion.button
              key={live.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => live.user_id !== user.id && setWatchingLive(live)}
              className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border hover:border-destructive/50 transition-colors text-left"
            >
              <div className="relative">
                <img
                  src={live.author_avatar || `https://ui-avatars.com/api/?name=${live.author_name}&background=random&size=48`}
                  alt=""
                  className="w-12 h-12 rounded-full object-cover border-2 border-destructive"
                />
                <span className="absolute -bottom-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-card flex items-center justify-center">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{live.author_name}</p>
                <p className="text-xs text-muted-foreground truncate">{live.title}</p>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Eye className="w-3.5 h-3.5" />
                {live.viewers_count}
              </div>
              <span className="px-2 py-0.5 bg-destructive text-white text-[10px] font-bold rounded-full">
                LIVE
              </span>
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveStreamTab;
