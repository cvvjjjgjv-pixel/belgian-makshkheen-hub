import { useState, useEffect } from "react";
import { ArrowLeft, Trophy, Crown, Medal } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

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

  useEffect(() => {
    const fetchRankings = async () => {
      // Get all posts with likes
      const { data: posts } = await supabase
        .from("posts")
        .select("user_id, likes_count");

      if (!posts) { setLoading(false); return; }

      // Aggregate per user
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

    fetchRankings();
  }, []);

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
          {rankings.map((r, i) => (
            <div
              key={r.user_id}
              className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
                r.user_id === user?.id
                  ? "bg-accent/10 border-accent/30"
                  : "bg-card border-border"
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
                  {r.user_id === user?.id && <span className="text-accent ml-1">(toi)</span>}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {r.posts_count} posts · {r.total_likes} likes
                </p>
              </div>
              <span className="text-sm font-bold text-accent">{r.score} pts</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RankingView;
