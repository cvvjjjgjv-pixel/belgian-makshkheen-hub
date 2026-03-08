import { useState, useEffect } from "react";
import { Settings, ChevronRight, Trophy, Heart, MessageSquare, Star, LogOut, Edit3, X, Check, Shield, Crown, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import UserPostsManager from "./UserPostsManager";
import CreatePostForm from "./CreatePostForm";
import FavoritesView from "./profile/FavoritesView";
import RankingView from "./profile/RankingView";
import MyCommentsView from "./profile/MyCommentsView";
import BadgesView from "./profile/BadgesView";
import SettingsView from "./profile/SettingsView";

type SubView = null | "favorites" | "ranking" | "comments" | "badges" | "settings";

const ProfileTab = () => {
  const { user, signOut } = useAuth();
  const { profile, loading, updateProfile } = useProfile();
  const { roles, isAdmin, isSuperAdmin } = useUserRole();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [postRefreshKey, setPostRefreshKey] = useState(0);
  const [editName, setEditName] = useState("");
  const [editBio, setEditBio] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [subView, setSubView] = useState<SubView>(null);
  const [favCount, setFavCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [badgeCount, setBadgeCount] = useState(0);
  const [userRank, setUserRank] = useState("-");
  const [uploading, setUploading] = useState(false);
  const [postCount, setPostCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);

  // Fetch counts
  useEffect(() => {
    if (!user) return;

    const fetchCounts = async () => {
      const [{ count: favs }, { count: comments }, { count: badges }, { count: posts }, { count: followers }, { count: following }] = await Promise.all([
        supabase.from("favorites").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("comments").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("user_badges").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("posts").select("*", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("followers").select("*", { count: "exact", head: true }).eq("following_id", user.id),
        supabase.from("followers").select("*", { count: "exact", head: true }).eq("follower_id", user.id),
      ]);
      setFavCount(favs || 0);
      setCommentCount(comments || 0);
      setBadgeCount(badges || 0);
      setPostCount(posts || 0);
      setFollowerCount(followers || 0);
      setFollowingCount(following || 0);

      // Calculate rank
      const { data: allPosts } = await supabase.from("posts").select("user_id, likes_count");
      if (allPosts) {
        const userScores = new Map<string, number>();
        allPosts.forEach((p: any) => {
          userScores.set(p.user_id, (userScores.get(p.user_id) || 0) + 10 + (p.likes_count || 0) * 5);
        });
        const sorted = [...userScores.entries()].sort((a, b) => b[1] - a[1]);
        const rank = sorted.findIndex(([uid]) => uid === user.id);
        setUserRank(rank >= 0 ? `#${rank + 1}` : "-");
      }
    };

    fetchCounts();
  }, [user, subView, postRefreshKey]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 5 Mo");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/avatar.${ext}`;

      // Delete old avatar if exists
      await supabase.storage.from("avatars").remove([path]);

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      // Add cache buster
      const avatarUrl = `${publicUrl}?t=${Date.now()}`;
      await updateProfile({ avatar_url: avatarUrl });
      toast.success("Photo de profil mise à jour !");
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground mb-4">Connecte-toi pour voir ton profil</p>
        <button onClick={() => navigate("/auth")} className="px-6 py-3 rounded-xl bg-accent text-accent-foreground font-bold text-sm">
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

  // Sub-views
  if (subView === "favorites") return <FavoritesView onBack={() => setSubView(null)} />;
  if (subView === "ranking") return <RankingView onBack={() => setSubView(null)} />;
  if (subView === "comments") return <MyCommentsView onBack={() => setSubView(null)} />;
  if (subView === "badges") return <BadgesView onBack={() => setSubView(null)} />;
  if (subView === "settings") return <SettingsView onBack={() => setSubView(null)} />;

  const startEdit = () => {
    setEditName(profile?.display_name || "");
    setEditBio(profile?.bio || "");
    setEditLocation(profile?.location || "");
    setEditing(true);
  };

  const saveEdit = async () => {
    const error = await updateProfile({ display_name: editName, bio: editBio, location: editLocation });
    if (error) { toast.error("Erreur lors de la mise à jour"); }
    else { toast.success("Profil mis à jour!"); setEditing(false); }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
    toast.success("Déconnecté!");
  };

  const memberSince = profile?.created_at ? new Date(profile.created_at).getFullYear() : new Date().getFullYear();
  const avatarUrl = profile?.avatar_url || "";
  const hasAvatar = avatarUrl && avatarUrl.length > 5;

  const menuItems = [
    { icon: Heart, label: "Mes favoris", count: String(favCount), view: "favorites" as SubView },
    { icon: Trophy, label: "Classement", count: userRank, view: "ranking" as SubView },
    { icon: MessageSquare, label: "Mes commentaires", count: String(commentCount), view: "comments" as SubView },
    { icon: Star, label: "Badges", count: String(badgeCount), view: "badges" as SubView },
    { icon: Settings, label: "Paramètres", count: undefined, view: "settings" as SubView },
  ];

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
            <button onClick={() => setEditing(false)} className="text-muted-foreground"><X className="w-5 h-5" /></button>
            <button onClick={saveEdit} className="text-accent"><Check className="w-5 h-5" /></button>
          </div>
        )}

        {/* Avatar with upload */}
        <div className="relative w-24 h-24 mx-auto mb-3">
          <div className="w-24 h-24 rounded-full story-ring-gradient p-[3px]">
            {hasAvatar ? (
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover border-2 border-background"
              />
            ) : (
              <div className="w-full h-full rounded-full bg-secondary flex items-center justify-center border-2 border-background text-2xl font-bold text-accent">
                {(profile?.display_name || "?")[0].toUpperCase()}
              </div>
            )}
          </div>
          <label className={`absolute bottom-0 right-0 w-8 h-8 rounded-full bg-accent flex items-center justify-center cursor-pointer shadow-lg border-2 border-background ${uploading ? "opacity-50 pointer-events-none" : ""}`}>
            <Camera className="w-4 h-4 text-accent-foreground" />
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarUpload}
              disabled={uploading}
            />
          </label>
        </div>

        {editing ? (
          <div className="space-y-2 max-w-xs mx-auto">
            <input value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Nom d'affichage" />
            <input value={editBio} onChange={(e) => setEditBio(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Bio" />
            <input value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-secondary border border-border text-foreground text-sm text-center focus:outline-none focus:ring-2 focus:ring-accent" placeholder="Localisation" />
          </div>
        ) : (
          <>
            <h2 className="text-lg font-bold text-foreground flex items-center justify-center gap-2">
              {profile?.display_name || "Utilisateur"}
              {isSuperAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent uppercase">
                  <Crown className="w-3 h-3" /> Super Admin
                </span>
              )}
              {isAdmin && !isSuperAdmin && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary uppercase">
                  <Shield className="w-3 h-3" /> Admin
                </span>
              )}
            </h2>
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

      {/* Create Post inline */}
      {showCreatePost && (
        <div className="px-4 mb-2">
          <CreatePostForm onPostCreated={() => { setPostRefreshKey((k) => k + 1); setShowCreatePost(false); }} />
        </div>
      )}

      {/* User Posts Manager */}
      <UserPostsManager onCreatePost={() => setShowCreatePost(!showCreatePost)} />

      {/* Email */}
      <div className="px-4 mt-4 mb-2">
        <p className="text-xs text-muted-foreground text-center">{user.email}</p>
      </div>

      {/* Menu */}
      <div className="px-4 space-y-2">
        {menuItems.map((item, i) => (
          <button
            key={i}
            onClick={() => setSubView(item.view)}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:bg-secondary transition-colors"
          >
            <item.icon className="w-5 h-5 text-accent" />
            <span className="flex-1 text-left text-sm font-medium text-foreground">{item.label}</span>
            {item.count !== undefined && <span className="text-xs text-muted-foreground">{item.count}</span>}
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