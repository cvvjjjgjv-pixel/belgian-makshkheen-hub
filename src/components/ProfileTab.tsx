import { useState } from "react";
import { Settings, ChevronRight, Trophy, Heart, MessageSquare, Star, LogOut, Edit3, X, Check, Shield, Crown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const ProfileTab = () => {
  const { user, signOut } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  const { roles, isAdmin, isSuperAdmin } = useUserRole();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Connecte-toi pour voir ton profil</p>
        <button
          onClick={() => navigate("/auth")}
          className="px-6 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm"
        >
          Se connecter
        </button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-24 h-24 rounded-full mx-auto mb-3 skeleton-loading" />
        <div className="w-32 h-4 mx-auto skeleton-loading rounded" />
      </div>
    );
  }

  const startEdit = () => {
    setEditName(profile?.display_name || "");
    setEditBio(profile?.bio || "");
    setEditLocation(profile?.location || "");
    setEditing(true);
  };

  const saveEdit = async () => {
    const error = await updateProfile({
      display_name: editName,
      bio: editBio,
      location: editLocation,
    });
    if (error) {
      toast.error("Erreur lors de la mise à jour");
    } else {
      toast.success("Profil mis à jour!");
      setEditing(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
    toast.success("Déconnecté!");
  };

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).getFullYear()
    : new Date().getFullYear();

  return (
    <div className="pb-4">
      {/* Profile Header */}
      <div className="p-6 text-center relative">
        {!editing ? (
          <button onClick={startEdit} className="absolute top-4 right-4 text-muted-foreground">
            <Edit3 className="w-5 h-5" />
          </button>
        ) : (
          <div className="absolute top-4 right-4 flex gap-2">
            <button onClick={() => setEditing(false)} className="text-muted-foreground">
              <X className="w-5 h-5" />
            </button>
            <button onClick={saveEdit} className="text-accent">
              <Check className="w-5 h-5" />
            </button>
          </div>
        )}

        <div className="w-24 h-24 rounded-full mx-auto mb-3 story-ring-gradient p-[3px]">
          <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center border-2 border-background text-2xl font-bold text-accent">
            {(profile?.display_name || "?")[0].toUpperCase()}
          </div>
        </div>

        {editing ? (
          <div className="space-y-2 max-w-xs mx-auto">
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Nom d'affichage"
            />
            <input
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Bio"
            />
            <input
              value={editLocation}
              onChange={(e) => setEditLocation(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="Localisation"
            />
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-foreground">{profile?.display_name || "Utilisateur"}</h2>
            {profile?.bio && <p className="text-sm text-muted-foreground">{profile.bio}</p>}
            <p className="text-xs text-muted-foreground">
              {profile?.location ? `📍 ${profile.location} · ` : ""}Membre depuis {memberSince}
            </p>
          </>
        )}

        <div className="flex justify-center gap-8 mt-4">
          <div className="text-center">
            <p className="text-lg font-bold text-accent">0</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-accent">0</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-accent">0</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>
      </div>

      {/* Email */}
      <div className="px-4 mb-2">
        <p className="text-xs text-muted-foreground text-center">{user.email}</p>
      </div>

      {/* Menu */}
      <div className="px-4 space-y-2">
        {[
          { icon: Heart, label: "Mes favoris", count: "0" },
          { icon: Trophy, label: "Classement", count: "-" },
          { icon: MessageSquare, label: "Mes commentaires", count: "0" },
          { icon: Star, label: "Badges", count: "0" },
          { icon: Settings, label: "Paramètres" },
        ].map((item, i) => (
          <button
            key={i}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:bg-secondary transition-colors"
          >
            <item.icon className="w-5 h-5 text-accent" />
            <span className="flex-1 text-left text-sm font-medium text-foreground">{item.label}</span>
            {item.count && <span className="text-xs text-muted-foreground">{item.count}</span>}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}

        {/* Logout */}
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-destructive/30 hover:bg-destructive/10 transition-colors mt-4"
        >
          <LogOut className="w-5 h-5 text-destructive" />
          <span className="flex-1 text-left text-sm font-medium text-destructive">Se déconnecter</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileTab;
