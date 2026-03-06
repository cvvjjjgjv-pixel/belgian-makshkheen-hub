import { useEffect, useState, useCallback } from "react";
import { Heart, MessageCircle, Send, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import CommentsSection from "./CommentsSection";

interface Post {
  id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  hashtags: string;
  likes_count: number;
  comments_count: number;
  created_at: string;
  profile?: {
    display_name: string;
    avatar_url: string | null;
  };
}

interface PostsFeedProps {
  refreshKey: number;
}

const PostsFeed = ({ refreshKey }: PostsFeedProps) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [posts, setPosts] = useState<Post[]>([]);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());

  const toggleComments = (postId: string) => {
    setExpandedComments((prev) => {
      const s = new Set(prev);
      if (s.has(postId)) s.delete(postId);
      else s.add(postId);
      return s;
    });
  };

  const fetchPosts = useCallback(async () => {
    const { data, error } = await supabase
      .from("posts")
      .select("*, profile:profiles!posts_user_id_fkey(display_name, avatar_url)")
      .order("created_at", { ascending: false })
      .limit(50);

    if (!error && data) {
      // The join may fail due to missing FK name, fallback to manual join
      setPosts(data as any);
    } else {
      // Fallback: fetch posts then profiles separately
      const { data: postsData } = await supabase
        .from("posts")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (postsData) {
        const userIds = [...new Set(postsData.map((p) => p.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(profilesData?.map((p) => [p.user_id, p]) || []);
        setPosts(
          postsData.map((p) => ({
            ...p,
            profile: profileMap.get(p.user_id) || { display_name: "Utilisateur", avatar_url: null },
          }))
        );
      }
    }
    setLoading(false);
  }, []);

  const fetchLikes = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("post_likes")
      .select("post_id")
      .eq("user_id", user.id);
    if (data) setLikedPosts(new Set(data.map((l) => l.post_id)));
  }, [user]);

  useEffect(() => {
    fetchPosts();
    fetchLikes();
  }, [refreshKey, fetchPosts, fetchLikes]);

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("posts-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "posts" }, () => {
        fetchPosts();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchPosts]);

  const toggleLike = async (postId: string) => {
    if (!user) return;
    const isLiked = likedPosts.has(postId);

    if (isLiked) {
      await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
      setLikedPosts((prev) => { const s = new Set(prev); s.delete(postId); return s; });
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: Math.max(0, p.likes_count - 1) } : p));
    } else {
      await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
      setLikedPosts((prev) => new Set(prev).add(postId));
      setPosts((prev) => prev.map((p) => p.id === postId ? { ...p, likes_count: p.likes_count + 1 } : p));
    }
  };

  const deletePost = async (postId: string) => {
    await supabase.from("posts").delete().eq("id", postId);
    setPosts((prev) => prev.filter((p) => p.id !== postId));
  };

  if (loading) {
    return (
      <div className="space-y-4 px-4 mt-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
              <div className="space-y-1.5 flex-1">
                <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                <div className="h-2.5 w-16 bg-muted animate-pulse rounded" />
              </div>
            </div>
            <div className="h-3 w-full bg-muted animate-pulse rounded" />
            <div className="h-3 w-2/3 bg-muted animate-pulse rounded" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">Aucun post pour le moment. Soyez le premier ! 🔴🟡</p>
      </div>
    );
  }

  return (
    <div className="space-y-0">
      {posts.map((post) => {
        const liked = likedPosts.has(post.id);
        const canDelete = user?.id === post.user_id || isAdmin;
        const profile = (post as any).profile;
        const displayName = profile?.display_name || "Utilisateur";
        const avatarUrl = profile?.avatar_url || `https://ui-avatars.com/api/?name=${displayName}&background=random`;

        return (
          <div key={post.id} className="mx-4 mt-4 rounded-2xl overflow-hidden bg-card border border-border">
            {/* Header */}
            <div className="flex items-center p-3 gap-3">
              <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-full border-2 border-accent object-cover" />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm text-foreground truncate">{displayName}</h4>
                <p className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
              {canDelete && (
                <button onClick={() => deletePost(post.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Image */}
            {post.image_url && (
              <img src={post.image_url} alt="Post" className="w-full aspect-[4/3] object-cover" />
            )}

            {/* Content */}
            <div className="p-3">
              <p className="text-sm mb-2 text-foreground">
                {post.content}{" "}
                {post.hashtags && <span className="text-accent">{post.hashtags}</span>}
              </p>
              <div className="flex justify-between items-center">
                <div className="flex gap-5">
                  <button
                    onClick={() => toggleLike(post.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-destructive" : "text-secondary-foreground"}`}
                  >
                    <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
                    <span>{post.likes_count}</span>
                  </button>
                  <button
                    onClick={() => toggleComments(post.id)}
                    className={`flex items-center gap-1.5 text-sm transition-colors ${expandedComments.has(post.id) ? "text-accent" : "text-secondary-foreground"}`}
                  >
                    <MessageCircle className="w-5 h-5" />
                    <span>{post.comments_count}</span>
                    {expandedComments.has(post.id) ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                  </button>
                  <button className="text-secondary-foreground">
                    <Send className="w-5 h-5" />
                  </button>
                </div>
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
        );
      })}
    </div>
  );
};

export default PostsFeed;
