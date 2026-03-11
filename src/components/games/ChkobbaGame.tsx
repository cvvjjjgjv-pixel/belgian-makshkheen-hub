import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import CardComponent from "./CardComponent";
import { createDeck, shuffleDeck, type Card } from "./CardDeck";

interface ChkobbaGameProps {
  roomId: string;
  onBack: () => void;
}

interface GameState {
  deck: Card[];
  table: Card[];
  hands: Record<string, Card[]>;
  captured: Record<string, Card[]>;
  scores: Record<string, number>;
  chkobbaCount: Record<string, number>;
  currentTurn: string;
  phase: "waiting" | "playing" | "round_end" | "finished";
  lastCapture: string | null;
  playerOrder: string[];
}

const initGame = (players: string[]): GameState => {
  const deck = shuffleDeck(createDeck());
  const hands: Record<string, Card[]> = {};
  let idx = 0;
  for (const p of players) {
    hands[p] = deck.slice(idx, idx + 3);
    idx += 3;
  }
  const table = deck.slice(idx, idx + 4);
  idx += 4;
  return {
    deck: deck.slice(idx),
    table,
    hands,
    captured: Object.fromEntries(players.map(p => [p, []])),
    scores: Object.fromEntries(players.map(p => [p, 0])),
    chkobbaCount: Object.fromEntries(players.map(p => [p, 0])),
    currentTurn: players[0],
    phase: "playing",
    lastCapture: null,
    playerOrder: players,
  };
};

const ChkobbaGame = ({ roomId, onBack }: ChkobbaGameProps) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [createdBy, setCreatedBy] = useState<string | null>(null);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [selectedTable, setSelectedTable] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRules, setShowRules] = useState(false);

  const loadGame = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: room } = await supabase
      .from("game_rooms")
      .select("*")
      .eq("id", roomId)
      .single();

    const { data: gamePlayers } = await supabase
      .from("game_players")
      .select("user_id")
      .eq("room_id", roomId);

    if (!gamePlayers) return;
    if (room) setCreatedBy(room.created_by);

    const playerInfos = await Promise.all(
      gamePlayers.map(async (gp: any) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", gp.user_id)
          .maybeSingle();
        return { id: gp.user_id, name: profile?.display_name || "Joueur" };
      })
    );
    setPlayers(playerInfos);

    if (room?.game_state && Object.keys(room.game_state as object).length > 0) {
      setGameState(room.game_state as unknown as GameState);
    }
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    loadGame();
    const channel = supabase
      .channel("chkobba-" + roomId)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "game_rooms", filter: `id=eq.${roomId}` }, (payload) => {
        const newState = payload.new.game_state as unknown as GameState;
        if (newState && Object.keys(newState).length > 0) {
          setGameState(newState);
        }
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "game_players", filter: `room_id=eq.${roomId}` }, () => {
        loadGame();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [roomId, loadGame]);

  const startGame = async () => {
    if (players.length < 2) { toast.error("Il faut 2 joueurs"); return; }
    const state = initGame(players.map(p => p.id));
    await supabase
      .from("game_rooms")
      .update({ game_state: state as any, status: "playing", current_turn: state.currentTurn })
      .eq("id", roomId);
  };

  const saveState = async (state: GameState) => {
    await supabase
      .from("game_rooms")
      .update({ game_state: state as any, current_turn: state.currentTurn, status: state.phase === "finished" ? "finished" : "playing" })
      .eq("id", roomId);
  };

  const canCapture = (playedCard: Card, tableCards: Card[]): boolean => {
    if (tableCards.length === 0) return false;
    const sum = tableCards.reduce((s, c) => s + c.value, 0);
    return sum === playedCard.value;
  };

  const playCard = async () => {
    if (!gameState || !userId || !selectedCard) return;
    if (gameState.currentTurn !== userId) { toast.error("Ce n'est pas ton tour"); return; }

    const newState = JSON.parse(JSON.stringify(gameState)) as GameState;
    const handIdx = newState.hands[userId].findIndex((c: Card) => c.id === selectedCard.id);
    if (handIdx === -1) return;

    newState.hands[userId].splice(handIdx, 1);

    if (selectedTable.length > 0 && canCapture(selectedCard, selectedTable)) {
      // Capture
      const captured = [selectedCard, ...selectedTable];
      newState.captured[userId].push(...captured);
      newState.table = newState.table.filter((c: Card) => !selectedTable.some(s => s.id === c.id));
      newState.lastCapture = userId;

      // Chkobba check (table empty after capture)
      if (newState.table.length === 0) {
        newState.chkobbaCount[userId] = (newState.chkobbaCount[userId] || 0) + 1;
        toast.success("🎉 CHKOBBA !");
      }
    } else {
      // Drop card on table
      newState.table.push(selectedCard);
    }

    // Next turn
    const currentIdx = newState.playerOrder.indexOf(userId);
    const nextIdx = (currentIdx + 1) % newState.playerOrder.length;
    newState.currentTurn = newState.playerOrder[nextIdx];

    // Deal new cards if all hands empty
    const allEmpty = newState.playerOrder.every(p => newState.hands[p].length === 0);
    if (allEmpty && newState.deck.length > 0) {
      for (const p of newState.playerOrder) {
        newState.hands[p] = newState.deck.splice(0, 3);
      }
    }

    // Game end
    const gameOver = allEmpty && newState.deck.length === 0;
    if (gameOver) {
      // Last capture gets remaining table cards
      if (newState.lastCapture) {
        newState.captured[newState.lastCapture].push(...newState.table);
        newState.table = [];
      }
      // Calculate scores
      for (const p of newState.playerOrder) {
        let score = 0;
        const cap = newState.captured[p];
        if (cap.length > 20) score += 1; // Most cards
        const denariCount = cap.filter((c: Card) => c.suit === "denari").length;
        if (denariCount > 5) score += 1; // Most denari
        if (cap.some((c: Card) => c.suit === "denari" && c.value === 7)) score += 1; // 7 of denari
        score += (newState.chkobbaCount[p] || 0); // Chkobba points
        newState.scores[p] = score;
      }
      newState.phase = "finished";
    }

    setSelectedCard(null);
    setSelectedTable([]);
    await saveState(newState);
  };

  const toggleTableCard = (card: Card) => {
    setSelectedTable(prev =>
      prev.some(c => c.id === card.id) ? prev.filter(c => c.id !== card.id) : [...prev, card]
    );
  };

  const getPlayerName = (id: string) => players.find(p => p.id === id)?.name || "Joueur";

  if (loading) {
    return <div className="text-center py-12"><Loader2 className="w-8 h-8 animate-spin text-accent mx-auto" /></div>;
  }

  // Waiting room
  if (!gameState || gameState.phase === "waiting") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /> Retour</Button>
          <h3 className="font-bold text-foreground">🃏 Chkobba</h3>
          <div />
        </div>
        <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4">
          <h4 className="font-bold text-foreground">Salle d'attente</h4>
          <div className="space-y-2">
            {players.map((p) => (
              <div key={p.id} className="bg-accent/10 rounded-lg p-2 text-sm text-foreground">{p.name} {p.id === userId && "(toi)"}</div>
            ))}
          </div>
          <p className="text-sm text-muted-foreground">{players.length}/2 joueurs</p>
          {players.length >= 2 && (
            <Button onClick={startGame} className="w-full">🎮 Commencer la partie</Button>
          )}
          {players.length < 2 && (
            <p className="text-xs text-muted-foreground animate-pulse">En attente d'un adversaire...</p>
          )}
          
          <div className="bg-accent/5 border border-accent/20 rounded-xl p-4 text-left space-y-2 mt-4">
            <p className="text-sm font-bold text-foreground">📖 Comment jouer à la Chkobba :</p>
            <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
              <li>Chaque joueur reçoit 3 cartes, 4 cartes sur la table</li>
              <li>À ton tour : joue une carte de ta main</li>
              <li><strong>Capture</strong> : sélectionne des cartes de la table dont la somme = ta carte</li>
              <li>Si tu vides la table → <strong>Chkobba !</strong> (1 point bonus)</li>
              <li>Points : plus de cartes, plus de denari, 7 de denari</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Game finished
  if (gameState.phase === "finished") {
    const winner = Object.entries(gameState.scores).sort((a, b) => b[1] - a[1])[0];
    return (
      <div className="space-y-4">
        <div className="bg-card border border-border rounded-2xl p-6 text-center space-y-4">
          <h3 className="text-2xl font-black text-accent">🏆 Partie terminée !</h3>
          <p className="text-foreground font-bold">{getPlayerName(winner[0])} gagne avec {winner[1]} points !</p>
          <div className="space-y-2">
            {Object.entries(gameState.scores).map(([pid, score]) => (
              <div key={pid} className="flex justify-between bg-accent/10 rounded-lg p-2 text-sm">
                <span className="text-foreground">{getPlayerName(pid)}</span>
                <span className="font-bold text-accent">{score} pts</span>
              </div>
            ))}
          </div>
          <Button onClick={onBack} className="w-full">Retour au lobby</Button>
        </div>
      </div>
    );
  }

  // Playing
  const myHand = gameState.hands[userId || ""] || [];
  const isMyTurn = gameState.currentTurn === userId;
  const opponent = players.find(p => p.id !== userId);
  const opponentHand = opponent ? (gameState.hands[opponent.id] || []) : [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}><ArrowLeft className="w-4 h-4 mr-1" /></Button>
        <span className={`text-sm font-bold ${isMyTurn ? "text-accent" : "text-muted-foreground"}`}>
          {isMyTurn ? "🟢 Ton tour" : `⏳ Tour de ${getPlayerName(gameState.currentTurn)}`}
        </span>
        <span className="text-xs text-muted-foreground">🃏 {gameState.deck.length}</span>
      </div>

      {/* Opponent hand (face down) */}
      <div className="flex justify-center gap-1">
        {opponentHand.map((_: Card, i: number) => (
          <CardComponent key={i} card={{ suit: "denari", value: 1, id: `opp-${i}` }} faceDown size="sm" />
        ))}
      </div>
      <p className="text-center text-xs text-muted-foreground">{opponent?.name || "Adversaire"}</p>

      {/* Table */}
      <div className="bg-accent/5 border border-accent/20 rounded-2xl p-4 min-h-[100px]">
        <p className="text-xs text-muted-foreground mb-2 text-center">Table</p>
        <div className="flex flex-wrap justify-center gap-2">
          <AnimatePresence>
            {gameState.table.map((card: Card) => (
              <motion.div key={card.id} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                <CardComponent
                  card={card}
                  selected={selectedTable.some(c => c.id === card.id)}
                  onClick={() => isMyTurn && toggleTableCard(card)}
                  size="sm"
                />
              </motion.div>
            ))}
          </AnimatePresence>
          {gameState.table.length === 0 && (
            <span className="text-muted-foreground text-xs">Vide</span>
          )}
        </div>
      </div>

      {/* Scores inline */}
      <div className="flex justify-around text-xs">
        {players.map(p => (
          <span key={p.id} className="text-muted-foreground">
            {p.name}: <span className="text-accent font-bold">{gameState.captured[p.id]?.length || 0}</span> cartes
          </span>
        ))}
      </div>

      {/* My hand */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 text-center">Ta main</p>
        <div className="flex justify-center gap-2">
          {myHand.map((card: Card) => (
            <CardComponent
              key={card.id}
              card={card}
              selected={selectedCard?.id === card.id}
              onClick={() => isMyTurn && setSelectedCard(prev => prev?.id === card.id ? null : card)}
            />
          ))}
        </div>
      </div>

      {/* Action */}
      {isMyTurn && selectedCard && (
        <Button onClick={playCard} className="w-full">
          {selectedTable.length > 0 ? "Capturer" : "Poser sur la table"}
        </Button>
      )}
    </div>
  );
};

export default ChkobbaGame;
