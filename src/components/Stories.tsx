import { useState, useEffect, useRef } from "react";
import { Plus, Camera, X, Send, Image } from "lucide-react";
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

const Stories = () => {
  const { user } = useAuth();
  const [stories, setStories] = useState<Story[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [viewingStory, setViewingStory] = useState<Story | null>(null);
  const [uploading, setUploading] = useState(false);
  const [caption, setCaption] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState(0);

  const fetchStories = async () => {
    const { data } = await supabase
      .from("stories")
      .select("*, profile:profiles!stories_user_id_fkey(display_name, avatar_url)")
      .order("created_at", { ascending: false });

    if (data) {
      // Group by user - show latest story per user
      const userMap = new Map<string, Story>();
      (data as any[]).forEach((s) => {
        if (!userMap.has(s.user_id)) {
          userMap.set(s.user_id, { ...s, profile: s.profile });
        }
      });
      setStories(Array.from(userMap.values()));
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
  }, []);

  // Story viewer auto-progress
  useEffect(() => {
    if (!viewingStory) { setProgress(0); return; }
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { setViewingStory(null); return 0; }
        return p + 2;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [viewingStory]);

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
      console.log("Uploading story to path:", path);
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from("stories")
        .upload(path, selectedFile, { upsert: true });
      console.log("Upload result:", { uploadError, uploadData });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("stories")
        .getPublicUrl(path);

      const { error } = await supabase.from("stories").insert({
        user_id: user.id,
        image_url: publicUrl,
        caption,
      });
      if (error) throw error;

      toast.success("Story publiée!");
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

  const hasMyStory = stories.some((s) => s.user_id === user?.id);

  const getInitial = (story: Story) =>
    (story.profile?.display_name || "?")[0].toUpperCase();

  return (
    <>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-4">
        {/* Add story button */}
        <button
          className="flex flex-col items-center gap-1 flex-shrink-0"
          onClick={() => fileInputRef.current?.click()}
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
            Votre story
          </span>
        </button>

        {/* Other users' stories */}
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

        {/* My story viewer */}
        {hasMyStory && (
          <button
            className="flex flex-col items-center gap-1 flex-shrink-0"
            onClick={() => {
              const myStory = stories.find((s) => s.user_id === user?.id);
              if (myStory) { setViewingStory(myStory); setProgress(0); }
            }}
          >
            {/* This is handled by the "Add story" button above */}
          </button>
        )}
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

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
            <button
              onClick={publishStory}
              disabled={uploading || !selectedFile}
              className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <span className="animate-pulse">Publication...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" /> Publier la story
                </>
              )}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Story Viewer */}
      {viewingStory && (
        <div
          className="fixed inset-0 z-50 bg-black flex flex-col"
          onClick={() => setViewingStory(null)}
        >
          {/* Progress bar */}
          <div className="absolute top-0 left-0 right-0 h-1 bg-muted z-10">
            <div
              className="h-full bg-accent transition-all duration-100"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="absolute top-4 left-4 right-4 z-10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-accent">
              {getInitial(viewingStory)}
            </div>
            <span className="text-foreground text-sm font-medium flex-1">
              {viewingStory.profile?.display_name || "Utilisateur"}
            </span>
            <button onClick={() => setViewingStory(null)}>
              <X className="w-6 h-6 text-foreground" />
            </button>
          </div>

          {/* Image */}
          <img
            src={viewingStory.image_url}
            alt="Story"
            className="w-full h-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Caption */}
          {viewingStory.caption && (
            <div className="absolute bottom-8 left-4 right-4 text-center">
              <p className="text-foreground text-sm bg-black/60 rounded-xl px-4 py-2 inline-block">
                {viewingStory.caption}
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
};

export default Stories;
