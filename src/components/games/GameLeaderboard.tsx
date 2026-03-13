import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowLeft, Trophy, Crown, Medal, Flame, Target, Gamepad2 } from "lucide-react";

interface LeaderboardEntry {
  user_id: string;
  display_name: string;
  avatar_url: string;
  game_type: string;
  wins: number;
  losses: number;
  total_points: number;
  games_played: number;
  best_score: number;
}

const GAME_TABS = [
  { id: "all", label: "Général", icon: "🏆" },
  { id: "quiz", label: "Quiz", icon: "🧠" },
  { id: "guess", label: "Devine", icon: "🕵️" },
  { id: "emoji", label: "Emoji", icon: "😎" },
  { id: "chkobba", label: "Chkobba", icon: "🃏" },
  { id: "rami", label: "Rami", icon: "🎴" },
];

const GameLeaderboard = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);

      let query = supabase.from("game_scores").select("*");
      if (activeTab !== "all") {
        query = query.eq("game_type", activeTab);
      }

      const { data: scores } = await query;
      if (!scores || scores.length === 0) {
        setEntries([]);
        setLoading(false);
        return;
      }

      // Aggregate by user if "all"
      const userMap = new Map<string, { wins: number; losses: number; total_points: number; games_played: number; best_score: number; game_type: string }>();

      scores.forEach((s: any) => {
        const existing = userMap.get(s.user_id);
        if (existing) {
          existing.wins += s.wins;
          existing.losses += s.losses;
          existing.total_points += s.total_points;
          existing.games_played += s.games_played;
          existing.best_score = Math.max(existing.best_score, s.best_score);
        } else {
          userMap.set(s.user_id, {
            wins: s.wins,
            losses: s.losses,
            total_points: s.total_points,
            games_played: s.games_played,
            best_score: s.best_score,
            game_type: s.game_type,
          });
        }
      });

      const userIds = [...userMap.keys()];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      const list: LeaderboardEntry[] = userIds.map((uid) => {
        const stats = userMap.get(uid)!;
        const profile = profileMap.get(uid);
        return {
          user_id: uid,
          display_name: profile?.display_name || "Joueur",
          avatar_url: profile?.avatar_url || "",
          ...stats,
        };
      });

      list.sort((a, b) => b.total_points - a.total_points);
      setEntries(list);
      setLoading(false);
    };

    fetchLeaderboard();
  }, [activeTab]);

  const getRankDisplay = (index: number) => {
    if (index === 0) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />;
    if (index === 2) return <Medal className="w-5 h-5 text-amber-700" />;
    return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-muted-foreground">{index + 1}</span>;
  };

  const getWinRate = (wins: number, played: number) => {
    if (played === 0) return 0;
    return Math.round((wins / played) * 100);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour
        </Button>
        <h3 className="font-bold text-foreground flex items-center gap-2">
          <Trophy className="w-5 h-5 text-accent" /> Classement Jeux
        </h3>
        <div />
      </div>

      {/* Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {GAME_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.id
                ? "bg-accent text-accent-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Leaderboard */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground text-sm">Chargement...</div>
      ) : entries.length === 0 ? (
        <div className="text-center py-12 space-y-3">
          <Gamepad2 className="w-12 h-12 text-muted-foreground mx-auto opacity-50" />
          <p className="text-muted-foreground text-sm">Pas encore de scores. Joue pour apparaître ici !</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Top 3 podium */}
          {entries.length >= 3 && (
            <div className="flex items-end justify-center gap-2 py-4">
              {[1, 0, 2].map((rankIdx) => {
                const e = entries[rankIdx];
                if (!e) return null;
                const isCenter = rankIdx === 0;
                return (
                  <motion.div
                    key={e.user_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: rankIdx * 0.1 }}
                    className={`flex flex-col items-center ${isCenter ? "mb-4" : ""}`}
                  >
                    <div className={`relative ${isCenter ? "w-16 h-16" : "w-12 h-12"}`}>
                      <img
                        src={e.avatar_url || `https://ui-avatars.com/api/?name=${e.display_name}&background=random`}
                        alt=""
                        className="w-full h-full rounded-full object-cover border-2 border-accent"
                      />
                      <span className={`absolute -bottom-1 -right-1 ${isCenter ? "text-lg" : "text-sm"}`}>
                        {rankIdx === 0 ? "👑" : rankIdx === 1 ? "🥈" : "🥉"}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-foreground mt-1 truncate max-w-[80px]">{e.display_name}</p>
                    <p className="text-[10px] text-accent font-bold">{e.total_points} pts</p>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Full list */}
          {entries.map((e, i) => {
            const isMe = e.user_id === user?.id;
            const winRate = getWinRate(e.wins, e.games_played);
            return (
              <motion.div
                key={e.user_id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                  isMe ? "bg-accent/10 border-accent/30" : "bg-card border-border"
                }`}
              >
                {getRankDisplay(i)}
                <img
                  src={e.avatar_url || `https://ui-avatars.com/api/?name=${e.display_name}&background=random`}
                  alt=""
                  className="w-9 h-9 rounded-full object-cover"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">
                    {e.display_name}
                    {isMe && <span className="text-accent ml-1">(toi)</span>}
                  </p>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-0.5"><Gamepad2 className="w-3 h-3" />{e.games_played}</span>
                    <span className="flex items-center gap-0.5"><Target className="w-3 h-3" />{e.wins}W</span>
                    <span className="flex items-center gap-0.5"><Flame className="w-3 h-3" />{winRate}%</span>
                    <span>Best: {e.best_score}</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-accent">{e.total_points}</span>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default GameLeaderboard;
