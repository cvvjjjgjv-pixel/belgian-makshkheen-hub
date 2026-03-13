import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  Tv, MessageCircle, Newspaper, Users, Gamepad2, Radio,
  Star, Shield, Bell, Trophy, ChevronRight, ChevronLeft,
  Smartphone, Zap, Globe, Heart, Play, ArrowRight
} from "lucide-react";
import logo from "@/assets/logo.png";

const features = [
  {
    icon: Tv,
    title: "📺 TV en Direct",
    desc: "Plus de 70 chaînes gratuites : tunisiennes, sport IPTV, infos internationales. Lecteur HLS intégré, détection en ligne automatique, favoris persistants.",
    color: "from-red-600 to-red-900",
  },
  {
    icon: Radio,
    title: "🔴 Live Streaming",
    desc: "Lancez ou rejoignez des lives communautaires. Chat en temps réel pendant les matchs avec réactions instantanées.",
    color: "from-pink-600 to-rose-900",
  },
  {
    icon: Newspaper,
    title: "📰 Actualités",
    desc: "Fil d'actualités sportives agrégé en temps réel depuis les meilleures sources. Restez informé minute par minute.",
    color: "from-blue-600 to-indigo-900",
  },
  {
    icon: Users,
    title: "💬 Forum",
    desc: "Discussions thématiques, sujets épinglés, système de réponses. Débattez avec la communauté sur tous les sujets.",
    color: "from-emerald-600 to-green-900",
  },
  {
    icon: MessageCircle,
    title: "🗨️ Chat",
    desc: "Messagerie communautaire en temps réel avec emojis, GIFs, partage de médias. Connectez-vous avec les supporters.",
    color: "from-violet-600 to-purple-900",
  },
  {
    icon: Gamepad2,
    title: "🎮 Mini-Jeux",
    desc: "Quiz football, Chkobba, Rami, devinettes. Classement compétitif avec système de points et leaderboard.",
    color: "from-amber-600 to-orange-900",
  },
];

const stats = [
  { value: "70+", label: "Chaînes TV" },
  { value: "6", label: "Mini-Jeux" },
  { value: "∞", label: "Passion" },
  { value: "24/7", label: "Disponible" },
];

const Presentation = () => {
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    // Slide 0 - Hero
    <div key="hero" className="flex flex-col items-center justify-center min-h-[80vh] text-center px-6">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", duration: 1, bounce: 0.4 }}
        className="mb-6"
      >
        <div className="w-28 h-28 rounded-full border-4 border-accent overflow-hidden shadow-[0_0_40px_hsl(51_100%_50%/0.3)]">
          <img src={logo} alt="Mkachkhines" className="w-full h-full object-cover" />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="font-arabic text-4xl md:text-5xl font-black text-accent mb-2"
      >
        مكشخين بلجيكا
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-xl md:text-2xl font-bold text-foreground mb-2"
      >
        Makshkheen Belgium
      </motion.p>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-muted-foreground text-base max-w-md mb-8"
      >
        La super-app des supporters tunisiens en Belgique.
        TV, Chat, Forum, Jeux, Actualités — tout en un.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.9 }}
        className="flex gap-4"
      >
        <button
          onClick={() => navigate("/")}
          className="px-6 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm flex items-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-accent/20"
        >
          <Play className="w-4 h-4" /> Lancer l'App
        </button>
        <button
          onClick={() => setCurrentSlide(1)}
          className="px-6 py-3 rounded-xl border-2 border-accent/30 text-accent font-bold text-sm flex items-center gap-2 hover:bg-accent/10 transition-colors"
        >
          Découvrir <ArrowRight className="w-4 h-4" />
        </button>
      </motion.div>
    </div>,

    // Slide 1 - Stats
    <div key="stats" className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl md:text-3xl font-bold text-foreground mb-2 text-center"
      >
        Une App, <span className="text-accent">Tout Dedans</span>
      </motion.h2>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-muted-foreground text-center mb-10 max-w-md"
      >
        Conçue pour les supporters passionnés qui veulent tout au même endroit.
      </motion.p>

      <div className="grid grid-cols-2 gap-4 mb-10 w-full max-w-sm">
        {stats.map((s, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 + i * 0.1 }}
            className="bg-card border border-border rounded-2xl p-5 text-center"
          >
            <div className="text-3xl font-black text-accent mb-1">{s.value}</div>
            <div className="text-xs text-muted-foreground font-medium">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="flex flex-wrap gap-2 justify-center"
      >
        {["🇹🇳 Tunisie", "🇧🇪 Belgique", "⚽ Football", "📱 Mobile-First"].map((tag, i) => (
          <span key={i} className="px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-xs font-semibold text-primary-foreground">
            {tag}
          </span>
        ))}
      </motion.div>
    </div>,

    // Slide 2 - Features Grid
    <div key="features" className="flex flex-col items-center justify-start min-h-[80vh] px-4 pt-8">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl md:text-3xl font-bold text-foreground mb-6 text-center"
      >
        Fonctionnalités <span className="text-accent">Premium</span>
      </motion.h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-lg">
        {features.map((f, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 * i }}
            className="bg-card border border-border rounded-2xl p-4 hover:border-accent/40 transition-colors group"
          >
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${f.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
              <f.icon className="w-5 h-5 text-foreground" />
            </div>
            <h3 className="font-bold text-sm text-foreground mb-1">{f.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </div>,

    // Slide 3 - Extras
    <div key="extras" className="flex flex-col items-center justify-center min-h-[80vh] px-6">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl md:text-3xl font-bold text-foreground mb-8 text-center"
      >
        Et aussi... <span className="text-accent">✨</span>
      </motion.h2>

      <div className="space-y-3 w-full max-w-md">
        {[
          { icon: Star, text: "Stories éphémères avec réactions" },
          { icon: Trophy, text: "Classement & badges de la communauté" },
          { icon: Bell, text: "Notifications en temps réel" },
          { icon: Shield, text: "Panneau admin avec gestion des rôles" },
          { icon: Globe, text: "Météo locale intégrée" },
          { icon: Zap, text: "Prédictions magiques IA pour les matchs" },
          { icon: Heart, text: "Système de likes, favoris et commentaires" },
          { icon: Smartphone, text: "PWA installable sur mobile" },
        ].map((item, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 * i }}
            className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3 hover:border-accent/40 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
              <item.icon className="w-4 h-4 text-accent" />
            </div>
            <span className="text-sm font-medium text-foreground">{item.text}</span>
          </motion.div>
        ))}
      </div>
    </div>,

    // Slide 4 - CTA
    <div key="cta" className="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", bounce: 0.5 }}
        className="text-7xl mb-6"
      >
        🇹🇳⚽🇧🇪
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-3xl md:text-4xl font-black text-foreground mb-4"
      >
        Rejoignez les <span className="text-accent">Makshkheen</span>
      </motion.h2>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="text-muted-foreground max-w-md mb-8"
      >
        L'application communautaire #1 des supporters tunisiens en Belgique.
        Gratuite, sans pub, faite avec ❤️
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="flex flex-col gap-3 w-full max-w-xs"
      >
        <button
          onClick={() => navigate("/")}
          className="w-full px-6 py-4 rounded-xl bg-accent text-accent-foreground font-bold text-base flex items-center justify-center gap-2 hover:scale-105 transition-transform shadow-lg shadow-accent/20"
        >
          <Play className="w-5 h-5" /> Accéder à l'App
        </button>
        <button
          onClick={() => navigate("/install")}
          className="w-full px-6 py-3 rounded-xl border-2 border-border text-foreground font-semibold text-sm flex items-center justify-center gap-2 hover:bg-card transition-colors"
        >
          <Smartphone className="w-4 h-4" /> Installer sur Mobile
        </button>
      </motion.div>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="text-xs text-muted-foreground mt-8"
      >
        Propulsé par Roshane Tech 🚀
      </motion.p>
    </div>,
  ];

  const totalSlides = slides.length;

  return (
    <div className="min-h-screen bg-background max-w-lg mx-auto relative overflow-hidden">
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 z-50 max-w-lg mx-auto">
        <div className="flex gap-1 px-4 pt-3">
          {Array.from({ length: totalSlides }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className="flex-1 h-1 rounded-full transition-all duration-300"
              style={{
                background: i <= currentSlide
                  ? "hsl(var(--accent))"
                  : "hsl(var(--border))",
              }}
            />
          ))}
        </div>
      </div>

      {/* Slide content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentSlide}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          transition={{ duration: 0.3 }}
        >
          {slides[currentSlide]}
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="fixed bottom-6 left-0 right-0 flex justify-center gap-4 max-w-lg mx-auto px-6">
        {currentSlide > 0 && (
          <button
            onClick={() => setCurrentSlide((s) => s - 1)}
            className="p-3 rounded-full bg-card border border-border text-foreground hover:bg-secondary transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
        {currentSlide < totalSlides - 1 && (
          <button
            onClick={() => setCurrentSlide((s) => s + 1)}
            className="p-3 rounded-full bg-accent text-accent-foreground hover:scale-110 transition-transform"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        )}
      </div>
    </div>
  );
};

export default Presentation;
