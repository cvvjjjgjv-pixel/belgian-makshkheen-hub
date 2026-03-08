import { useState } from "react";
import { Sparkles, Send, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const MagicPrediction = () => {
  const [question, setQuestion] = useState("");
  const [prediction, setPrediction] = useState("");
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState(false);

  const quickQuestions = [
    "💕 Amour",
    "💰 Argent",
    "🍀 Chance",
    "⚽ Match",
    "✈️ Voyage",
    "🌟 Destin",
  ];

  const askMagic = async (q?: string) => {
    const finalQuestion = q || question;
    if (!finalQuestion.trim()) {
      toast.error("Pose une question !");
      return;
    }
    setLoading(true);
    setPrediction("");
    setAsked(true);

    try {
      const { data, error } = await supabase.functions.invoke("magic-prediction", {
        body: { question: finalQuestion },
      });

      if (error) throw error;
      if (data?.error) {
        toast.error(data.error);
        return;
      }
      setPrediction(data.prediction);
    } catch {
      toast.error("Erreur mystique... Réessaie !");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setPrediction("");
    setQuestion("");
    setAsked(false);
  };

  return (
    <div className="mx-4 mt-4 rounded-2xl bg-card border border-border overflow-hidden">
      <div className="px-4 py-3 bg-gradient-to-r from-purple-900/30 to-accent/20 border-b border-border flex items-center gap-2">
        <span className="text-lg">🎱</span>
        <h3 className="text-sm font-bold text-foreground">Boule Magique</h3>
        <span className="text-[10px] text-muted-foreground ml-auto bg-secondary/60 px-2 py-0.5 rounded-full">IA</span>
      </div>

      <div className="p-3 space-y-3">
        {!asked && (
          <>
            <div className="flex flex-wrap gap-1.5">
              {quickQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => { setQuestion(q); askMagic(q); }}
                  className="text-[11px] px-3 py-1.5 rounded-full bg-secondary border border-border text-muted-foreground hover:text-accent hover:border-accent/50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && askMagic()}
                placeholder="Pose ta question..."
                className="flex-1 px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
              />
              <button
                onClick={() => askMagic()}
                disabled={loading}
                className="px-3 py-2 rounded-xl bg-accent text-accent-foreground font-bold text-sm disabled:opacity-40"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </>
        )}

        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center justify-center gap-3 py-6"
            >
              <motion.span
                className="text-3xl"
                animate={{ scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                🎱
              </motion.span>
              <span className="text-sm text-muted-foreground animate-pulse">Consultation...</span>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {prediction && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-2"
            >
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/20 to-accent/10 border border-accent/30 text-center">
                <p className="text-base font-medium text-foreground leading-relaxed">
                  {prediction}
                </p>
              </div>
              <button
                onClick={reset}
                className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-secondary border border-border text-xs text-muted-foreground hover:text-accent transition-colors"
              >
                <RotateCcw className="w-3 h-3" /> Autre question
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MagicPrediction;
