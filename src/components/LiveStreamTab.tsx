import { useState, useEffect, useRef, useCallback } from "react";
import { Video, VideoOff, Send, X, Eye, Radio, StopCircle, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

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
    <div className="pb-4">
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
