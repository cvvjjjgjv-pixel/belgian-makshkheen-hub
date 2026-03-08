import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Smile, Image, Film, X, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import EmojiPicker from "./chat/EmojiPicker";
import GifPicker from "./chat/GifPicker";

type ChatMessage = {
  id: string;
  user_id: string;
  content: string;
  media_url: string | null;
  media_type: string | null;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
};

const ChatTab = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const [showGif, setShowGif] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [mediaPreview, setMediaPreview] = useState<{ url: string; type: string; file?: File } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchMessages = useCallback(async () => {
    const { data: msgs } = await supabase
      .from("chat_messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(200);

    if (!msgs || msgs.length === 0) {
      setMessages([]);
      return;
    }

    const userIds = [...new Set(msgs.map((m: any) => m.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

    setMessages(
      msgs.map((m: any) => {
        const profile = profileMap.get(m.user_id);
        return {
          ...m,
          author_name: profile?.display_name || "Utilisateur",
          author_avatar: profile?.avatar_url || "",
        };
      })
    );
  }, []);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "chat_messages" }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchMessages]);

  const uploadMedia = async (file: File): Promise<{ url: string; type: string } | null> => {
    if (!user) return null;
    setUploading(true);

    const ext = file.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("chat-media")
      .upload(path, file, { upsert: true });

    if (error) {
      toast.error("Erreur lors de l'upload");
      setUploading(false);
      return null;
    }

    const { data: urlData } = supabase.storage.from("chat-media").getPublicUrl(path);
    setUploading(false);

    const mediaType = file.type.startsWith("video/") ? "video" : "image";
    return { url: urlData.publicUrl, type: mediaType };
  };

  const sendMessage = async () => {
    if (!user) return;
    if (!input.trim() && !mediaPreview) return;

    let media_url: string | null = null;
    let media_type: string | null = null;

    if (mediaPreview) {
      if (mediaPreview.file) {
        const result = await uploadMedia(mediaPreview.file);
        if (!result) return;
        media_url = result.url;
        media_type = result.type;
      } else {
        // GIF
        media_url = mediaPreview.url;
        media_type = mediaPreview.type;
      }
    }

    const { error } = await supabase.from("chat_messages").insert({
      user_id: user.id,
      content: input.trim(),
      media_url,
      media_type,
    });

    if (error) {
      toast.error("Erreur lors de l'envoi");
      return;
    }

    setInput("");
    setMediaPreview(null);
    setShowEmoji(false);
    setShowGif(false);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 10MB)");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const type = file.type.startsWith("video/") ? "video" : "image";
    setMediaPreview({ url: previewUrl, type, file });
    setShowEmoji(false);
    setShowGif(false);
  };

  const handleGifSelect = (gifUrl: string) => {
    setMediaPreview({ url: gifUrl, type: "gif" });
    setShowGif(false);
  };

  const handleEmojiSelect = (emoji: string) => {
    setInput((prev) => prev + emoji);
  };

  const deleteMessage = async (msgId: string) => {
    await supabase.from("chat_messages").delete().eq("id", msgId);
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Connecte-toi pour accéder au chat</p>
        <button onClick={() => navigate("/auth")} className="px-6 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm">
          Se connecter
        </button>
      </div>
    );
  }

  // Group consecutive messages by same user
  const isNewAuthor = (i: number) => i === 0 || messages[i].user_id !== messages[i - 1].user_id;

  return (
    <div className="flex flex-col h-[calc(100dvh-140px)]">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-border">
        <h2 className="text-sm font-bold text-foreground">Chat Général 🔴🟡</h2>
        <p className="text-xs text-muted-foreground">{messages.length} messages</p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5 overscroll-contain">
        {messages.map((msg, i) => {
          const isMine = msg.user_id === user.id;
          const showAuthor = isNewAuthor(i);

          return (
            <div key={msg.id} className={`flex ${isMine ? "flex-row-reverse" : ""} gap-2 ${showAuthor ? "mt-3" : "mt-0.5"}`}>
              {/* Avatar */}
              {!isMine && showAuthor ? (
                <img
                  src={msg.author_avatar || `https://ui-avatars.com/api/?name=${msg.author_name}&background=random&size=32`}
                  alt=""
                  className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-1"
                />
              ) : !isMine ? (
                <div className="w-7 flex-shrink-0" />
              ) : null}

              <div className={`max-w-[80%] min-w-0 ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                {showAuthor && !isMine && (
                  <span className="text-[10px] font-semibold text-muted-foreground mb-0.5 ml-1">{msg.author_name}</span>
                )}

                <div className="group relative">
                  <div
                    className={`px-3 py-2 rounded-2xl break-words ${
                      isMine
                        ? "bg-accent text-accent-foreground rounded-br-sm"
                        : "bg-secondary text-foreground rounded-bl-sm"
                    }`}
                  >
                    {/* Media */}
                    {msg.media_url && (
                      <div className="mb-1.5">
                        {msg.media_type === "video" ? (
                          <video src={msg.media_url} controls className="rounded-xl max-w-full max-h-48" />
                        ) : (
                          <img src={msg.media_url} alt="" className="rounded-xl max-w-full max-h-48 object-cover cursor-pointer" loading="lazy" />
                        )}
                      </div>
                    )}

                    {msg.content && <p className="text-sm break-words">{msg.content}</p>}

                    <p className={`text-[9px] mt-0.5 ${isMine ? "text-accent-foreground/50" : "text-foreground/40"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>

                  {/* Delete button */}
                  {isMine && (
                    <button
                      onClick={() => deleteMessage(msg.id)}
                      className="absolute -left-6 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive/60 hover:text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Media preview */}
      {mediaPreview && (
        <div className="px-3 py-2 bg-card border-t border-border flex items-center gap-2">
          <div className="relative">
            {mediaPreview.type === "video" ? (
              <video src={mediaPreview.url} className="h-16 rounded-lg" />
            ) : (
              <img src={mediaPreview.url} alt="" className="h-16 rounded-lg object-cover" />
            )}
            <button
              onClick={() => setMediaPreview(null)}
              className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
          <span className="text-xs text-muted-foreground">
            {mediaPreview.type === "gif" ? "GIF" : mediaPreview.type === "video" ? "Vidéo" : "Photo"}
          </span>
        </div>
      )}

      {/* Pickers */}
      <div className="relative">
        {showEmoji && <EmojiPicker onSelect={handleEmojiSelect} onClose={() => setShowEmoji(false)} />}
        {showGif && <GifPicker onSelect={handleGifSelect} onClose={() => setShowGif(false)} />}
      </div>

      {/* Input */}
      <div className="p-3 bg-card border-t border-border">
        <div className="flex gap-2 items-center">
          {/* Media buttons */}
          <div className="flex gap-1">
            <button
              onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showEmoji ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              <Smile className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Image className="w-4.5 h-4.5" />
            </button>
            <button
              onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
              className={`w-9 h-9 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${showGif ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground hover:text-foreground"}`}
            >
              GIF
            </button>
          </div>

          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            onFocus={() => { setShowEmoji(false); setShowGif(false); }}
            placeholder="Message..."
            className="flex-1 bg-secondary rounded-full px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />

          <button
            onClick={sendMessage}
            disabled={uploading || (!input.trim() && !mediaPreview)}
            className="w-10 h-10 rounded-full bg-accent flex items-center justify-center text-accent-foreground flex-shrink-0 hover:opacity-90 transition-opacity disabled:opacity-40"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default ChatTab;
