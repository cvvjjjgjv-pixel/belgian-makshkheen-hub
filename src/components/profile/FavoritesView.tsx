import { useState, useEffect } from "react";
import { ArrowLeft, Heart, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

type FavoritePost = {
  id: string;
  post_id: string;
  created_at: string;
  post_content: string;
  post_author: string;
  post_created_at: string;
};

const FavoritesView = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoritePost[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchFavorites = async () => {
    if (!user) return;
    const { data: favs } = await supabase
      .from("favorites")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!favs || favs.length === 0) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    const postIds = favs.map((f: any) => f.post_id);
    const { data: posts } = await supabase
      .from("posts")
      .select("id, content, user_id, created_at")
      .in("id", postIds);

    const userIds = [...new Set(posts?.map((p: any) => p.user_id) || [])];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p.display_name]) || []);
    const postMap = new Map(posts?.map((p: any) => [p.id, p]) || []);

    setFavorites(
      favs.map((f: any) => {
        const post = postMap.get(f.post_id);
        return {
          id: f.id,
          post_id: f.post_id,
          created_at: f.created_at,
          post_content: post?.content || "Post supprimé",
          post_author: profileMap.get(post?.user_id) || "Inconnu",
          post_created_at: post?.created_at || f.created_at,
        };
      })
    );
    setLoading(false);
  };

  useEffect(() => {
    fetchFavorites();
  }, [user]);

  const removeFavorite = async (id: string) => {
    await supabase.from("favorites").delete().eq("id", id);
    setFavorites((prev) => prev.filter((f) => f.id !== id));
    toast.success("Retiré des favoris");
  };

  return (
    <div className="pb-4">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={onBack}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <Heart className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-bold text-foreground">Mes favoris</h2>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Chargement...</div>
      ) : favorites.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">
          Aucun favori pour le moment. Ajoute des posts à tes favoris ! ❤️
        </div>
      ) : (
        <div className="px-4 pt-3 space-y-3">
          {favorites.map((fav) => (
            <div key={fav.id} className="p-4 rounded-2xl bg-card border border-border">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-muted-foreground mb-1">{fav.post_author}</p>
                  <p className="text-sm text-foreground line-clamp-2">{fav.post_content}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(fav.post_created_at), { addSuffix: true, locale: fr })}
                  </p>
                </div>
                <button onClick={() => removeFavorite(fav.id)} className="text-muted-foreground hover:text-destructive">
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

export default FavoritesView;
