import { useEffect, useState, useCallback } from "react";
import { Trash2, Heart, MessageCircle, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import CommentsSection from "./CommentsSection";

interface UserPost {
  id: string;
  content: string;
  image_url: string | null;
  hashtags: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

interface UserPostsManagerProps {
  onCreatePost: () => void;
}

const UserPostsManager = ({ onCreatePost }: UserPostsManagerProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const fetchMyPosts = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (data) setPosts(data);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchMyPosts();
  }, [fetchMyPosts]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("my-posts")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts", filter: `user_id=eq.${user.id}` }, () => {
        fetchMyPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, fetchMyPosts]);

  const deletePost = async (postId: string) => {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) {
      toast.error("Erreur lors de la suppression");
    } else {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post supprimé");
    }
  };

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const s = new Set(prev);
      if (s.has(postId)) s.delete(postId);
      else s.add(postId);
      return s;
    });
  };

  if (!user) return null;

  return (
    <div className="px-4 mt-2">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-foreground">Mes Posts ({loading ? "..." : posts.length})</h3>
        <button
          onClick={onCreatePost}
          className="flex items-center gap-1 text-xs font-bold text-accent-foreground bg-accent px-3 py-1.5 rounded-full"
        >
          <Plus className="w-3.5 h-3.5" />
          Nouveau
        </button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-2">
              <div className="h-3 w-full bg-muted animate-pulse rounded" />
              <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div className="text-center py-8 bg-card rounded-2xl border border-border">
          <p className="text-sm text-muted-foreground">Aucun post encore. Publie ton premier ! 🔴🟡</p>
        </div>
      ) : (
        <div className="space-y-3">
          {posts.map((post) => (
            <div key={post.id} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground">
                      {post.content}{" "}
                      {post.hashtags && <span className="text-accent">{post.hashtags}</span>}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                    </p>
                  </div>
                  <button
                    onClick={() => deletePost(post.id)}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {post.image_url && (
                  <img src={post.image_url} alt="Post" className="mt-2 rounded-xl w-full h-32 object-cover" />
                )}

                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5" /> {post.likes_count}
                  </span>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1 hover:text-accent transition-colors"
                  >
                    <MessageCircle className="w-3.5 h-3.5" /> {post.comments_count}
                    {expandedComments.has(post.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              {expandedComments.has(post.id) && (
                <CommentsSection
                  postId={post.id}
                  onCommentCountChange={(delta) => {
                    setPosts((prev) =>
                      prev.map((p) =>
                        p.id === post.id ? { ...p, comments_count: Math.max(0, p.comments_count + delta) } : p
                      )
                    );
                  }}
                />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserPostsManager;
