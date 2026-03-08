import { useState, useEffect } from "react";
import { ArrowLeft, Trophy, Crown, Medal, UserPlus, UserMinus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

type RankedUser = {
  user_id: string;
  display_name: string;
  avatar_url: string;
  posts_count: number;
  total_likes: number;
  score: number;
};

const RankingView = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const [rankings, setRankings] = useState<RankedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    const fetchRankings = async () => {
      const { data: posts } = await supabase
        .from("posts")
        .select("user_id, likes_count");

      if (!posts) { setLoading(false); return; }

      const userStats = new Map<string, { posts_count: number; total_likes: number }>();
      posts.forEach((p: any) => {
        const stats = userStats.get(p.user_id) || { posts_count: 0, total_likes: 0 };
        stats.posts_count++;
        stats.total_likes += p.likes_count || 0;
        userStats.set(p.user_id, stats);
      });

      const userIds = [...userStats.keys()];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      const ranked: RankedUser[] = userIds.map((uid) => {
        const stats = userStats.get(uid)!;
        const profile = profileMap.get(uid);
        return {
          user_id: uid,
          display_name: profile?.display_name || "Utilisateur",
          avatar_url: profile?.avatar_url || "",
          posts_count: stats.posts_count,
          total_likes: stats.total_likes,
          score: stats.posts_count * 10 + stats.total_likes * 5,
        };
      });

      ranked.sort((a, b) => b.score - a.score);
      setRankings(ranked);
      setLoading(false);
    };

    const fetchFollowing = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", user.id);
      if (data) {
        setFollowingSet(new Set(data.map((f) => f.following_id)));
      }
    };

    fetchRankings();
    fetchFollowing();
  }, [user]);

  const toggleFollow = async (targetId: string) => {
    if (!user) { toast.error("Connecte-toi d'abord"); return; }
    if (targetId === user.id) return;
    setToggling(targetId);

    const isFollowing = followingSet.has(targetId);

    if (isFollowing) {
      const { error } = await supabase
        .from("followers")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetId);
      if (!error) {
        setFollowingSet((prev) => { const s = new Set(prev); s.delete(targetId); return s; });
        toast.success("Unfollowed");
      }
    } else {
      const { error } = await supabase
        .from("followers")
        .insert({ follower_id: user.id, following_id: targetId });
      if (!error) {
        setFollowingSet((prev) => new Set(prev).add(targetId));
        toast.success("Suivi !");
      }
    }
    setToggling(null);
  };

  const getRankIcon = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-700" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">{index + 1}</span>;
  };

  return (
    <div className="pb-4">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={onBack}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <Trophy className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-bold text-foreground">Classement</h2>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Chargement...</div>
      ) : rankings.length === 0 ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Pas encore de classement</div>
      ) : (
        <div className="px-4 pt-3 space-y-2">
          {rankings.map((r, i) => {
            const isMe = r.user_id === user?.id;
            const isFollowing = followingSet.has(r.user_id);
            return (
              <div
                key={r.user_id}
                className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
                  isMe ? "bg-accent/10 border-accent/30" : "bg-card border-border"
                }`}
              >
                {getRankIcon(i)}
                <img
                  src={r.avatar_url || `https://ui-avatars.com/api/?name=${r.display_name}&background=random`}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {r.display_name}
                    {isMe && <span className="text-accent ml-1">(toi)</span>}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.posts_count} posts · {r.total_likes} likes
                  </p>
                </div>
                <span className="text-sm font-bold text-accent mr-2">{r.score} pts</span>
                {!isMe && user && (
                  <button
                    onClick={() => toggleFollow(r.user_id)}
                    disabled={toggling === r.user_id}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors ${
                      isFollowing
                        ? "bg-muted text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                        : "bg-accent text-accent-foreground hover:bg-accent/80"
                    }`}
                  >
                    {isFollowing ? <UserMinus className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                    {isFollowing ? "Suivi" : "Suivre"}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default RankingView;
