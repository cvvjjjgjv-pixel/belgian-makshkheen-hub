import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Users, FileText, MessageSquare, Image, Shield, Crown, Trash2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";

type ManagedUser = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  created_at: string;
  role: string;
};

type Stats = { users: number; posts: number; comments: number; stories: number };

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"stats" | "users">("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      navigate("/");
      toast.error("Accès refusé");
    }
  }, [roleLoading, isAdmin, navigate]);

  const callAdmin = async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("admin-manage-role", {
      body,
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  };

  const fetchStats = async () => {
    try {
      const data = await callAdmin({ action: "get_stats" });
      setStats(data);
    } catch { toast.error("Erreur chargement stats"); }
  };

  const fetchUsers = async () => {
    try {
      const data = await callAdmin({ action: "get_users" });
      setUsers(data.users || []);
    } catch { toast.error("Erreur chargement utilisateurs"); }
  };

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([fetchStats(), fetchUsers()]).finally(() => setLoading(false));
  }, [isAdmin]);

  const changeRole = async (targetId: string, newRole: string) => {
    try {
      await callAdmin({ action: "change_role", target_user_id: targetId, new_role: newRole });
      toast.success("Rôle mis à jour !");
      setUsers((prev) => prev.map((u) => u.user_id === targetId ? { ...u, role: newRole } : u));
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    }
  };

  const deleteContent = async (targetId: string, name: string) => {
    if (!confirm(`Supprimer tout le contenu de ${name} ?`)) return;
    try {
      await callAdmin({ action: "delete_user_content", target_user_id: targetId });
      toast.success(`Contenu de ${name} supprimé`);
    } catch { toast.error("Erreur"); }
  };

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent">
        <Crown className="w-3 h-3" /> Super Admin
      </span>
    );
    if (role === "admin") return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
        <Shield className="w-3 h-3" /> Admin
      </span>
    );
    return <span className="text-[10px] text-muted-foreground">Utilisateur</span>;
  };

  if (roleLoading || loading) {
    return <div className="p-8 text-center text-muted-foreground">Chargement...</div>;
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="p-4 flex items-center gap-3 border-b border-border bg-card">
        <button onClick={() => navigate("/")}><ArrowLeft className="w-5 h-5 text-foreground" /></button>
        <Shield className="w-5 h-5 text-accent" />
        <h1 className="text-lg font-bold text-foreground">Panel d'Administration</h1>
        <button onClick={() => { fetchStats(); fetchUsers(); }} className="ml-auto text-muted-foreground">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-4">
        {(["stats", "users"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
              tab === t ? "bg-accent text-accent-foreground" : "bg-card border border-border text-muted-foreground"
            }`}
          >
            {t === "stats" ? "📊 Statistiques" : "👥 Utilisateurs"}
          </button>
        ))}
      </div>

      {tab === "stats" && stats && (
        <div className="px-4 grid grid-cols-2 gap-3">
          {[
            { icon: Users, label: "Utilisateurs", value: stats.users, color: "text-accent" },
            { icon: FileText, label: "Posts", value: stats.posts, color: "text-accent" },
            { icon: MessageSquare, label: "Commentaires", value: stats.comments, color: "text-accent" },
            { icon: Image, label: "Stories", value: stats.stories, color: "text-accent" },
          ].map((s, i) => (
            <div key={i} className="p-4 rounded-2xl bg-card border border-border text-center">
              <s.icon className={`w-6 h-6 mx-auto mb-2 ${s.color}`} />
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {tab === "users" && (
        <div className="px-4 space-y-2">
          {users.map((u) => (
            <div key={u.user_id} className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border">
              <img
                src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.display_name}&background=random`}
                alt=""
                className="w-10 h-10 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{u.display_name}</p>
                {getRoleBadge(u.role)}
              </div>

              {/* Role actions - only super_admin can change roles */}
              {isSuperAdmin && u.user_id !== user?.id && (
                <select
                  value={u.role}
                  onChange={(e) => changeRole(u.user_id, e.target.value)}
                  className="text-xs bg-secondary border border-border rounded-lg px-2 py-1 text-foreground"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              )}

              {/* Delete content */}
              {u.user_id !== user?.id && (
                <button
                  onClick={() => deleteContent(u.user_id, u.display_name)}
                  className="p-2 rounded-full hover:bg-destructive/10 text-destructive"
                  title="Supprimer tout le contenu"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Admin;