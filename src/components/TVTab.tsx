import { Tv, Radio, Play, Volume2 } from "lucide-react";

const channels = [
  { name: "EST TV", icon: "🔴", active: true },
  { name: "BeIN", icon: "📺" },
  { name: "SSC", icon: "⚽" },
  { name: "Radio", icon: "📻" },
  { name: "YT Live", icon: "▶️" },
];

const TVTab = () => {
  return (
    <div className="pb-4">
      <div className="p-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Tv className="w-5 h-5 text-accent" />
          Chaînes TV
        </h2>
      </div>

      {/* Player */}
      <div className="mx-4 rounded-2xl overflow-hidden border-2 border-accent/30 bg-background">
        <div className="aspect-video bg-gradient-to-br from-muted to-background flex items-center justify-center relative">
          <div className="text-center">
            <Tv className="w-16 h-16 text-accent/30 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Sélectionnez une chaîne</p>
          </div>
        </div>
      </div>

      {/* Channel List */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-4">
        {channels.map((ch, i) => (
          <button
            key={i}
            className={`flex-shrink-0 flex flex-col items-center gap-2 px-5 py-3 rounded-xl border-2 min-w-[80px] transition-colors ${
              ch.active
                ? "border-accent bg-primary/20"
                : "border-transparent bg-secondary"
            }`}
          >
            <span className="text-2xl">{ch.icon}</span>
            <span className={`text-xs font-medium ${ch.active ? "text-accent" : "text-secondary-foreground"}`}>
              {ch.name}
            </span>
          </button>
        ))}
      </div>

      {/* Schedule */}
      <div className="px-4">
        <h3 className="text-sm font-bold text-foreground mb-3">Programme du jour</h3>
        {[
          { time: "18:00", title: "EST vs Al Ahly", badge: "LIVE", badgeColor: "bg-destructive" },
          { time: "20:00", title: "Replay: EST vs WAC", badge: "Replay", badgeColor: "bg-muted" },
          { time: "22:00", title: "Analyse d'après-match", badge: "À venir", badgeColor: "bg-accent/20 text-accent" },
        ].map((item, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border mb-2">
            <span className="text-sm font-mono text-muted-foreground w-12">{item.time}</span>
            <span className="flex-1 text-sm font-medium text-foreground">{item.title}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${item.badgeColor} text-foreground`}>
              {item.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TVTab;
