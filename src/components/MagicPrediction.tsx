import { useState } from "react";
import { Send, RotateCcw, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

const MagicPrediction = () => {
  const [question, setQuestion] = useState("");
  const [prediction, setPrediction] = useState("");
  const [loading, setLoading] = useState(false);
  const [asked, setAsked] = useState(false);

  const quickQuestions = [
    { emoji: "💕", label: "Amour" },
    { emoji: "💰", label: "Argent" },
    { emoji: "🍀", label: "Chance" },
    { emoji: "⚽", label: "Match" },
    { emoji: "✈️", label: "Voyage" },
    { emoji: "🌟", label: "Destin" },
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

  // Floating particles for the magic ball
  const particles = Array.from({ length: 12 }, (_, i) => i);

  return (
    <div className="mx-4 mt-4 rounded-2xl overflow-hidden relative">
      {/* Animated gradient border */}
      <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-600/40 via-indigo-500/40 to-violet-600/40 blur-[1px]" />
      
      <div className="relative rounded-2xl bg-card m-[1px] overflow-hidden">
        {/* Header */}
        <div className="relative px-4 py-3 bg-gradient-to-r from-purple-900/50 via-indigo-900/40 to-violet-900/50 border-b border-purple-500/20">
          {/* Sparkle decorations */}
          <div className="absolute top-1 right-8 w-1 h-1 bg-purple-300 rounded-full animate-pulse" />
          <div className="absolute top-3 right-16 w-0.5 h-0.5 bg-indigo-300 rounded-full animate-pulse delay-300" />
          <div className="absolute bottom-2 right-12 w-0.5 h-0.5 bg-violet-300 rounded-full animate-pulse delay-700" />
          
          <div className="flex items-center gap-2.5">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="text-2xl"
            >
              🔮
            </motion.div>
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-wide">Boule Magique</h3>
              <p className="text-[10px] text-purple-300/70">Pose ta question au destin</p>
            </div>
            <div className="ml-auto flex items-center gap-1 bg-purple-500/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-purple-400/20">
              <Star className="w-2.5 h-2.5 text-purple-300" />
              <span className="text-[9px] text-purple-300 font-semibold tracking-wider uppercase">IA</span>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-3">
          <AnimatePresence mode="wait">
            {!asked && (
              <motion.div
                key="input"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-3"
              >
                {/* Quick question chips */}
                <div className="flex flex-wrap gap-1.5">
                  {quickQuestions.map((q, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: i * 0.05 }}
                      onClick={() => { setQuestion(`${q.emoji} ${q.label}`); askMagic(`${q.emoji} ${q.label}`); }}
                      className="group text-[11px] px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-200/80 hover:bg-purple-500/20 hover:border-purple-400/40 hover:text-purple-100 transition-all duration-200"
                    >
                      <span className="mr-1">{q.emoji}</span>
                      {q.label}
                    </motion.button>
                  ))}
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && askMagic()}
                      placeholder="Que veux-tu savoir..."
                      className="w-full px-4 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-foreground text-sm placeholder:text-purple-300/40 focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400/40 transition-all"
                    />
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.92 }}
                    onClick={() => askMagic()}
                    disabled={loading}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-bold text-sm disabled:opacity-40 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 transition-shadow"
                  >
                    <Send className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Loading - Magic Ball Animation */}
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center justify-center py-8 relative"
              >
                {/* Orbiting particles */}
                <div className="relative w-24 h-24">
                  {particles.map((i) => (
                    <motion.div
                      key={i}
                      className="absolute w-1 h-1 rounded-full"
                      style={{
                        background: i % 3 === 0 ? '#a855f7' : i % 3 === 1 ? '#818cf8' : '#c084fc',
                        top: '50%',
                        left: '50%',
                      }}
                      animate={{
                        x: [
                          Math.cos((i / 12) * Math.PI * 2) * 40,
                          Math.cos((i / 12) * Math.PI * 2 + Math.PI) * 40,
                          Math.cos((i / 12) * Math.PI * 2) * 40,
                        ],
                        y: [
                          Math.sin((i / 12) * Math.PI * 2) * 40,
                          Math.sin((i / 12) * Math.PI * 2 + Math.PI) * 40,
                          Math.sin((i / 12) * Math.PI * 2) * 40,
                        ],
                        opacity: [0.3, 1, 0.3],
                        scale: [0.5, 1.5, 0.5],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        delay: i * 0.1,
                        ease: "easeInOut",
                      }}
                    />
                  ))}
                  
                  {/* Central glowing ball */}
                  <motion.div
                    className="absolute inset-0 flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <div className="relative">
                      <div className="absolute inset-0 bg-purple-500/30 rounded-full blur-xl scale-150" />
                      <motion.span
                        className="text-5xl relative z-10 block"
                        animate={{ rotateY: [0, 360] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                      >
                        🔮
                      </motion.span>
                    </div>
                  </motion.div>
                </div>

                <motion.p
                  className="text-sm text-purple-300/80 mt-4 font-medium"
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                >
                  Les astres consultent...
                </motion.p>
              </motion.div>
            )}

            {/* Result */}
            {prediction && !loading && (
              <motion.div
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, type: "spring", bounce: 0.3 }}
                className="space-y-3"
              >
                <div className="relative p-5 rounded-2xl bg-gradient-to-br from-purple-900/30 via-indigo-900/20 to-violet-900/30 border border-purple-500/20 text-center overflow-hidden">
                  {/* Glow effect behind text */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl" />
                  
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring" }}
                    className="text-3xl mb-3"
                  >
                    🔮
                  </motion.div>
                  
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="text-base font-medium text-foreground leading-relaxed relative z-10"
                  >
                    {prediction}
                  </motion.p>

                  {/* Decorative stars */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex justify-center gap-1 mt-3"
                  >
                    {[...Array(5)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ scale: 0, rotate: -180 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: 0.6 + i * 0.1, type: "spring" }}
                      >
                        <Star className="w-3 h-3 text-purple-400/50 fill-purple-400/30" />
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                <motion.button
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={reset}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-xs text-purple-300/80 hover:bg-purple-500/20 hover:text-purple-200 transition-all font-medium"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Poser une autre question
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default MagicPrediction;
