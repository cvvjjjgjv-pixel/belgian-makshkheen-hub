import { useState, useEffect } from "react";
import { ArrowLeft, Star, Pencil, MessageSquare, Heart, Shield, Users, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  awarded_at?: string;
};

const iconMap: Record<string, any> = {
  pencil: Pencil,
  "message-square": MessageSquare,
  heart: Heart,
  shield: Shield,
  users: Users,
  star: Star,
};

const BadgesView = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const [badges, setBadges] = useState<Badge[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBadges = async () => {
      if (!user) return;

      const { data: allBadges } = await supabase
        .from("badges")
        .select("*")
        .order("created_at", { ascending: true });

      const { data: userBadges } = await supabase
        .from("user_badges")
        .select("badge_id, awarded_at")
        .eq("user_id", user.id);

      const earnedMap = new Map(userBadges?.map((ub: any) => [ub.badge_id, ub.awarded_at]) || []);

      setBadges(
        (allBadges || []).map((b: any) => ({
          id: b.id,
          name: b.name,
          description: b.description,
          icon: b.icon,
          earned: earnedMap.has(b.id),
          awarded_at: earnedMap.get(b.id),
        }))
      );
      setLoading(false);
    };

    fetchBadges();
  }, [user]);

  const earnedCount = badges.filter((b) => b.earned).length;

  return (
    <div className="pb-4">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={onBack}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <Star className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-bold text-foreground">Badges</h2>
        <span className="ml-auto text-xs font-bold text-accent">{earnedCount}/{badges.length}</span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-muted-foreground text-sm">Chargement...</div>
      ) : (
        <div className="px-4 pt-3 grid grid-cols-2 gap-3">
          {badges.map((badge) => {
            const Icon = iconMap[badge.icon] || Star;
            return (
              <div
                key={badge.id}
                className={`p-4 rounded-2xl border text-center transition-all ${
                  badge.earned
                    ? "bg-accent/10 border-accent/30"
                    : "bg-card border-border opacity-50"
                }`}
              >
                <div className={`w-12 h-12 rounded-full mx-auto mb-2 flex items-center justify-center ${
                  badge.earned ? "bg-accent/20" : "bg-muted"
                }`}>
                  {badge.earned ? (
                    <Icon className="w-6 h-6 text-accent" />
                  ) : (
                    <Lock className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <p className="text-xs font-bold text-foreground">{badge.name}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{badge.description}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BadgesView;
