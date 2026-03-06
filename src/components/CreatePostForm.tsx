import { useState } from "react";
import { ImagePlus, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface CreatePostFormProps {
  onPostCreated: () => void;
}

const CreatePostForm = ({ onPostCreated }: CreatePostFormProps) => {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [showImageInput, setShowImageInput] = useState(false);
  const [posting, setPosting] = useState(false);

  const handleSubmit = async () => {
    if (!content.trim() || !user) return;
    setPosting(true);

    // Extract hashtags from content
    const hashtagMatches = content.match(/#\w+/g);
    const hashtags = hashtagMatches ? hashtagMatches.join(" ") : "";

    const { error } = await supabase.from("posts").insert({
      user_id: user.id,
      content: content.replace(/#\w+/g, "").trim(),
      image_url: imageUrl.trim() || null,
      hashtags,
    });

    if (error) {
      toast.error("Erreur lors de la publication");
      console.error(error);
    } else {
      toast.success("Post publié !");
      setContent("");
      setImageUrl("");
      setShowImageInput(false);
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

      {showImageInput && (
        <div className="flex items-center gap-2 mt-2">
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="URL de l'image..."
            className="flex-1 bg-muted/50 text-foreground text-xs rounded-lg px-3 py-2 outline-none border border-border focus:border-accent"
          />
          <button onClick={() => { setShowImageInput(false); setImageUrl(""); }} className="text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {imageUrl && (
        <img src={imageUrl} alt="Preview" className="mt-2 rounded-xl w-full h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
        <button
          onClick={() => setShowImageInput(!showImageInput)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-accent transition-colors"
        >
          <ImagePlus className="w-4 h-4" />
          <span>Image</span>
        </button>

        <button
          onClick={handleSubmit}
          disabled={!content.trim() || posting}
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
