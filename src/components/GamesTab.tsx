import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gamepad2, Trophy, RotateCcw, CheckCircle, XCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import GameLobby from "@/components/games/GameLobby";
import ChkobbaGame from "@/components/games/ChkobbaGame";
import RamiGame from "@/components/games/RamiGame";

type GameType = "menu" | "quiz" | "guess" | "emoji" | "chkobba-lobby" | "chkobba-game" | "rami-lobby" | "rami-game";

const QUIZ_QUESTIONS = [
  { question: "En quelle année l'EST a remporté sa première Ligue des Champions ?", options: ["1991", "1994", "2011", "2018"], answer: 1 },
  { question: "Quel joueur tunisien a marqué en finale de la CAN 2004 ?", options: ["Jaziri", "Dos Santos", "Trabelsi", "Badri"], answer: 1 },
  { question: "Combien de fois la Tunisie a participé à la Coupe du Monde ?", options: ["3", "4", "5", "6"], answer: 3 },
  { question: "Quel est le surnom de l'Espérance de Tunis ?", options: ["Les Aigles", "Le Taraji", "Les Lions", "Les Étoiles"], answer: 1 },
  { question: "En quelle année la Tunisie a remporté la CAN ?", options: ["2000", "2002", "2004", "2006"], answer: 2 },
  { question: "Quel stade accueille les matchs de l'EST ?", options: ["Stade Olympique", "Stade de Radès", "Stade El Menzah", "Stade de Sousse"], answer: 1 },
  { question: "Qui est le meilleur buteur historique de l'EST ?", options: ["Badri", "Msakni", "Ben Yahia", "Mkacher"], answer: 0 },
  { question: "Quelle équipe est le rival historique de l'EST ?", options: ["CSS", "CA", "ESS", "USM"], answer: 1 },
];

const EMOJI_PLAYERS = [
  { emojis: "🇹🇳⚡👟🔴🟡", answer: "Msakni", hints: ["Ailier", "EST", "Rapide"] },
  { emojis: "🇹🇳🧤🥅💪", answer: "Ben Mustapha", hints: ["Gardien", "EST", "Sélection"] },
  { emojis: "🇹🇳🦁⚽🏆", answer: "Badri", hints: ["Attaquant", "Buteur", "EST"] },
  { emojis: "🇹🇳🎯🦵🔥", answer: "Khazri", hints: ["Milieu", "Ligue 1", "Tir puissant"] },
  { emojis: "🇹🇳🏃‍♂️💨⭐", answer: "Sliti", hints: ["Ailier", "Technique", "Dribbleur"] },
];

const GUESS_PLAYERS = [
  { clues: ["Attaquant tunisien", "A joué en Premier League", "Né à Sousse", "A porté le numéro 25"], answer: "Msakni" },
  { clues: ["Défenseur central", "Capitaine légendaire de l'EST", "Connu pour sa rigueur", "Plus de 300 matchs"], answer: "Ben Yahia" },
  { clues: ["Milieu de terrain", "International tunisien", "A joué en France", "Buteur en Coupe du Monde"], answer: "Khazri" },
];

const GamesTab = () => {
  const [currentGame, setCurrentGame] = useState<GameType>("menu");
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);

  return (
    <div className="px-4 py-4 space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <Gamepad2 className="w-6 h-6 text-accent" />
        <h2 className="text-xl font-bold text-foreground">Mini-Jeux</h2>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentGame}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.2 }}
        >
          {currentGame === "menu" && <GameMenu onSelect={setCurrentGame} />}
          {currentGame === "quiz" && <QuizGame onBack={() => setCurrentGame("menu")} />}
          {currentGame === "guess" && <GuessPlayerGame onBack={() => setCurrentGame("menu")} />}
          {currentGame === "emoji" && <EmojiGame onBack={() => setCurrentGame("menu")} />}
          {currentGame === "chkobba-lobby" && (
            <GameLobby gameType="chkobba" onBack={() => setCurrentGame("menu")} onGameStart={(id) => { setActiveRoomId(id); setCurrentGame("chkobba-game"); }} />
          )}
          {currentGame === "chkobba-game" && activeRoomId && (
            <ChkobbaGame roomId={activeRoomId} onBack={() => setCurrentGame("chkobba-lobby")} />
          )}
          {currentGame === "rami-lobby" && (
            <GameLobby gameType="rami" onBack={() => setCurrentGame("menu")} onGameStart={(id) => { setActiveRoomId(id); setCurrentGame("rami-game"); }} />
          )}
          {currentGame === "rami-game" && activeRoomId && (
            <RamiGame roomId={activeRoomId} onBack={() => setCurrentGame("rami-lobby")} />
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

const GameMenu = ({ onSelect }: { onSelect: (game: GameType) => void }) => {
  const games = [
    { id: "quiz" as GameType, title: "Quiz Sportif", desc: "Teste tes connaissances sur le foot tunisien", icon: "🧠", color: "from-accent/20 to-accent/5" },
    { id: "guess" as GameType, title: "Devine le Joueur", desc: "Trouve le joueur à partir des indices", icon: "🕵️", color: "from-primary/20 to-primary/5" },
    { id: "emoji" as GameType, title: "Emoji Joueur", desc: "Reconnais le joueur grâce aux emojis", icon: "😎", color: "from-destructive/20 to-destructive/5" },
  ];

  return (
    <div className="space-y-3">
      {games.map((game) => (
        <motion.button
          key={game.id}
          whileTap={{ scale: 0.97 }}
          onClick={() => onSelect(game.id)}
          className={`w-full p-4 rounded-2xl bg-gradient-to-br ${game.color} border border-border flex items-center gap-4 text-left transition-colors hover:border-accent/50`}
        >
          <span className="text-4xl">{game.icon}</span>
          <div className="flex-1">
            <h3 className="font-bold text-foreground">{game.title}</h3>
            <p className="text-sm text-muted-foreground">{game.desc}</p>
          </div>
          <ArrowRight className="w-5 h-5 text-muted-foreground" />
        </motion.button>
      ))}
    </div>
  );
};

const QuizGame = ({ onBack }: { onBack: () => void }) => {
  const [questionIndex, setQuestionIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);

  const shuffledQuestions = useState(() => [...QUIZ_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5))[0];
  const current = shuffledQuestions[questionIndex];

  const handleAnswer = (idx: number) => {
    if (selected !== null) return;
    setSelected(idx);
    if (idx === current.answer) setScore((s) => s + 1);
    setTimeout(() => {
      if (questionIndex < shuffledQuestions.length - 1) {
        setQuestionIndex((i) => i + 1);
        setSelected(null);
      } else {
        setFinished(true);
      }
    }, 1200);
  };

  if (finished) {
    return (
      <div className="text-center space-y-4 py-8">
        <Trophy className="w-16 h-16 text-accent mx-auto" />
        <h3 className="text-2xl font-black text-foreground">{score}/{shuffledQuestions.length}</h3>
        <p className="text-muted-foreground">
          {score === shuffledQuestions.length ? "Parfait ! Tu es un vrai expert ! 🏆" : score >= 3 ? "Bien joué ! 👏" : "Continue à t'entraîner ! 💪"}
        </p>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={onBack}><RotateCcw className="w-4 h-4 mr-1" /> Menu</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Retour</Button>
        <span className="text-sm text-muted-foreground font-medium">{questionIndex + 1}/{shuffledQuestions.length}</span>
        <span className="text-sm font-bold text-accent">Score: {score}</span>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5">
        <p className="font-bold text-foreground text-lg mb-4">{current.question}</p>
        <div className="space-y-2">
          {current.options.map((opt, idx) => {
            let cls = "w-full p-3 rounded-xl text-left font-medium transition-all border ";
            if (selected === null) {
              cls += "border-border bg-background hover:border-accent text-foreground";
            } else if (idx === current.answer) {
              cls += "border-green-500 bg-green-500/10 text-green-400";
            } else if (idx === selected) {
              cls += "border-destructive bg-destructive/10 text-destructive";
            } else {
              cls += "border-border bg-background text-muted-foreground opacity-50";
            }
            return (
              <motion.button key={idx} whileTap={{ scale: 0.98 }} onClick={() => handleAnswer(idx)} className={cls}>
                <span className="flex items-center gap-2">
                  {selected !== null && idx === current.answer && <CheckCircle className="w-4 h-4" />}
                  {selected !== null && idx === selected && idx !== current.answer && <XCircle className="w-4 h-4" />}
                  {opt}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const GuessPlayerGame = ({ onBack }: { onBack: () => void }) => {
  const [playerIndex, setPlayerIndex] = useState(0);
  const [revealedClues, setRevealedClues] = useState(1);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);

  const current = GUESS_PLAYERS[playerIndex];

  const handleGuess = () => {
    if (guess.trim().toLowerCase().includes(current.answer.toLowerCase())) {
      setResult("correct");
      setScore((s) => s + Math.max(1, 5 - revealedClues));
    } else {
      setResult("wrong");
    }
  };

  const nextPlayer = () => {
    if (playerIndex < GUESS_PLAYERS.length - 1) {
      setPlayerIndex((i) => i + 1);
      setRevealedClues(1);
      setGuess("");
      setResult(null);
    } else {
      setPlayerIndex(0);
      setRevealedClues(1);
      setGuess("");
      setResult(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Retour</Button>
        <span className="text-sm font-bold text-accent">Score: {score}</span>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h3 className="font-bold text-foreground text-center">🕵️ Devine le joueur</h3>
        <div className="space-y-2">
          {current.clues.slice(0, revealedClues).map((clue, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-accent/10 border border-accent/20 rounded-xl p-3 text-sm text-foreground text-center">
              💡 {clue}
            </motion.div>
          ))}
        </div>
        {result === null && revealedClues < current.clues.length && (
          <Button variant="outline" size="sm" className="w-full" onClick={() => setRevealedClues((c) => c + 1)}>
            Révéler un indice ({current.clues.length - revealedClues} restants)
          </Button>
        )}
        {result === null ? (
          <div className="flex gap-2">
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Nom du joueur..."
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
              onKeyDown={(e) => e.key === "Enter" && handleGuess()}
            />
            <Button onClick={handleGuess} disabled={!guess.trim()}>Valider</Button>
          </div>
        ) : (
          <div className="text-center space-y-2">
            {result === "correct" ? (
              <p className="text-green-400 font-bold">✅ Correct ! C'est {current.answer} !</p>
            ) : (
              <p className="text-destructive font-bold">❌ C'était {current.answer}</p>
            )}
            <Button onClick={nextPlayer} size="sm">Joueur suivant →</Button>
          </div>
        )}
      </div>
    </div>
  );
};

const EmojiGame = ({ onBack }: { onBack: () => void }) => {
  const [playerIndex, setPlayerIndex] = useState(0);
  const [hintIndex, setHintIndex] = useState(0);
  const [guess, setGuess] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);

  const current = EMOJI_PLAYERS[playerIndex];

  const handleGuess = () => {
    if (guess.trim().toLowerCase().includes(current.answer.toLowerCase())) {
      setResult("correct");
      setScore((s) => s + Math.max(1, 4 - hintIndex));
    } else {
      setResult("wrong");
    }
  };

  const nextPlayer = () => {
    if (playerIndex < EMOJI_PLAYERS.length - 1) {
      setPlayerIndex((i) => i + 1);
    } else {
      setPlayerIndex(0);
    }
    setHintIndex(0);
    setGuess("");
    setResult(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onBack}>← Retour</Button>
        <span className="text-sm font-bold text-accent">Score: {score}</span>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5 space-y-4 text-center">
        <h3 className="font-bold text-foreground">😎 Quel joueur ?</h3>
        <p className="text-5xl tracking-widest">{current.emojis}</p>
        {hintIndex > 0 && (
          <div className="flex gap-2 justify-center flex-wrap">
            {current.hints.slice(0, hintIndex).map((h, i) => (
              <span key={i} className="bg-accent/10 text-accent text-xs px-3 py-1 rounded-full border border-accent/20">{h}</span>
            ))}
          </div>
        )}
        {result === null && hintIndex < current.hints.length && (
          <Button variant="outline" size="sm" onClick={() => setHintIndex((h) => h + 1)}>
            Indice ({current.hints.length - hintIndex} restants)
          </Button>
        )}
        {result === null ? (
          <div className="flex gap-2">
            <input
              value={guess}
              onChange={(e) => setGuess(e.target.value)}
              placeholder="Nom du joueur..."
              className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-accent"
              onKeyDown={(e) => e.key === "Enter" && handleGuess()}
            />
            <Button onClick={handleGuess} disabled={!guess.trim()}>Valider</Button>
          </div>
        ) : (
          <div className="space-y-2">
            {result === "correct" ? (
              <p className="text-green-400 font-bold">✅ Bravo ! C'est {current.answer} !</p>
            ) : (
              <p className="text-destructive font-bold">❌ C'était {current.answer}</p>
            )}
            <Button onClick={nextPlayer} size="sm">Suivant →</Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GamesTab;
