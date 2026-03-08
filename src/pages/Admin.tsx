import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Users, FileText, MessageSquare, Image, Shield, Crown, Trash2,
  RefreshCw, Radio, Tv, MessagesSquare, Pin, PinOff, StopCircle, Eye
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

type ManagedUser = { user_id: string; display_name: string; avatar_url: string | null; created_at: string; role: string };
type Stats = { users: number; posts: number; comments: number; stories: number; chat_messages: number; forum_topics: number; forum_replies: number; live_streams: number; tv_channels: number };
type AdminTab = "stats" | "users" | "posts" | "chat" | "forum" | "live" | "stories";

const Admin = () => {
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, loading: roleLoading } = useUserRole();
  const navigate = useNavigate();
  const [tab, setTab] = useState<AdminTab>("stats");
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [forumTopics, setForumTopics] = useState<any[]>([]);
  const [liveStreams, setLiveStreams] = useState<any[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roleLoading && !isAdmin) {
      console.error("Accès refusé. Roles actuels:", user?.id);
      // Temporairement enlevé pour le débogage : navigate("/");
      toast.error("Accès refusé - Vérifie tes logs (F12)");
    }
  }, [roleLoading, isAdmin, navigate, user]);

  const callAdmin = useCallback(async (body: any) => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await supabase.functions.invoke("admin-manage-role", {
      body,
      headers: { Authorization: `Bearer ${session?.access_token}` },
    });
    if (res.error) throw new Error(res.error.message);
    return res.data;
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const data = await callAdmin({ action: "get_stats" });
      setStats(data);
    } catch { toast.error("Erreur chargement stats"); }
  }, [callAdmin]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await callAdmin({ action: "get_users" });
      setUsers(data.users || []);
    } catch { toast.error("Erreur chargement utilisateurs"); }
  }, [callAdmin]);

  const fetchPosts = useCallback(async () => {
    try {
      const data = await callAdmin({ action: "get_posts" });
      setPosts(data.posts || []);
    } catch { toast.error("Erreur chargement posts"); }
  }, [callAdmin]);

  const fetchChat = useCallback(async () => {
    try {
      const data = await callAdmin({ action: "get_chat_messages" });
      setChatMessages(data.messages || []);
    } catch { toast.error("Erreur chargement chat"); }
  }, [callAdmin]);

  const fetchForum = useCallback(async () => {
    try {
      const data = await callAdmin({ action: "get_forum_topics" });
      setForumTopics(data.topics || []);
    } catch { toast.error("Erreur chargement forum"); }
  }, [callAdmin]);

  const fetchLive = useCallback(async () => {
    try {
      const data = await callAdmin({ action: "get_live_streams" });
      setLiveStreams(data.streams || []);
    } catch { toast.error("Erreur chargement lives"); }
  }, [callAdmin]);

  const fetchStories = useCallback(async () => {
    try {
      const data = await callAdmin({ action: "get_stories" });
      setStories(data.stories || []);
    } catch { toast.error("Erreur chargement stories"); }
  }, [callAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    setLoading(true);
    Promise.all([fetchStats(), fetchUsers()]).finally(() => setLoading(false));
  }, [isAdmin, fetchStats, fetchUsers]);

  // Fetch tab data on tab change
  useEffect(() => {
    if (!isAdmin) return;
    if (tab === "posts") fetchPosts();
    if (tab === "chat") fetchChat();
    if (tab === "forum") fetchForum();
    if (tab === "live") fetchLive();
    if (tab === "stories") fetchStories();
  }, [tab, isAdmin, fetchPosts, fetchChat, fetchForum, fetchLive, fetchStories]);

  const changeRole = async (targetId: string, newRole: string) => {
    try {
      await callAdmin({ action: "change_role", target_user_id: targetId, new_role: newRole });
      toast.success("Rôle mis à jour !");
      setUsers((prev) => prev.map((u) => u.user_id === targetId ? { ...u, role: newRole } : u));
    } catch (err: any) { toast.error(err.message || "Erreur"); }
  };

  const deleteContent = async (targetId: string, name: string) => {
    if (!confirm(`Supprimer tout le contenu de ${name} ?`)) return;
    try {
      await callAdmin({ action: "delete_user_content", target_user_id: targetId });
      toast.success(`Contenu de ${name} supprimé`);
    } catch { toast.error("Erreur"); }
  };

  const deletePost = async (postId: string) => {
    if (!confirm("Supprimer ce post ?")) return;
    try {
      await callAdmin({ action: "delete_post", post_id: postId });
      setPosts((prev) => prev.filter((p) => p.id !== postId));
      toast.success("Post supprimé");
    } catch { toast.error("Erreur"); }
  };

  const deleteChatMessage = async (msgId: string) => {
    try {
      await callAdmin({ action: "delete_chat_message", message_id: msgId });
      setChatMessages((prev) => prev.filter((m) => m.id !== msgId));
      toast.success("Message supprimé");
    } catch { toast.error("Erreur"); }
  };

  const clearAllChat = async () => {
    if (!confirm("⚠️ Supprimer TOUS les messages du chat ? Cette action est irréversible.")) return;
    try {
      await callAdmin({ action: "clear_all_chat" });
      setChatMessages([]);
      toast.success("Tous les messages du chat ont été supprimés");
    } catch { toast.error("Erreur"); }
  };

  const deleteForumTopic = async (topicId: string) => {
    if (!confirm("Supprimer ce topic et toutes ses réponses ?")) return;
    try {
      await callAdmin({ action: "delete_forum_topic", topic_id: topicId });
      setForumTopics((prev) => prev.filter((t) => t.id !== topicId));
      toast.success("Topic supprimé");
    } catch { toast.error("Erreur"); }
  };

  const togglePin = async (topicId: string, currentPin: boolean) => {
    try {
      await callAdmin({ action: "toggle_pin_topic", topic_id: topicId, is_pinned: !currentPin });
      setForumTopics((prev) => prev.map((t) => t.id === topicId ? { ...t, is_pinned: !currentPin } : t));
      toast.success(currentPin ? "Désépinglé" : "Épinglé !");
    } catch { toast.error("Erreur"); }
  };

  const endLiveStream = async (streamId: string) => {
    try {
      await callAdmin({ action: "end_live_stream", stream_id: streamId });
      setLiveStreams((prev) => prev.map((s) => s.id === streamId ? { ...s, is_active: false } : s));
      toast.success("Live terminé");
    } catch { toast.error("Erreur"); }
  };

  const deleteLiveStream = async (streamId: string) => {
    if (!confirm("Supprimer ce live ?")) return;
    try {
      await callAdmin({ action: "delete_live_stream", stream_id: streamId });
      setLiveStreams((prev) => prev.filter((s) => s.id !== streamId));
      toast.success("Live supprimé");
    } catch { toast.error("Erreur"); }
  };

  const deleteStory = async (storyId: string) => {
    if (!confirm("Supprimer cette story ?")) return;
    try {
      await callAdmin({ action: "delete_story", story_id: storyId });
      setStories((prev) => prev.filter((s) => s.id !== storyId));
      toast.success("Story supprimée");
    } catch { toast.error("Erreur"); }
  };

  const getRoleBadge = (role: string) => {
    if (role === "super_admin") return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-accent/20 text-accent">
        <Crown className="w-3 h-3" /> Super Admin
      </span>
    );
    if (role === "admin") return (
      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary-foreground">
        <Shield className="w-3 h-3" /> Admin
      </span>
    );
    return <span className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full">Utilisateur</span>;
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
  };

  const tabs: { id: AdminTab; icon: typeof Users; label: string; count?: number }[] = [
    { id: "stats", icon: Eye, label: "Stats" },
    { id: "users", icon: Users, label: "Users", count: stats?.users },
    { id: "posts", icon: FileText, label: "Posts", count: stats?.posts },
    { id: "chat", icon: MessageSquare, label: "Chat", count: stats?.chat_messages },
    { id: "forum", icon: MessagesSquare, label: "Forum", count: stats?.forum_topics },
    { id: "live", icon: Radio, label: "Live", count: stats?.live_streams },
    { id: "stories", icon: Image, label: "Stories", count: stats?.stories },
  ];

  if (roleLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Shield className="w-10 h-10 text-accent animate-pulse mx-auto" />
          <p className="text-muted-foreground text-sm">Chargement du panel admin...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background pb-8">
      {/* Header */}
      <div className="sticky top-0 z-50 p-4 flex items-center gap-3 border-b border-border bg-card/95 backdrop-blur-md">
        <button onClick={() => navigate("/")} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-accent/20">
            <Shield className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h1 className="text-base font-bold text-foreground">Dashboard Admin</h1>
            <p className="text-[10px] text-muted-foreground">{isSuperAdmin ? "Super Admin" : "Admin"}</p>
          </div>
        </div>
        <button
          onClick={() => { fetchStats(); if (tab === "users") fetchUsers(); }}
          className="ml-auto p-2 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Tab navigation */}
      <div className="overflow-x-auto scrollbar-none border-b border-border bg-card/50">
        <div className="flex gap-1 p-2 min-w-max">
          {tabs.map((t) => {
            const Icon = t.icon;
            const isActive = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-accent text-accent-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {t.count !== undefined && (
                  <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${isActive ? "bg-accent-foreground/20" : "bg-muted"}`}>
                    {t.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.15 }}
          className="p-4"
        >
          {/* ========== STATS ========== */}
          {tab === "stats" && stats && (
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Users, label: "Utilisateurs", value: stats.users, color: "text-blue-400" },
                { icon: FileText, label: "Posts", value: stats.posts, color: "text-green-400" },
                { icon: MessageSquare, label: "Commentaires", value: stats.comments, color: "text-orange-400" },
                { icon: Image, label: "Stories", value: stats.stories, color: "text-pink-400" },
                { icon: MessageSquare, label: "Chat", value: stats.chat_messages, color: "text-purple-400" },
                { icon: MessagesSquare, label: "Forum", value: stats.forum_topics, color: "text-cyan-400" },
                { icon: MessagesSquare, label: "Réponses", value: stats.forum_replies, color: "text-teal-400" },
                { icon: Radio, label: "Lives", value: stats.live_streams, color: "text-red-400" },
                { icon: Tv, label: "Chaînes TV", value: stats.tv_channels, color: "text-amber-400" },
              ].map((s, i) => (
                <div key={i} className="p-3 rounded-xl bg-card border border-border text-center">
                  <s.icon className={`w-5 h-5 mx-auto mb-1.5 ${s.color}`} />
                  <p className="text-xl font-bold text-foreground">{s.value}</p>
                  <p className="text-[10px] text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* ========== USERS ========== */}
          {tab === "users" && (
            <div className="space-y-2">
              {users.map((u) => (
                <div key={u.user_id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                  <img
                    src={u.avatar_url || `https://ui-avatars.com/api/?name=${u.display_name}&background=random&size=40`}
                    alt="" className="w-9 h-9 rounded-full object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-foreground truncate">{u.display_name}</p>
                    <div className="flex items-center gap-2">
                      {getRoleBadge(u.role)}
                      <span className="text-[9px] text-muted-foreground">{formatDate(u.created_at)}</span>
                    </div>
                  </div>
                  {isSuperAdmin && u.user_id !== user?.id && (
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.user_id, e.target.value)}
                      className="text-[11px] bg-secondary border border-border rounded-lg px-2 py-1 text-foreground"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  )}
                  {u.user_id !== user?.id && (
                    <button onClick={() => deleteContent(u.user_id, u.display_name)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Supprimer contenu">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* ========== POSTS ========== */}
          {tab === "posts" && (
            <div className="space-y-2">
              {posts.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Aucun post</p>}
              {posts.map((p) => (
                <div key={p.id} className="p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground">{p.display_name}</p>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.content || "(image)"}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span>❤️ {p.likes_count}</span>
                        <span>💬 {p.comments_count}</span>
                        <span>{formatDate(p.created_at)}</span>
                      </div>
                    </div>
                    {p.image_url && <img src={p.image_url} alt="" className="w-12 h-12 rounded-lg object-cover" />}
                    <button onClick={() => deletePost(p.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive shrink-0">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========== CHAT ========== */}
          {tab === "chat" && (
            <div className="space-y-1.5">
              {chatMessages.length > 0 && (
                <button
                  onClick={clearAllChat}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold hover:bg-destructive/20 transition-colors mb-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Vider tout le chat ({chatMessages.length} messages)
                </button>
              )}
              {chatMessages.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Aucun message</p>}
              {chatMessages.map((m) => (
                <div key={m.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-card border border-border">
                  <div className="flex-1 min-w-0">
                    <span className="text-[11px] font-bold text-foreground">{m.display_name}: </span>
                    <span className="text-[11px] text-muted-foreground">{m.content || (m.media_url ? "📎 Media" : "")}</span>
                    <p className="text-[9px] text-muted-foreground mt-0.5">{formatDate(m.created_at)}</p>
                  </div>
                  <button onClick={() => deleteChatMessage(m.id)} className="p-1 rounded hover:bg-destructive/10 text-destructive shrink-0">
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ========== FORUM ========== */}
          {tab === "forum" && (
            <div className="space-y-2">
              {forumTopics.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Aucun topic</p>}
              {forumTopics.map((t) => (
                <div key={t.id} className="p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {t.is_pinned && <Pin className="w-3 h-3 text-accent shrink-0" />}
                        <p className="text-xs font-bold text-foreground truncate">{t.title}</p>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">par {t.display_name} • {t.replies_count} réponses</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(t.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => togglePin(t.id, t.is_pinned)} className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground" title={t.is_pinned ? "Désépingler" : "Épingler"}>
                        {t.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                      <button onClick={() => deleteForumTopic(t.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========== LIVE ========== */}
          {tab === "live" && (
            <div className="space-y-2">
              {liveStreams.length === 0 && <p className="text-center text-muted-foreground text-sm py-8">Aucun live</p>}
              {liveStreams.map((s) => (
                <div key={s.id} className="p-3 rounded-xl bg-card border border-border">
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${s.is_active ? "bg-red-500 animate-pulse" : "bg-muted-foreground"}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{s.title}</p>
                      <p className="text-[10px] text-muted-foreground">par {s.display_name} • 👁 {s.viewers_count}</p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(s.created_at)}</p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {s.is_active && (
                        <button onClick={() => endLiveStream(s.id)} className="p-1.5 rounded-lg hover:bg-orange-500/10 text-orange-500" title="Terminer">
                          <StopCircle className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button onClick={() => deleteLiveStream(s.id)} className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive" title="Supprimer">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ========== STORIES ========== */}
          {tab === "stories" && (
            <div className="grid grid-cols-3 gap-2">
              {stories.length === 0 && <p className="col-span-3 text-center text-muted-foreground text-sm py-8">Aucune story</p>}
              {stories.map((s) => (
                <div key={s.id} className="relative rounded-xl overflow-hidden border border-border group">
                  <img src={s.image_url} alt="" className="w-full aspect-[9/16] object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-2">
                    <p className="text-[10px] font-bold text-white truncate">{s.display_name}</p>
                    {s.caption && <p className="text-[9px] text-white/70 truncate">{s.caption}</p>}
                  </div>
                  <button
                    onClick={() => deleteStory(s.id)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default Admin;
