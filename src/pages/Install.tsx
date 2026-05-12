import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Share, ArrowLeft, Smartphone, Check } from "lucide-react";

const Install = () => {
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installed, setInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent));
    setIsStandalone(window.matchMedia("(display-mode: standalone)").matches);

    const handler = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    window.addEventListener("appinstalled", () => setInstalled(true));

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") setInstalled(true);
    setDeferredPrompt(null);
  };

  if (isStandalone) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center mx-auto">
            <Check className="w-8 h-8 text-accent" />
          </div>
          <h1 className="text-xl font-bold text-foreground">App déjà installée !</h1>
          <p className="text-sm text-muted-foreground">Tu utilises déjà l'application en mode standalone.</p>
          <button onClick={() => navigate("/")} className="px-6 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm">
            Retour à l'accueil
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-8">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <Smartphone className="w-5 h-5 text-accent" />
        <h1 className="text-lg font-bold text-foreground">Installer l'app</h1>
      </div>

      <div className="p-6 space-y-6">
        <div className="text-center space-y-3">
          <img src="/pwa-icon-512.png" alt="App icon" className="w-24 h-24 mx-auto rounded-2xl" />
          <h2 className="text-xl font-bold text-foreground">Fans in Belgium</h2>
          <p className="text-sm text-muted-foreground">Installe l'app sur ton téléphone pour y accéder rapidement !</p>
        </div>

        {installed ? (
          <div className="p-4 rounded-2xl bg-accent/10 border border-accent/30 text-center">
            <Check className="w-8 h-8 text-accent mx-auto mb-2" />
            <p className="text-sm font-bold text-foreground">App installée avec succès !</p>
          </div>
        ) : deferredPrompt ? (
          <button
            onClick={handleInstall}
            className="w-full py-4 rounded-2xl bg-accent text-accent-foreground font-bold text-base flex items-center justify-center gap-2"
          >
            <Download className="w-5 h-5" /> Installer maintenant
          </button>
        ) : isIOS ? (
          <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
            <p className="text-sm font-bold text-foreground">Sur iPhone/iPad :</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">1</span> Appuie sur <Share className="w-4 h-4 inline text-accent" /> en bas de Safari</p>
              <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">2</span> Choisis "Sur l'écran d'accueil"</p>
              <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">3</span> Appuie "Ajouter"</p>
            </div>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-card border border-border space-y-3">
            <p className="text-sm font-bold text-foreground">Sur Android :</p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">1</span> Ouvre le menu ⋮ de Chrome</p>
              <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">2</span> Choisis "Installer l'application"</p>
              <p className="flex items-center gap-2"><span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold">3</span> Confirme l'installation</p>
            </div>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-xs text-muted-foreground text-center">✅ Fonctionne hors-ligne</p>
          <p className="text-xs text-muted-foreground text-center">✅ Notifications push</p>
          <p className="text-xs text-muted-foreground text-center">✅ Comme une vraie app native</p>
        </div>
      </div>
    </div>
  );
};

export default Install;