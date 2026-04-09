import { useEffect, useState, useCallback } from "react";
import { RefreshCw, Trophy, Clock, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface MatchStatus {
  short: string;
  long: string;
  elapsed: number | null;
}

interface Team {
  id: number;
  name: string;
  logo: string;
  winner: boolean | null;
}

interface Match {
  id: number;
  date: string;
  status: MatchStatus;
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    round: string;
  };
  home: Team;
  away: Team;
  goals: { home: number | null; away: number | null };
}

const LIVE_STATUSES = ["1H", "2H", "HT", "ET", "BT", "P", "SUSP", "INT", "LIVE"];
const FINISHED_STATUSES = ["FT", "AET", "PEN"];

const LiveScoresWidget = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [mode, setMode] = useState<"live" | "today">("live");

  const fetchScores = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("live-scores", {
        body: { action: mode },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setMatches(data?.fixtures || []);
    } catch (err: any) {
      console.error("Live scores error:", err);
      if (err.message?.includes("FOOTBALL_API_KEY")) {
        setError("API non configurée");
      } else {
        setError("Impossible de charger les scores");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchScores();
    // Auto-refresh every 2 minutes for live scores
    const interval = mode === "live" ? setInterval(() => fetchScores(true), 120000) : null;
    return () => { if (interval) clearInterval(interval); };
  }, [mode, fetchScores]);

  const getStatusBadge = (status: MatchStatus) => {
    if (LIVE_STATUSES.includes(status.short)) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-destructive text-white text-[10px] font-bold rounded-full">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          {status.elapsed ? `${status.elapsed}'` : status.short}
        </span>
      );
    }
    if (FINISHED_STATUSES.includes(status.short)) {
      return <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold rounded-full">Terminé</span>;
    }
    if (status.short === "NS") {
      const time = new Date(matches.find(m => m.status === status)?.date || "").toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      return <span className="px-2 py-0.5 bg-accent/10 text-accent text-[10px] font-bold rounded-full">{time}</span>;
    }
    return <span className="px-2 py-0.5 bg-muted text-muted-foreground text-[10px] font-bold rounded-full">{status.short}</span>;
  };

  const formatMatchTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  };

  const liveMatches = matches.filter(m => LIVE_STATUSES.includes(m.status.short));
  const otherMatches = matches.filter(m => !LIVE_STATUSES.includes(m.status.short));
  const displayMatches = expanded ? matches : [...liveMatches, ...otherMatches].slice(0, 5);

  // Group by league
  const groupedMatches = displayMatches.reduce((acc, match) => {
    const key = `${match.league.country} - ${match.league.name}`;
    if (!acc[key]) acc[key] = { league: match.league, matches: [] };
    acc[key].matches.push(match);
    return acc;
  }, {} as Record<string, { league: Match["league"]; matches: Match[] }>);

  return (
    <div className="mx-4 mb-4">
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Header */}
        <div className="p-3 flex items-center justify-between border-b border-border">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-accent" />
            <h3 className="text-sm font-bold text-foreground">Scores en Direct</h3>
            {liveMatches.length > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-destructive/10 text-destructive text-[10px] font-bold rounded-full">
                <Zap className="w-3 h-3" />
                {liveMatches.length} LIVE
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setMode(mode === "live" ? "today" : "live")}
              className={`px-2 py-1 rounded-full text-[10px] font-bold border transition-colors ${
                mode === "live" ? "bg-destructive/10 text-destructive border-destructive/30" : "bg-accent/10 text-accent border-accent/30"
              }`}
            >
              {mode === "live" ? "🔴 Live" : "📅 Aujourd'hui"}
            </button>
            <button
              onClick={() => fetchScores(true)}
              disabled={refreshing}
              className="p-1.5 rounded-full text-muted-foreground hover:text-accent transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[400px] overflow-y-auto">
          {loading && (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="flex items-center justify-between">
                  <div className="skeleton-loading h-4 w-24 rounded" />
                  <div className="skeleton-loading h-6 w-12 rounded" />
                  <div className="skeleton-loading h-4 w-24 rounded" />
                </div>
              ))}
            </div>
          )}

          {error && !loading && (
            <div className="p-6 text-center">
              <p className="text-muted-foreground text-xs">{error}</p>
              <button onClick={() => fetchScores()} className="mt-2 px-3 py-1 bg-accent text-accent-foreground text-xs font-bold rounded-full">
                Réessayer
              </button>
            </div>
          )}

          {!loading && !error && matches.length === 0 && (
            <div className="p-6 text-center">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">
                {mode === "live" ? "Aucun match en direct" : "Aucun match aujourd'hui"}
              </p>
              {mode === "live" && (
                <button onClick={() => setMode("today")} className="mt-2 text-accent text-xs font-semibold">
                  Voir les matchs du jour →
                </button>
              )}
            </div>
          )}

          {!loading && !error && Object.entries(groupedMatches).map(([key, group]) => (
            <div key={key}>
              {/* League header */}
              <div className="px-3 py-1.5 bg-muted/50 flex items-center gap-2 border-b border-border">
                {group.league.logo && (
                  <img src={group.league.logo} alt="" className="w-4 h-4 object-contain" />
                )}
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide truncate">
                  {key}
                </span>
              </div>

              {/* Matches */}
              {group.matches.map((match) => (
                <div key={match.id} className="px-3 py-2.5 border-b border-border/50 last:border-b-0">
                  <div className="flex items-center gap-2">
                    {/* Home team */}
                    <div className="flex-1 flex items-center gap-2 justify-end">
                      <span className={`text-xs font-semibold text-right truncate ${
                        match.home.winner ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {match.home.name}
                      </span>
                      {match.home.logo && (
                        <img src={match.home.logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                      )}
                    </div>

                    {/* Score */}
                    <div className="flex-shrink-0 w-16 text-center">
                      {match.goals.home !== null ? (
                        <div className={`px-2 py-1 rounded-lg font-bold text-sm ${
                          LIVE_STATUSES.includes(match.status.short)
                            ? "bg-destructive/10 text-destructive"
                            : "bg-muted text-foreground"
                        }`}>
                          {match.goals.home} - {match.goals.away}
                        </div>
                      ) : (
                        <div className="px-2 py-1 rounded-lg bg-accent/10 text-accent text-xs font-bold">
                          {formatMatchTime(match.date)}
                        </div>
                      )}
                    </div>

                    {/* Away team */}
                    <div className="flex-1 flex items-center gap-2">
                      {match.away.logo && (
                        <img src={match.away.logo} alt="" className="w-5 h-5 object-contain flex-shrink-0" />
                      )}
                      <span className={`text-xs font-semibold truncate ${
                        match.away.winner ? "text-foreground" : "text-muted-foreground"
                      }`}>
                        {match.away.name}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div className="flex justify-center mt-1">
                    {getStatusBadge(match.status)}
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Expand/Collapse */}
        {matches.length > 5 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full py-2 flex items-center justify-center gap-1 text-accent text-xs font-semibold border-t border-border hover:bg-muted/50 transition-colors"
          >
            {expanded ? (
              <>Voir moins <ChevronUp className="w-3 h-3" /></>
            ) : (
              <>Voir les {matches.length} matchs <ChevronDown className="w-3 h-3" /></>
            )}
          </button>
        )}
      </div>
    </div>
  );
};

export default LiveScoresWidget;
