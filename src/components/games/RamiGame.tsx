import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CardComponent from "./CardComponent";
import { createDoubleDeck, shuffleStandardDeck, type StandardCard } from "./CardDeck";

interface RamiGameProps {
  roomId: string;
  onBack: () => void;
}

interface GameState {
  deck: StandardCard[];
  discard: StandardCard[];
  hands: Record<string, StandardCard[]>;
  melds: StandardCard[][]; // validated sets/runs on table
  currentTurn: string;
  phase: "waiting" | "draw" | "play" | "finished";
  playerOrder: string[];
  winner: string | null;
  turnPhase: "must_draw" | "can_play"; // within a turn
}

const initRamiGame = (players: string[]): GameState => {
  const deck = shuffleStandardDeck(createDoubleDeck());
  const hands: Record<string, StandardCard[]> = {};
  let idx = 0;
  const cardsPerPlayer = players.length <= 2 ? 13 : 10;
  for (const p of players) {
    hands[p] = deck.slice(idx, idx + cardsPerPlayer);
    idx += cardsPerPlayer;
  }
  const discard = [deck[idx]];
  idx += 1;
  return {
    deck: deck.slice(idx),
    discard,
    hands,
    melds: [],
    currentTurn: players[0],
    phase: "play",
    playerOrder: players,
    winner: null,
    turnPhase: "must_draw",
  };
};

// Check if cards form a valid set (same value, different suits) or run (same suit, consecutive)
const isValidMeld = (cards: StandardCard[]): boolean => {
  if (cards.length < 3) return false;
  // Set: same value
  const allSameValue = cards.every(c => c.value === cards[0].value);
  if (allSameValue && cards.length <= 4) {
    const suits = new Set(cards.map(c => c.suit));
    return suits.size === cards.length;
  }
  // Run: same suit, consecutive
  const allSameSuit = cards.every(c => c.suit === cards[0].suit);
  if (allSameSuit) {
    const sorted = [...cards].sort((a, b) => a.value - b.value);
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i].value !== sorted[i - 1].value + 1) return false;
    }
    return true;
  }
  return false;
};

const RamiGame = ({ roomId, onBack }: RamiGameProps) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [selectedCards, setSelectedCards] = useState<StandardCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadGame = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: room } = await supabase.from("game_rooms").select("*").eq("id", roomId).single();
    const { data: gamePlayers } = await supabase.from("game_players").select("user_id").eq("room_id", roomId);

    if (!gamePlayers) { setLoading(false); return; }
    if (room) setCreatedBy(room.created_by);

    const infos = await Promise.all(
      gamePlayers.map(async (gp: any) => {
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("user_id", gp.user_id).maybeSingle();
        return { id: gp.user_id, name: profile?.display_name || "Joueur" };
      })
    );
    setPlayers(infos);

    if (room?.game_state && Object.keys(room.game_state as object).length > 0) {
      setGameState(room.game_state as unknown as GameState);
    }
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    loadGame();
    const channel = supabase
      .channel("rami-" + roomId)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}` }, (payload) => {
        const s = payload.new.game_state as unknown as GameState;
        if (s && Object.keys(s).length > 0) setGameState(s);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `room_id=eq.${roomId}` }, () => loadGame())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, loadGame]);

  const saveState = async (state: GameState) => {
    await supabase.from("game_rooms")
      .update({ game_state: state as any, current_turn: state.currentTurn, status: state.phase === "finished" ? "finished" : "playing" })
      .eq("id", roomId);
  };

  const startGame = async () => {
    if (players.length < 2) { toast.error("Il faut au moins 2 joueurs"); return; }
    const state = initRamiGame(players.map(p => p.id));
    await saveState(state);
  };

  const drawFromDeck = async () => {
    if (!gameState || !userId || gameState.currentTurn !== userId || gameState.turnPhase !== "must_draw") return;
    const s = JSON.parse(JSON.stringify(gameState)) as GameState;
    if (s.deck.length === 0) { toast.error("Plus de cartes"); return; }
    const card = s.deck.shift()!;
    s.hands[userId].push(card);
    s.turnPhase = "can_play";
    await saveState(s);
  };

  const drawFromDiscard = async () => {
    if (!gameState || !userId || gameState.currentTurn !== userId || gameState.turnPhase !== "must_draw") return;
    const s = JSON.parse(JSON.stringify(gameState)) as GameState;
    if (s.discard.length === 0) return;
    const card = s.discard.pop()!;
    s.hands[userId].push(card);
    s.turnPhase = "can_play";
    await saveState(s);
  };

  const layMeld = async () => {
    if (!gameState || !userId || selectedCards.length < 3) return;
    if (!isValidMeld(selectedCards)) { toast.error("Combinaison invalide ! (brelan ou suite de 3+ cartes)"); return; }
    const s = JSON.parse(JSON.stringify(gameState)) as GameState;
    s.melds.push(selectedCards);
    s.hands[userId] = s.hands[userId].filter((c: StandardCard) => !selectedCards.some(sc => sc.id === c.id));
    setSelectedCards([]);

    if (s.hands[userId].length === 0) {
      s.phase = "finished";
      s.winner = userId;
      toast.success("🏆 Tu as gagné !");
    }
    await saveState(s);
  };

  const discardCard = async () => {
    if (!gameState || !userId || selectedCards.length !== 1 || gameState.turnPhase !== "can_play") return;
    const s = JSON.parse(JSON.stringify(gameState)) as GameState;
    const card = selectedCards[0];
    s.hands[userId] = s.hands[userId].filter((c: StandardCard) => c.id !== card.id);
    s.discard.push(card);
    setSelectedCards([]);

    if (s.hands[userId].length === 0) {
      s.phase = "finished";
      s.winner = userId;
    } else {
      const idx = s.playerOrder.indexOf(userId);
      s.currentTurn = s.playerOrder[(idx + 1) % s.playerOrder.length];
      s.turnPhase = "must_draw";
    }
    await saveState(s);
  };

  const toggleCard = (card: StandardCard) => {
    setSelectedCards(prev =>
      prev.some(c => c.id === card.id) ? prev.filter(c => c.id !== card.id) : [...prev, card]
    );
  };

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || "Joueur";

  if (loading) return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" /></div>;

  if (!gameState || gameState.phase === "waiting") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Retour</Button>
          <h3 className="font-bold text-foreground">🎴 Rami</h3>
          <div />
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4">
          <h4 className="font-bold text-foreground">Salle d'attente</h4>
          {players.map(p => (
            <div key={p.id} className="bg-accent/10 rounded-lg p-2 text-sm text-foreground">{p.name} {p.id === userId && "(toi)"}</div>
          ))}
          <p className="text-sm text-muted-foreground">{players.length}/2 joueurs</p>
          {players.length >= 2 && (createdBy === userId || players[0]?.id === userId) && (
            <Button onClick={startGame} className="w-full">🎮 Commencer la partie</Button>
          )}
          {players.length < 2 && <p className="text-xs text-muted-foreground animate-pulse">En attente d'un adversaire...</p>}
          
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-left space-y-2 mt-4">
            <p className="text-sm font-bold text-foreground">📖 Comment jouer au Rami :</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Chaque joueur reçoit 13 cartes</li>
              <li>À ton tour : <strong>pioche</strong> une carte (deck ou défausse)</li>
              <li>Puis <strong>pose des combinaisons</strong> (3+ cartes même valeur ou suite même couleur)</li>
              <li>Termine ton tour en <strong>défaussant</strong> 1 carte</li>
              <li>Le premier à vider sa main gagne ! 🏆</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.phase === "finished") {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4">
        <h3 className="text-2xl font-black text-accent">🏆 {getPlayerName(gameState.winner || "")} gagne !</h3>
        <Button onClick={onBack} className="w-full">Retour au lobby</Button>
      </div>
    );
  }

  const myHand = (gameState.hands[userId || ""] || []).sort((a: StandardCard, b: StandardCard) => a.suit === b.suit ? a.value - b.value : a.suit.localeCompare(b.suit));
  const isMyTurn = gameState.currentTurn === userId;
  const topDiscard = gameState.discard[gameState.discard.length - 1];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /></Button>
        <span className={`text-sm font-bold ${isMyTurn ? "text-accent" : "text-muted-foreground"}`}>
          {isMyTurn ? (gameState.turnPhase === "must_draw" ? "🟢 Pioche !" : "🟢 Joue ou défausse") : `⏳ ${getPlayerName(gameState.currentTurn)}`}
        </span>
        <span className="text-xs text-muted-foreground">🃏 {gameState.deck.length}</span>
      </div>

      {/* Other players info */}
      <div className="flex justify-center gap-4">
        {players.filter(p => p.id !== userId).map(p => (
          <div key={p.id} className="text-center">
            <div className="flex gap-0.5 justify-center">
              {(gameState.hands[p.id] || []).slice(0, 5).map((_: StandardCard, i: number) => (
                <div key={i} className="w-6 h-9 rounded bg-accent/30 border border-accent/20" />
              ))}
              {(gameState.hands[p.id]?.length || 0) > 5 && (
                <span className="text-xs text-muted-foreground self-center ml-1">+{(gameState.hands[p.id]?.length || 0) - 5}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{p.name}</p>
          </div>
        ))}
      </div>

      {/* Melds on table */}
      {gameState.melds.length > 0 && (
        <div className="bg-accent/5 border border-accent/20 rounded-xl p-3">
          <p className="text-xs text-muted-foreground mb-2">Combinaisons posées</p>
          <div className="space-y-2">
            {gameState.melds.map((meld, mi) => (
              <div key={mi} className="flex gap-1 justify-center">
                {meld.map((card: StandardCard) => (
                  <CardComponent key={card.id} card={card} size="sm" type="standard" />
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Draw area */}
      <div className="flex justify-center gap-4 items-center">
        <button
          onClick={drawFromDeck}
          disabled={!isMyTurn || gameState.turnPhase !== "must_draw"}
          className="w-14 h-20 rounded-lg bg-gradient-to-br from-accent/60 to-accent/30 border-2 border-accent/40 flex items-center justify-center shadow-md disabled:opacity-40"
        >
          <span className="text-lg">🂠</span>
        </button>
        <div className="text-muted-foreground text-xs">ou</div>
        {topDiscard ? (
          <button onClick={drawFromDiscard} disabled={!isMyTurn || gameState.turnPhase !== "must_draw"} className="disabled:opacity-40">
            <CardComponent card={topDiscard} type="standard" />
          </button>
        ) : (
          <div className="w-14 h-20 rounded-lg border-2 border-dashed border-border flex items-center justify-center text-xs text-muted-foreground">Vide</div>
        )}
      </div>

      {/* My hand */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 text-center">Ta main ({myHand.length})</p>
        <div className="flex flex-wrap justify-center gap-1">
          {myHand.map((card: StandardCard) => (
            <CardComponent
              key={card.id}
              card={card}
              type="standard"
              size="sm"
              selected={selectedCards.some(c => c.id === card.id)}
              onClick={() => isMyTurn && gameState.turnPhase === "can_play" && toggleCard(card)}
            />
          ))}
        </div>
      </div>

      {/* Actions */}
      {isMyTurn && gameState.turnPhase === "can_play" && selectedCards.length > 0 && (
        <div className="flex gap-2">
          {selectedCards.length >= 3 && (
            <Button onClick={layMeld} className="flex-1" variant="outline">Poser combinaison</Button>
          )}
          {selectedCards.length === 1 && (
            <Button onClick={discardCard} className="flex-1">Défausser</Button>
          )}
        </div>
      )}
    </div>
  );
};

export default RamiGame;
