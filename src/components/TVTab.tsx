import { useState, useEffect } from "react";
import { Tv, Plus, Trash2, Radio, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Channel {
  id: string;
  name: string;
  icon: string;
  youtube_url: string | null;
  is_live: boolean;
  schedule_time: string | null;
  schedule_title: string | null;
  sort_order: number;
}

const extractYoutubeId = (url: string): string | null => {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/live\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
};

const TVTab = () => {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📺");
  const [newUrl, setNewUrl] = useState("");
  const [newIsLive, setNewIsLive] = useState(false);

  const fetchChannels = async () => {
    const { data } = await supabase
      .from("tv_channels")
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) {
      setChannels(data as Channel[]);
      if (!activeChannel && data.length > 0) {
        setActiveChannel(data[0] as Channel);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchChannels();
    const channel = supabase
      .channel("tv-channels-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "tv_channels" }, () => {
        fetchChannels();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  const addChannel = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("tv_channels").insert({
      name: newName.trim(),
      icon: newIcon || "📺",
      youtube_url: newUrl.trim() || null,
      is_live: newIsLive,
      sort_order: channels.length,
    });
    if (error) {
      toast.error("Erreur: " + error.message);
    } else {
      toast.success("Chaîne ajoutée !");
      setShowAdd(false);
      setNewName("");
      setNewIcon("📺");
      setNewUrl("");
      setNewIsLive(false);
    }
  };

  const deleteChannel = async (id: string) => {
    await supabase.from("tv_channels").delete().eq("id", id);
    if (activeChannel?.id === id) setActiveChannel(null);
    toast.success("Chaîne supprimée");
  };

  const toggleLive = async (ch: Channel) => {
    await supabase.from("tv_channels").update({ is_live: !ch.is_live }).eq("id", ch.id);
  };

  const videoId = activeChannel?.youtube_url ? extractYoutubeId(activeChannel.youtube_url) : null;

  return (
    <div className="pb-4">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Tv className="w-5 h-5 text-accent" />
          Chaînes TV
        </h2>
        {isAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-accent text-accent-foreground text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" /> Ajouter
          </button>
        )}
      </div>

      {/* Player */}
      <div className="mx-4 rounded-2xl overflow-hidden border-2 border-accent/30 bg-background">
        <div className="aspect-video bg-gradient-to-br from-muted to-background flex items-center justify-center relative">
          {videoId ? (
            <iframe
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              className="w-full h-full absolute inset-0"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
              title={activeChannel?.name || "TV"}
            />
          ) : (
            <div className="text-center">
              <Tv className="w-16 h-16 text-accent/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">
                {channels.length === 0 ? "Aucune chaîne disponible" : "Sélectionnez une chaîne"}
              </p>
            </div>
          )}
        </div>
        {activeChannel && (
          <div className="px-4 py-2 flex items-center gap-2 bg-card border-t border-border">
            <span className="text-lg">{activeChannel.icon}</span>
            <span className="text-sm font-bold text-foreground flex-1">{activeChannel.name}</span>
            {activeChannel.is_live && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-destructive text-white text-[10px] font-bold rounded-full">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                LIVE
              </span>
            )}
            {activeChannel.youtube_url && (
              <a
                href={activeChannel.youtube_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-accent"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        )}
      </div>

      {/* Channel List */}
      <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-4">
        {channels.map((ch) => (
          <button
            key={ch.id}
            onClick={() => setActiveChannel(ch)}
            className={`flex-shrink-0 flex flex-col items-center gap-2 px-5 py-3 rounded-xl border-2 min-w-[80px] transition-colors relative ${
              activeChannel?.id === ch.id
                ? "border-accent bg-primary/20"
                : "border-transparent bg-secondary"
            }`}
          >
            {ch.is_live && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-destructive rounded-full border-2 border-background animate-pulse" />
            )}
            <span className="text-2xl">{ch.icon}</span>
            <span className={`text-xs font-medium ${activeChannel?.id === ch.id ? "text-accent" : "text-secondary-foreground"}`}>
              {ch.name}
            </span>
            {isAdmin && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteChannel(ch.id); }}
                className="absolute top-1 left-1 p-0.5 rounded-full bg-destructive/20 text-destructive opacity-0 group-hover:opacity-100 hover:opacity-100"
                style={{ opacity: 1, transform: "scale(0.7)" }}
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </button>
        ))}
      </div>

      {/* Loading */}
      {loading && (
        <div className="px-4 text-center py-8">
          <p className="text-muted-foreground text-sm animate-pulse">Chargement...</p>
        </div>
      )}

      {/* Admin Add Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">Ajouter une chaîne</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nom de la chaîne"
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              value={newIcon}
              onChange={(e) => setNewIcon(e.target.value)}
              placeholder="Emoji (ex: 📺)"
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <input
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="Lien YouTube (live ou vidéo)"
              className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-accent"
            />
            <label className="flex items-center gap-3 text-sm text-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={newIsLive}
                onChange={(e) => setNewIsLive(e.target.checked)}
                className="w-4 h-4 accent-accent"
              />
              <Radio className="w-4 h-4 text-destructive" />
              Marquer comme LIVE
            </label>
            <button
              onClick={addChannel}
              disabled={!newName.trim()}
              className="w-full py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm disabled:opacity-50"
            >
              Ajouter la chaîne
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TVTab;
