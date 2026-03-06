import { useState, useEffect, useCallback } from "react";
import { Send, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Comment {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: { display_name: string; avatar_url: string | null };
}

interface CommentsSectionProps {
  postId: string;
  onCommentCountChange?: (delta: number) => void;
}

const CommentsSection = ({ postId, onCommentCountChange }: CommentsSectionProps) => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchComments = useCallback(async () => {
    const { data: commentsData } = await supabase
      .from("comments")
      .select("*")
      .eq("post_id", postId)
      .order("created_at", { ascending: true });

    if (commentsData && commentsData.length > 0) {
      const userIds = [...new Set(commentsData.map((c) => c.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);
      setComments(
        commentsData.map((c) => ({
          ...c,
          profile: profileMap.get(c.user_id) || { display_name: "Utilisateur", avatar_url: null },
        }))
      );
    } else {
      setComments([]);
    }
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  const handleSubmit = async () => {
    if (!newComment.trim() || !user) return;
    setSubmitting(true);

    const { error } = await supabase.from("comments").insert({
      post_id: postId,
      user_id: user.id,
      content: newComment.trim(),
    });

    if (error) {
      toast.error("Erreur lors de l'envoi");
    } else {
      setNewComment("");
      onCommentCountChange?.(1);
      fetchComments();
    }
    setSubmitting(false);
  };

  const deleteComment = async (commentId: string) => {
    const { error } = await supabase.from("comments").delete().eq("id", commentId);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== commentId));
      onCommentCountChange?.(-1);
    }
  };

  return (
    <div className="px-3 pb-3 border-t border-border">
      {/* Comments list */}
      {loading ? (
        <div className="py-2 text-xs text-muted-foreground">Chargement...</div>
      ) : (
        <div className="max-h-48 overflow-y-auto space-y-2 py-2">
          {comments.map((comment) => (
            <div key={comment.id} className="flex items-start gap-2 group">
              <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-accent shrink-0 mt-0.5">
                {(comment.profile?.display_name || "?")[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs">
                  <span className="font-bold text-foreground">{comment.profile?.display_name}</span>{" "}
                  <span className="text-foreground/80">{comment.content}</span>
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true, locale: fr })}
                </p>
              </div>
              {(user?.id === comment.user_id || isAdmin) && (
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          ))}
          {comments.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-1">Aucun commentaire</p>
          )}
        </div>
      )}

      {/* Add comment */}
      {user && (
        <div className="flex items-center gap-2 pt-1">
          <input
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Ajouter un commentaire..."
            className="flex-1 bg-muted/50 text-foreground text-xs rounded-full px-3 py-1.5 outline-none border border-border focus:border-accent"
          />
          <button
            onClick={handleSubmit}
            disabled={!newComment.trim() || submitting}
            className="text-accent disabled:opacity-40"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};

export default CommentsSection;
