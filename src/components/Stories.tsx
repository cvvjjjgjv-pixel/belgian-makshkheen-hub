import { useState, useEffect, useRef } from "react";
import { Plus, Camera, X, Send, Trash2, Eye, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Story {
  id: string;
  user_id: string;
  image_url: string;
  caption: string;
  created_at: string;
  expires_at: string;
  profile?: { display_name: string; avatar_url: string };
}

interface Reaction {
  id: string;
  story_id: string;
  user_id: string;
  emoji: string;
}

interface StoryView {
  id: string;
  story_id: string;
  user_id: string;
  viewed_at: string;
  viewer_name?: string;
  viewer_avatar?: string;
}

const REACTION_EMOJIS = ["❤️", "🔥", "😍", "👏", "😂", "😢"];

const timeRemaining = (expiresAt: string) => {
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (diff <= 0) return "Expirée";
  const h = Math.floor(diff / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  return h > 0 ? `${h}h${m}m` : `${m}m`;
};

const Stories = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [allMyStories, setAllMyStories] = useState<Story[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [showManage, setShowManage] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [myReaction, setMyReaction] = useState<string | null>(null);
  const [showReactionAnim, setShowReactionAnim] = useState<string | null>(null);
  const [storyViews, setStoryViews] = useState<StoryView[]>([]);
  const [showViewers, setShowViewers] = useState(false);

  const fetchStories = async () => {
    const { data } = await supabase
      .from("stories")
      .select("*, profile:profiles!stories_user_id_fkey(display_name, avatar_url)")
      .order("created_at", { ascending: false });

    if (data) {
      const userMap = new Map<string, Story>();
      const myStories: Story[] = [];
      (data as any[]).forEach((s) => {
        if (!userMap.has(s.user_id)) {
          userMap.set(s.user_id, { ...s, profile: s.profile });
        }
        if (s.user_id === user?.id) {
          myStories.push({ ...s, profile: s.profile });
        }
      });
      setStories(Array.from(userMap.values()));
      setAllMyStories(myStories);
    }
  };

  useEffect(() => {
    fetchStories();
    const channel = supabase
      .channel("stories-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "stories" }, () => {
        fetchStories();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Fetch reactions & views when viewing a story
  useEffect(() => {
    if (!viewingStory) { setProgress(0); setReactions([]); setMyReaction(null); setStoryViews([]); setShowViewers(false); return; }
    
    const fetchReactions = async () => {
      const { data } = await supabase
        .from("story_reactions")
        .select("*")
        .eq("story_id", viewingStory.id);
      if (data) {
        setReactions(data as Reaction[]);
        const mine = data.find((r: any) => r.user_id === user?.id);
        setMyReaction(mine ? mine.emoji : null);
      }
    };

    const recordView = async () => {
      if (!user || viewingStory.user_id === user.id) return;
      await supabase.from("story_views").upsert(
        { story_id: viewingStory.id, user_id: user.id },
        { onConflict: "story_id,user_id" }
      );
    };

    const fetchViews = async () => {
      if (viewingStory.user_id !== user?.id) return;
      const { data } = await supabase
        .from("story_views")
        .select("*")
        .eq("story_id", viewingStory.id)
        .order("viewed_at", { ascending: false });
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map((v: any) => v.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
        setStoryViews(data.map((v: any) => ({
          ...v,
          viewer_name: profileMap.get(v.user_id)?.display_name || "Utilisateur",
          viewer_avatar: profileMap.get(v.user_id)?.avatar_url || "",
        })));
      } else {
        setStoryViews([]);
      }
    };

    fetchReactions();
    recordView();
    fetchViews();

    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { setViewingStory(null); return 0; }
        return p + 2;
      });
    }, 100);

    const reactionChannel = supabase
      .channel(`story-reactions-${viewingStory.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "story_reactions", filter: `story_id=eq.${viewingStory.id}` }, () => {
        fetchReactions();
      })
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(reactionChannel);
    };
  }, [viewingStory, user]);

  const sendReaction = async (emoji: string) => {
    if (!user || !viewingStory) return;
    
    // Show animation
    setShowReactionAnim(emoji);
    setTimeout(() => setShowReactionAnim(null), 1000);

    if (myReaction === emoji) {
      // Remove reaction
      const { error } = await supabase.from("story_reactions").delete()
        .eq("story_id", viewingStory.id)
        .eq("user_id", user.id);
      if (error) console.error("Delete reaction error:", error);
      setMyReaction(null);
    } else {
      // Always upsert
      const { error } = await supabase.from("story_reactions").upsert(
        { story_id: viewingStory.id, user_id: user.id, emoji },
        { onConflict: "story_id,user_id" }
      );
      if (error) console.error("Upsert reaction error:", error);
      setMyReaction(emoji);
    }
  };

  // Count reactions by emoji
  const reactionCounts = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      toast.error("Sélectionne une image ou vidéo");
      return;
    }
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setShowCreate(true);
  };

  const publishStory = async () => {
    if (!user || !selectedFile) return;
    setUploading(true);
    try {
      const ext = selectedFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("stories")
        .upload(path, selectedFile, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from("stories").getPublicUrl(path);

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        image_url: publicUrl,
        caption,
      });
      if (error) throw error;

      toast.success("Story publiée ! Elle expirera dans 24h");
      setShowCreate(false);
      setCaption("");
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la publication");
    } finally {
      setUploading(false);
    }
  };

  const deleteStory = async (storyId: string) => {
    const { error } = await supabase.from("stories").delete().eq("id", storyId);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      toast.success("Story supprimée");
      setAllMyStories((prev) => prev.filter((s) => s.id !== storyId));
      if (viewingStory?.id === storyId) setViewingStory(null);
      fetchStories();
    }
  };

  const hasMyStory = stories.some((s) => s.user_id === user?.id);

  const getInitial = (story: Story) =>
    (story.profile?.display_name || "?")[0].toUpperCase();

  return (
    <>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-4">
        <button
          className="flex flex-col items-center gap-1 flex-shrink-0"
          onClick={() => hasMyStory ? setShowManage(true) : fileInputRef.current?.click()}
        >
          <div className="w-[72px] h-[72px] rounded-full p-[3px] bg-muted relative">
            <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center border-2 border-background">
              {user && hasMyStory ? (
                <span className="text-lg font-bold text-accent">
                  {(user.user_metadata?.display_name || user.email?.[0] || "?")[0].toUpperCase()}
                </span>
              ) : (
                <Camera className="w-6 h-6 text-muted-foreground" />
              )}
            </div>
            <div className="absolute bottom-0 right-0 w-5 h-5 bg-accent rounded-full flex items-center justify-center border-2 border-background">
              <Plus className="w-3 h-3 text-accent-foreground" />
            </div>
          </div>
          <span className="text-[11px] text-secondary-foreground max-w-[70px] truncate">
            {hasMyStory ? "Ma story" : "Votre story"}
          </span>
        </button>

        {stories
          .filter((s) => s.user_id !== user?.id)
          .map((story) => (
            <button
              key={story.id}
              className="flex flex-col items-center gap-1 flex-shrink-0"
              onClick={() => { setViewingStory(story); setProgress(0); }}
            >
              <div className="w-[72px] h-[72px] rounded-full p-[3px] story-ring-gradient">
                {story.profile?.avatar_url ? (
                  <img
                    src={story.profile.avatar_url}
                    alt={story.profile.display_name}
                    className="w-full h-full rounded-full object-cover border-2 border-background"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center border-2 border-background text-lg font-bold text-accent">
                    {getInitial(story)}
                  </div>
                )}
              </div>
              <span className="text-[11px] text-secondary-foreground max-w-[70px] truncate">
                {story.profile?.display_name || "Utilisateur"}
              </span>
            </button>
          ))}
      </div>

      <input ref={fileInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleFileSelect} />

      {/* Create Story Dialog */}
      <Dialog open={showCreate} onOpenChange={(v) => { if (!v) { setShowCreate(false); setPreviewUrl(null); setSelectedFile(null); setCaption(""); } }}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Nouvelle Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {previewUrl && (
              <div className="relative rounded-xl overflow-hidden aspect-[9/16] max-h-[400px] bg-secondary">
                <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
              </div>
            )}
            <input
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Ajouter une légende..."
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <p className="text-xs text-muted-foreground text-center">⏱ La story expirera automatiquement après 24h</p>
            <button
              onClick={publishStory}
              disabled={uploading || !selectedFile}
              className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? <span className="animate-pulse">Publication...</span> : <><Send className="w-4 h-4" /> Publier la story</>}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manage My Stories Dialog */}
      <Dialog open={showManage} onOpenChange={setShowManage}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Mes Stories</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {allMyStories.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">Aucune story active</p>
            ) : (
              allMyStories.map((s) => (
                <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary border border-border">
                  <img src={s.image_url} alt="" className="w-14 h-14 rounded-lg object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{s.caption || "Sans légende"}</p>
                    <p className="text-[10px] text-muted-foreground">⏱ Expire dans {timeRemaining(s.expires_at)}</p>
                  </div>
                  <button
                    onClick={() => { setViewingStory(s); setProgress(0); setShowManage(false); }}
                    className="text-xs text-accent font-medium px-2 py-1"
                  >
                    Voir
                  </button>
                  <button
                    onClick={() => deleteStory(s.id)}
                    className="p-2 rounded-full hover:bg-destructive/10 text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))
            )}
            <button
              onClick={() => { setShowManage(false); fileInputRef.current?.click(); }}
              className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> Ajouter une story
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Viewer */}
      {viewingStory && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setViewingStory(null)}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted z-10">
            <div className="h-full bg-accent transition-all duration-100" style={{ width: `${progress}%` }} />
          </div>
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-accent">
              {getInitial(viewingStory)}
            </div>
            <div className="flex-1">
              <span className="text-foreground text-sm font-medium">
                {viewingStory.profile?.display_name || "Utilisateur"}
              </span>
              <p className="text-[10px] text-muted-foreground">⏱ {timeRemaining(viewingStory.expires_at)}</p>
            </div>
            {viewingStory.user_id === user?.id && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteStory(viewingStory.id); }}
                className="p-2 rounded-full bg-destructive/20 text-destructive"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
            <button onClick={() => setViewingStory(null)}>
              <X className="w-6 h-6 text-foreground" />
            </button>
          </div>
          <img src={viewingStory.image_url} alt="Story" className="w-full h-full object-contain" onClick={(e) => e.stopPropagation()} />

          {/* Reaction animation */}
          {showReactionAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <span className="text-7xl animate-bounce">{showReactionAnim}</span>
            </div>
          )}

          {/* Caption */}
          {viewingStory.caption && (
            <div className="absolute bottom-24 left-4 right-4 text-center">
              <p className="text-foreground text-sm bg-black/60 rounded-xl px-4 py-2 inline-block">
                {viewingStory.caption}
              </p>
            </div>
          )}

          {/* Views & Reactions for story owner */}
          {viewingStory.user_id === user?.id && (
            <div className="absolute bottom-0 left-0 right-0 z-10" onClick={(e) => e.stopPropagation()}>
              {/* Viewers panel (expandable) */}
              {showViewers && (
                <div className="bg-black/80 backdrop-blur-md rounded-t-2xl max-h-[50vh] overflow-y-auto px-4 pb-2 pt-3">
                  <p className="text-xs text-muted-foreground font-semibold mb-3 uppercase tracking-wide">
                    Vues ({storyViews.length})
                  </p>
                  {storyViews.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Aucune vue pour le moment</p>
                  ) : (
                    <div className="space-y-2">
                      {storyViews.map((v) => (
                        <div key={v.id} className="flex items-center gap-3">
                          <img
                            src={v.viewer_avatar || `https://ui-avatars.com/api/?name=${v.viewer_name}&background=random&size=32`}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover"
                          />
                          <span className="text-sm text-foreground flex-1">{v.viewer_name}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(v.viewed_at).toLocaleTimeString("fr", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Bottom bar: eye count + reactions */}
              <div className="bg-black/70 backdrop-blur-sm px-4 py-3 flex items-center justify-between">
                <button
                  onClick={() => setShowViewers((v) => !v)}
                  className="flex items-center gap-2 text-foreground"
                >
                  <Eye className="w-4 h-4" />
                  <span className="text-sm font-medium">{storyViews.length}</span>
                  <ChevronUp className={`w-4 h-4 transition-transform ${showViewers ? "rotate-180" : ""}`} />
                </button>
                {reactions.length > 0 && (
                  <div className="flex gap-2">
                    {Object.entries(reactionCounts).map(([emoji, count]) => (
                      <span key={emoji} className="bg-white/20 rounded-full px-2 py-0.5 text-xs">
                        {emoji} <span className="text-white font-bold">{count}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Emoji reaction bar (for viewers) */}
          {user && viewingStory.user_id !== user.id && (
            <div className="absolute bottom-6 left-4 right-4 flex justify-center gap-3 z-10" onClick={(e) => e.stopPropagation()}>
              {REACTION_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => sendReaction(emoji)}
                  className={`text-2xl p-2 rounded-full transition-all ${
                    myReaction === emoji
                      ? "bg-white/30 scale-125 ring-2 ring-accent"
                      : "bg-white/10 hover:bg-white/20 hover:scale-110"
                  }`}
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Stories;