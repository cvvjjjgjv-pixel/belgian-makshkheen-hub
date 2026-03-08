import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Settings, Bell, Moon, Globe, Save, LogOut } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

const SettingsView = ({ onBack }: { onBack: () => void }) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [language, setLanguage] = useState("fr");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      if (!user) return;

      const { data } = await supabase
        .from("user_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setNotifications(data.notifications_enabled);
        setDarkMode(data.dark_mode);
        setLanguage(data.language);
      }
      // Apply theme on load
      applyTheme(data?.dark_mode ?? true);
      setLoading(false);
    };

    fetchSettings();
  }, [user]);

  const applyTheme = (isDark: boolean) => {
    if (isDark) {
      document.documentElement.classList.remove("light-mode");
    } else {
      document.documentElement.classList.add("light-mode");
    }
  };

  const handleDarkModeChange = (value: boolean) => {
    setDarkMode(value);
    applyTheme(value);
  };

  const saveSettings = async () => {
    if (!user) return;
    setSaving(true);

    const { data: existing } = await supabase
      .from("user_settings")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("user_settings")
        .update({
          notifications_enabled: notifications,
          dark_mode: darkMode,
          language,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);
    } else {
      await supabase.from("user_settings").insert({
        user_id: user.id,
        notifications_enabled: notifications,
        dark_mode: darkMode,
        language,
      });
    }

    setSaving(false);
    toast.success("Paramètres sauvegardés !");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Déconnexion réussie");
  };

  if (loading) {
    return (
      <div className="pb-4">
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <button onClick={onBack}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
          <h2 className="text-lg font-bold text-foreground">Paramètres</h2>
        </div>
        <div className="p-8 text-center text-muted-foreground text-sm">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="pb-4">
      <div className="p-4 flex items-center gap-3 border-b border-border">
        <button onClick={onBack}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <Settings className="w-5 h-5 text-accent" />
        <h2 className="text-lg font-bold text-foreground">Paramètres</h2>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {/* Notifications */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm font-medium text-foreground">Notifications</p>
              <p className="text-[10px] text-muted-foreground">Recevoir les notifications</p>
            </div>
          </div>
          <Switch checked={notifications} onCheckedChange={setNotifications} />
        </div>

        {/* Dark Mode */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <Moon className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm font-medium text-foreground">Mode sombre</p>
              <p className="text-[10px] text-muted-foreground">Apparence de l'application</p>
            </div>
          </div>
          <Switch checked={darkMode} onCheckedChange={handleDarkModeChange} />
        </div>

        {/* Language */}
        <div className="flex items-center justify-between p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-3">
            <Globe className="w-5 h-5 text-accent" />
            <div>
              <p className="text-sm font-medium text-foreground">Langue</p>
              <p className="text-[10px] text-muted-foreground">Langue de l'application</p>
            </div>
          </div>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-muted text-foreground text-xs rounded-lg px-2 py-1 border-0 focus:ring-2 focus:ring-accent"
          >
            <option value="fr">Français</option>
            <option value="ar">العربية</option>
            <option value="en">English</option>
          </select>
        </div>

        {/* Account info */}
        <div className="p-4 rounded-2xl bg-card border border-border">
          <p className="text-xs text-muted-foreground mb-1">Email du compte</p>
          <p className="text-sm font-medium text-foreground">{user?.email}</p>
        </div>

        <button
          onClick={saveSettings}
          disabled={saving}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-accent text-accent-foreground font-bold text-sm"
        >
          <Save className="w-4 h-4" />
          {saving ? "Sauvegarde..." : "Sauvegarder"}
        </button>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl bg-destructive/10 border border-destructive/30 text-destructive font-bold text-sm"
        >
          <LogOut className="w-4 h-4" />
          Se déconnecter
        </button>
      </div>
    </div>
  );
};

export default SettingsView;