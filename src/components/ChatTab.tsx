import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Smile, Image, Film, X, Trash2, ChevronDown, Mic, Reply } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
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
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatMessage | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = (smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? "smooth" : "instant" });
  };

  const handleScroll = () => {
    if (!scrollContainerRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollContainerRef.current;
    setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 150);
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
    scrollToBottom(false);
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
        media_url = mediaPreview.url;
        media_type = mediaPreview.type;
      }
    }

    const content = replyTo
      ? `↩️ ${replyTo.author_name}: "${replyTo.content.slice(0, 40)}${replyTo.content.length > 40 ? "..." : ""}"\n${input.trim()}`
      : input.trim();

    const { error } = await supabase.from("chat_messages").insert({
      user_id: user.id,
      content,
      media_url,
      media_type,
    });

    if (error) {
      toast.error("Erreur lors de l'envoi");
      return;
    }

    setInput("");
    setMediaPreview(null);
    setReplyTo(null);
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

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const formatDateSeparator = (dateStr: string) => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return "Aujourd'hui";
    if (date.toDateString() === yesterday.toDateString()) return "Hier";
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "long" });
  };

  const shouldShowDateSeparator = (i: number) => {
    if (i === 0) return true;
    const prev = new Date(messages[i - 1].created_at).toDateString();
    const curr = new Date(messages[i].created_at).toDateString();
    return prev !== curr;
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

  const isNewAuthor = (i: number) => i === 0 || messages[i].user_id !== messages[i - 1].user_id;

  // Check if message contains a reply quote
  const parseReply = (content: string) => {
    const match = content.match(/^↩️ (.+?): "(.+?)"\n([\s\S]*)$/);
    if (match) return { replyAuthor: match[1], replyText: match[2], mainText: match[3] };
    return null;
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-140px)]">
      {/* Chat header */}
      <div className="px-4 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-foreground flex items-center gap-1.5">
              Chat Général
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            </h2>
            <p className="text-[11px] text-muted-foreground">{messages.length} messages</p>
          </div>
          <div className="flex -space-x-2">
            {[...new Map(messages.slice(-10).map(m => [m.user_id, m])).values()].slice(0, 4).map((m) => (
              <img
                key={m.user_id}
                src={m.author_avatar || `https://ui-avatars.com/api/?name=${m.author_name}&background=random&size=24`}
                alt=""
                className="w-6 h-6 rounded-full border-2 border-card object-cover"
              />
            ))}
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5 overscroll-contain scroll-smooth"
      >
        {messages.map((msg, i) => {
          const isMine = msg.user_id === user.id;
          const showAuthor = isNewAuthor(i);
          const showDate = shouldShowDateSeparator(i);
          const reply = parseReply(msg.content);

          return (
            <div key={msg.id}>
              {/* Date separator */}
              {showDate && (
                <div className="flex items-center justify-center my-3">
                  <span className="text-[10px] font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                    {formatDateSeparator(msg.created_at)}
                  </span>
                </div>
              )}

              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.15 }}
                className={`flex ${isMine ? "flex-row-reverse" : ""} gap-1.5 ${showAuthor ? "mt-3" : "mt-0.5"}`}
              >
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

                <div className={`max-w-[78%] min-w-0 ${isMine ? "items-end" : "items-start"} flex flex-col`}>
                  {showAuthor && !isMine && (
                    <span className="text-[10px] font-semibold text-muted-foreground mb-0.5 ml-1">{msg.author_name}</span>
                  )}

                  <div className="group relative flex items-center gap-1">
                    {/* Action buttons - before bubble for mine */}
                    {isMine && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => deleteMessage(msg.id)} className="p-1 rounded-full hover:bg-destructive/10">
                          <Trash2 className="w-3 h-3 text-destructive/60 hover:text-destructive" />
                        </button>
                      </div>
                    )}

                    {/* Message bubble */}
                    <div
                      className={`px-3 py-2 rounded-2xl break-words transition-colors ${
                        isMine
                          ? "bg-accent text-accent-foreground rounded-br-md"
                          : "bg-secondary text-foreground rounded-bl-md"
                      }`}
                    >
                      {/* Reply quote */}
                      {reply && (
                        <div className={`mb-1.5 px-2 py-1 rounded-lg border-l-2 text-[11px] ${
                          isMine ? "bg-accent/50 border-accent-foreground/30" : "bg-muted border-muted-foreground/30"
                        }`}>
                          <span className="font-semibold">{reply.replyAuthor}</span>
                          <p className="opacity-70 truncate">{reply.replyText}</p>
                        </div>
                      )}

                      {/* Media */}
                      {msg.media_url && (
                        <div className="mb-1.5">
                          {msg.media_type === "video" ? (
                            <video src={msg.media_url} controls className="rounded-xl w-full max-h-52" />
                          ) : (
                            <img
                              src={msg.media_url}
                              alt=""
                              className="rounded-xl w-full max-h-52 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              loading="lazy"
                              onClick={() => setSelectedImage(msg.media_url)}
                            />
                          )}
                        </div>
                      )}

                      {reply ? (
                        reply.mainText && <p className="text-sm break-words">{reply.mainText}</p>
                      ) : (
                        msg.content && <p className="text-sm break-words">{msg.content}</p>
                      )}

                      <p className={`text-[9px] mt-0.5 ${isMine ? "text-accent-foreground/50" : "text-foreground/40"}`}>
                        {formatTime(msg.created_at)}
                      </p>
                    </div>

                    {/* Action buttons - after bubble for others */}
                    {!isMine && (
                      <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setReplyTo(msg); inputRef.current?.focus(); }}
                          className="p-1 rounded-full hover:bg-muted"
                        >
                          <Reply className="w-3 h-3 text-muted-foreground" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Scroll to bottom button */}
      <AnimatePresence>
        {showScrollBtn && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={() => scrollToBottom()}
            className="absolute right-4 bottom-32 w-9 h-9 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center z-10"
          >
            <ChevronDown className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Image fullscreen viewer */}
      <AnimatePresence>
        {selectedImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedImage(null)}
            className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          >
            <button onClick={() => setSelectedImage(null)} className="absolute top-4 right-4 text-white">
              <X className="w-6 h-6" />
            </button>
            <img src={selectedImage} alt="" className="max-w-full max-h-full object-contain rounded-lg" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-2 bg-card border-t border-border flex items-center gap-2">
              <Reply className="w-4 h-4 text-accent flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-semibold text-accent">{replyTo.author_name}</p>
                <p className="text-[11px] text-muted-foreground truncate">{replyTo.content || "📷 Média"}</p>
              </div>
              <button onClick={() => setReplyTo(null)}>
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
      <div className="p-2 bg-card border-t border-border safe-area-bottom">
        <div className="flex gap-1.5 items-end">
          {/* Media buttons */}
          <div className="flex gap-0.5 pb-1">
            <button
              onClick={() => { setShowEmoji(!showEmoji); setShowGif(false); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${showEmoji ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Smile className="w-5 h-5" />
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Image className="w-5 h-5" />
            </button>
            <button
              onClick={() => { setShowGif(!showGif); setShowEmoji(false); }}
              className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors ${showGif ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              GIF
            </button>
          </div>

          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
            onFocus={() => { setShowEmoji(false); setShowGif(false); }}
            placeholder="Message..."
            className="flex-1 min-w-0 bg-secondary rounded-full px-4 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:ring-1 focus:ring-accent/50 transition-shadow"
          />

          <button
            onClick={sendMessage}
            disabled={uploading || (!input.trim() && !mediaPreview)}
            className="w-9 h-9 rounded-full bg-accent flex items-center justify-center text-accent-foreground flex-shrink-0 hover:opacity-90 transition-all disabled:opacity-30 disabled:scale-95 active:scale-90 mb-0.5"
          >
            {uploading ? (
              <div className="w-4 h-4 border-2 border-accent-foreground/30 border-t-accent-foreground rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
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
