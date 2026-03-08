import { useState } from "react";
import { Sparkles, Send, Loader2, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const MagicPrediction = () => {
  const [question, setQuestion] = useState("");
  const [prediction, setPrediction] = useState("");
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState(false);

  const quickQuestions = [
    "💕 Comment sera ma vie amoureuse ?",
    "💰 Vais-je devenir riche ?",
    "🍀 Qu'est-ce qui m'attend cette semaine ?",
    "✈️ Quel voyage m'attend bientôt ?",
    "⚽ Mon équipe va gagner ?",
    "🌟 Quel est mon destin ?",
  ];

  const askMagic = async (q?: string) => {
    const finalQuestion = q || question;
    if (!finalQuestion.trim()) {
      toast.error("Pose une question à la boule magique !");
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
    } catch (err: any) {
      toast.error("Les forces mystiques sont perturbées...");
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
      {/* Header */}
      <div className="p-4 bg-gradient-to-r from-purple-900/30 to-accent/20 border-b border-border flex items-center gap-2">
        <Sparkles className="w-5 h-5 text-accent" />
        <h3 className="text-sm font-bold text-foreground">🔮 Boule Magique</h3>
        <span className="text-[10px] text-muted-foreground ml-auto">Prédictions IA</span>
      </div>

      <div className="p-4 space-y-3">
        {/* Quick questions */}
        {!asked && (
          <div className="flex flex-wrap gap-2">
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
        )}

        {/* Input */}
        {!asked && (
          <div className="flex gap-2">
            <input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && askMagic()}
              placeholder="Pose ta question au destin..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/50"
            />
            <button
              onClick={() => askMagic()}
              disabled={loading}
              className="px-4 py-2.5 rounded-xl bg-accent text-accent-foreground font-bold text-sm disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Loading animation */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center py-6"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Sparkles className="w-10 h-10 text-accent" />
              </motion.div>
              <p className="text-sm text-muted-foreground mt-3 animate-pulse">
                Consultation des étoiles...
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Prediction result */}
        <AnimatePresence>
          {prediction && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-3"
            >
              <div className="p-4 rounded-xl bg-gradient-to-br from-purple-900/20 to-accent/10 border border-accent/30">
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {prediction}
                </p>
              </div>
              <button
                onClick={reset}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-secondary border border-border text-sm text-muted-foreground hover:text-accent transition-colors"
              >
                <RotateCcw className="w-4 h-4" /> Poser une autre question
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default MagicPrediction;