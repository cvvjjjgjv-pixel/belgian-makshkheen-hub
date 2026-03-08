import { useState, useRef } from "react";
import { ImagePlus, Video, Send, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CreatePostFormProps {
  onPostCreated: () => void;
}

const CreatePostForm = ({ onPostCreated }: CreatePostFormProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [mediaType, setMediaType] = useState<"image" | "video" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      toast.error("Format non supporté. Utilise une image ou vidéo.");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      toast.error("Fichier trop volumineux (max 50 Mo)");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("post-media")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from("post-media").getPublicUrl(path);
      setMediaUrl(publicUrl);
      setMediaType(isImage ? "image" : "video");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'upload");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const clearMedia = () => {
    setMediaUrl("");
    setMediaType(null);
  };

  const handleSubmit = async () => {
    if ((!content.trim() && !mediaUrl) || !user) return;
    setPosting(true);

    const hashtagMatches = content.match(/#\w+/g);
    const hashtags = hashtagMatches ? hashtagMatches.join(" ") : "";

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.replace(/#\w+/g, "").trim(),
      image_url: mediaUrl || null,
      hashtags,
    });

    if (error) {
      toast.error("Erreur lors de la publication");
    } else {
      toast.success("Post publié !");
      setContent("");
      clearMedia();
      onPostCreated();
    }
    setPosting(false);
  };

  if (!user) return null;

  return (
    <div className="mx-4 mt-4 rounded-2xl bg-card border border-border p-4">
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Quoi de neuf ? 🔴🟡 #hashtags"
        className="w-full bg-transparent text-foreground text-sm placeholder:text-muted-foreground resize-none outline-none min-h-[60px]"
        rows={3}
      />

      {/* Media preview */}
      {mediaUrl && (
        <div className="relative mt-2">
          {mediaType === "video" ? (
            <video src={mediaUrl} controls className="rounded-xl w-full max-h-48 bg-secondary" />
          ) : (
            <img src={mediaUrl} alt="Preview" className="rounded-xl w-full h-32 object-cover" />
          )}
          <button
            onClick={clearMedia}
            className="absolute top-2 right-2 p-1 rounded-full bg-background/80 text-foreground"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {uploading && (
        <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Upload en cours...
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={handleFileSelect}
      />

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = "image/*"; fileInputRef.current.click(); } }}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors disabled:opacity-40"
          >
            <ImagePlus className="w-4 h-4" />
            <span>Image</span>
          </button>
          <button
            onClick={() => { if (fileInputRef.current) { fileInputRef.current.accept = "video/*"; fileInputRef.current.click(); } }}
            disabled={uploading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors disabled:opacity-40"
          >
            <Video className="w-4 h-4" />
            <span>Vidéo</span>
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={(!content.trim() && !mediaUrl) || posting || uploading}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-accent text-accent-foreground text-xs font-bold rounded-full disabled:opacity-40 transition-opacity"
        >
          <Send className="w-3.5 h-3.5" />
          {posting ? "..." : "Publier"}
        </button>
      </div>
    </div>
  );
};

export default CreatePostForm;