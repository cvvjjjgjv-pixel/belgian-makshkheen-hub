import { useState, useEffect } from "react";
import { ArrowLeft, MessageSquare, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

type MyComment = {
  id: string;
  content: string;
  created_at: string;
  post_content: string;
};

const MyCommentsView = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const [comments, setComments] = useState<MyComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchComments = async () => {
      if (!user) return;

      const { data: commentsData } = await supabase
        .from("comments")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!commentsData || commentsData.length === 0) {
        setComments([]);
        setLoading(false);
        return;
      }

      const postIds = [...new Set(commentsData.map((c: any) => c.post_id))];
      const { data: posts } = await supabase
        .from("posts")
        .select("id, content")
        .in("id", postIds);

      const postMap = new Map(posts?.map((p: any) => [p.id, p.content]) || []);

      setComments(
        commentsData.map((c: any) => ({
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          post_content: postMap.get(c.post_id) || "Post supprimé",
        }))
      );
      setLoading(false);
    };

    fetchComments();
  }, [user]);

  const deleteComment = async (id: string) => {
    await supabase.from("comments").delete().eq("id", id);
    setComments((prev) => prev.filter((c) => c.id !== id));
    toast.success("Commentaire supprimé");
  };

  return (
    <div className="pb-4">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={onBack}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <MessageSquare className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-bold text-foreground">Mes commentaires</h2>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Chargement...</div>
      ) : comments.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          Aucun commentaire pour le moment 💬
        </div>
      ) : (
        <div className="px-4 pt-3 space-y-3">
          {comments.map((c) => (
            <div key={c.id} className="p-4 rounded-2xl bg-card border border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">{c.content}</p>
                  <div className="mt-2 p-2 rounded-xl bg-muted/50">
                    <p className="text-[11px] text-muted-foreground line-clamp-1">
                      En réponse à : {c.post_content}
                    </p>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <button onClick={() => deleteComment(c.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCommentsView;
