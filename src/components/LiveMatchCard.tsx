import { Tv } from "lucide-react";
import logo from "@/assets/logo.png";

const LiveMatchCard = () => {
  return (
    <div className="mx-4 rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 to-background border border-border">
      <div className="p-4 border-b border-foreground/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-destructive text-foreground text-xs font-bold rounded-full animate-[pulse-live_2s_infinite]">
            <span className="w-2 h-2 bg-foreground rounded-full animate-[blink_1s_infinite]" />
            LIVE
          </span>
          <span className="text-sm font-bold text-foreground">Ligue des Champions</span>
        </div>
        <span className="text-xs text-muted-foreground">75'</span>
      </div>
      <div className="p-4 flex items-center justify-between">
        <div className="text-center flex-1">
          <img src={logo} className="w-16 h-16 rounded-full mx-auto mb-2 border-2 border-accent object-cover" alt="EST" />
          <p className="font-bold text-sm text-foreground">EST</p>
        </div>
        <div className="text-center px-4">
          <div className="text-4xl font-black text-accent">2 - 1</div>
          <button className="mt-2 px-4 py-1.5 bg-accent text-accent-foreground text-xs font-bold rounded-full flex items-center gap-1 mx-auto hover:opacity-90 transition-opacity">
            <Tv className="w-3 h-3" />
            Regarder
          </button>
        </div>
        <div className="text-center flex-1 opacity-60">
          <div className="w-16 h-16 rounded-full mx-auto mb-2 bg-blue-900 flex items-center justify-center text-2xl">⚽</div>
          <p className="font-bold text-sm text-foreground">ADV</p>
        </div>
      </div>
    </div>
  );
};

export default LiveMatchCard;
