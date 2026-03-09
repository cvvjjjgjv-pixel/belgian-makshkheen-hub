import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Users, Plus, ArrowLeft, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface GameLobbyProps {
  gameType: "chkobba" | "rami";
  onBack: () => void;
  onGameStart: (roomId: string) => void;
}

interface Room {
  id: string;
  status: string;
  created_by: string;
  max_players: number;
  created_at: string;
  playerCount: number;
  creatorName: string;
}

const GameLobby = ({ gameType, onBack, onGameStart }: GameLobbyProps) => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const fetchRooms = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) setCurrentUserId(user.id);

    const { data: roomsData } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("game_type", gameType)
      .in("status", ["waiting", "playing"])
      .order("created_at", { ascending: false });

    if (!roomsData) { setLoading(false); return; }

    const roomsWithPlayers: Room[] = await Promise.all(
      roomsData.map(async (room: any) => {
        const { count } = await supabase
          .from("game_players")
          .select("*", { count: "exact", head: true })
          .eq("room_id", room.id);

        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", room.created_by)
          .maybeSingle();

        return {
          ...room,
          playerCount: count || 0,
          creatorName: profile?.display_name || "Joueur",
        };
      })
    );

    setRooms(roomsWithPlayers);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
    const channel = supabase
      .channel("game-lobby-" + gameType)
      .on("postgres_changes", { event: "*", schema: "public", table: "game_rooms", filter: `game_type=eq.${gameType}` }, () => fetchRooms())
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players" }, () => fetchRooms())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [gameType]);

  const createRoom = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Connecte-toi pour jouer"); return; }

    setCreating(true);
    const maxPlayers = gameType === "rami" ? 4 : 2;
    const { data: room, error } = await supabase
      .from("game_rooms")
      .insert({ game_type: gameType, created_by: user.id, max_players: maxPlayers })
      .select()
      .single();

    if (error || !room) {
      toast.error("Erreur de création");
      setCreating(false);
      return;
    }

    await supabase
      .from("game_players")
      .insert({ room_id: room.id, user_id: user.id });

    setCreating(false);
    onGameStart(room.id);
  };

  const joinRoom = async (roomId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Connecte-toi pour jouer"); return; }

    const { error } = await supabase
      .from("game_players")
      .insert({ room_id: roomId, user_id: user.id });

    if (error) {
      if (error.code === "23505") toast.error("Tu es déjà dans cette partie");
      else toast.error("Impossible de rejoindre");
      return;
    }

    onGameStart(roomId);
  };

  const title = gameType === "chkobba" ? "🃏 Chkobba" : "🎴 Rami";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Retour
        </Button>
        <h3 className="font-bold text-foreground">{title}</h3>
        <div />
      </div>

      <Button onClick={createRoom} disabled={creating} className="w-full">
        {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
        Créer une partie
      </Button>

      <div className="space-y-2">
        <h4 className="text-sm font-medium text-muted-foreground">Parties disponibles</h4>
        {loading ? (
          <div className="text-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-accent mx-auto" />
          </div>
        ) : rooms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Aucune partie en cours. Crée la tienne !
          </div>
        ) : (
          rooms.map((room) => (
            <motion.div
              key={room.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card border border-border rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <p className="font-medium text-foreground text-sm">{room.creatorName}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Users className="w-3 h-3" /> {room.playerCount}/{room.max_players}
                  {room.status === "playing" && <span className="ml-2 text-accent">En cours</span>}
                </p>
              </div>
              {room.status === "waiting" && room.playerCount < room.max_players ? (
                <Button size="sm" onClick={() => joinRoom(room.id)}>Rejoindre</Button>
              ) : room.created_by === currentUserId && room.status === "waiting" ? (
                <Button size="sm" variant="outline" onClick={() => onGameStart(room.id)}>Entrer</Button>
              ) : (
                <span className="text-xs text-muted-foreground">Complet</span>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default GameLobby;
