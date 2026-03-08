import { useState, useEffect } from "react";
import { MessageSquare, Plus, ArrowLeft, Send, Pin, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

type Topic = {
  id: string;
  title: string;
  content: string;
  user_id: string;
  is_pinned: boolean;
  replies_count: number;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
};

type Reply = {
  id: string;
  topic_id: string;
  content: string;
  user_id: string;
  created_at: string;
  author_name?: string;
  author_avatar?: string;
};

const ForumTab = () => {
  const { user } = useAuth();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [replies, setReplies] = useState<Reply[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [replyContent, setReplyContent] = useState("");
  const [loading, setLoading] = useState(true);

  // Fetch topics
  const fetchTopics = async () => {
    const { data: topicsData, error } = await supabase
      .from("forum_topics")
      .select("*")
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching topics:", error);
      return;
    }

    if (!topicsData || topicsData.length === 0) {
      setTopics([]);
      setLoading(false);
      return;
    }

    const userIds = [...new Set(topicsData.map((t) => t.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    const enriched = topicsData.map((t) => {
      const profile = profileMap.get(t.user_id);
      return {
        ...t,
        author_name: profile?.display_name || "Utilisateur",
        author_avatar: profile?.avatar_url || "",
      };
    });

    setTopics(enriched);
    setLoading(false);
  };

  // Fetch replies for a topic
  const fetchReplies = async (topicId: string) => {
    const { data: repliesData, error } = await supabase
      .from("forum_replies")
      .select("*")
      .eq("topic_id", topicId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching replies:", error);
      return;
    }

    if (!repliesData || repliesData.length === 0) {
      setReplies([]);
      return;
    }

    const userIds = [...new Set(repliesData.map((r) => r.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    setReplies(
      repliesData.map((r) => {
        const profile = profileMap.get(r.user_id);
        return {
          ...r,
          author_name: profile?.display_name || "Utilisateur",
          author_avatar: profile?.avatar_url || "",
        };
      })
    );
  };

  useEffect(() => {
    fetchTopics();

    const topicsChannel = supabase
      .channel("forum-topics-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "forum_topics" }, () => {
        fetchTopics();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(topicsChannel);
    };
  }, []);

  // Realtime replies
  useEffect(() => {
    if (!selectedTopic) return;

    fetchReplies(selectedTopic.id);

    const repliesChannel = supabase
      .channel("forum-replies-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "forum_replies", filter: `topic_id=eq.${selectedTopic.id}` },
        () => {
          fetchReplies(selectedTopic.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(repliesChannel);
    };
  }, [selectedTopic?.id]);

  const createTopic = async () => {
    if (!user || !newTitle.trim()) return;

    const { error } = await supabase.from("forum_topics").insert({
      title: newTitle.trim(),
      content: newContent.trim(),
      user_id: user.id,
    });

    if (error) {
      toast.error("Erreur lors de la création du sujet");
      return;
    }

    setNewTitle("");
    setNewContent("");
    setShowCreateForm(false);
    toast.success("Sujet créé !");
  };

  const sendReply = async () => {
    if (!user || !selectedTopic || !replyContent.trim()) return;

    const { error } = await supabase.from("forum_replies").insert({
      topic_id: selectedTopic.id,
      content: replyContent.trim(),
      user_id: user.id,
    });

    if (error) {
      toast.error("Erreur lors de l'envoi");
      return;
    }

    setReplyContent("");
  };

  const deleteTopic = async (topicId: string) => {
    const { error } = await supabase.from("forum_topics").delete().eq("id", topicId);
    if (error) toast.error("Erreur lors de la suppression");
    else {
      setSelectedTopic(null);
      toast.success("Sujet supprimé");
    }
  };

  const deleteReply = async (replyId: string) => {
    const { error } = await supabase.from("forum_replies").delete().eq("id", replyId);
    if (error) toast.error("Erreur lors de la suppression");
  };

  const timeAgo = (date: string) =>
    formatDistanceToNow(new Date(date), { addSuffix: true, locale: fr });

  // Topic detail view
  if (selectedTopic) {
    return (
      <div className="pb-20 flex flex-col h-full">
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <button onClick={() => setSelectedTopic(null)}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-foreground truncate">{selectedTopic.title}</h2>
            <p className="text-xs text-muted-foreground">{selectedTopic.author_name}</p>
          </div>
          {user && (user.id === selectedTopic.user_id) && (
            <button onClick={() => deleteTopic(selectedTopic.id)}>
              <Trash2 className="w-4 h-4 text-destructive" />
            </button>
          )}
        </div>

        {selectedTopic.content && (
          <div className="mx-4 mt-3 p-3 rounded-xl bg-card border border-border">
            <p className="text-sm text-foreground">{selectedTopic.content}</p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {replies.map((reply) => (
            <div key={reply.id} className={`flex gap-2 ${reply.user_id === user?.id ? "flex-row-reverse" : ""}`}>
              <img
                src={reply.author_avatar || `https://ui-avatars.com/api/?name=${reply.author_name}&background=random`}
                alt=""
                className="w-7 h-7 rounded-full object-cover flex-shrink-0"
              />
              <div
                className={`max-w-[75%] p-3 rounded-2xl ${
                  reply.user_id === user?.id
                    ? "bg-accent text-accent-foreground rounded-br-sm"
                    : "bg-muted text-foreground rounded-bl-sm"
                }`}
              >
                <p className="text-[11px] font-semibold mb-1 opacity-70">{reply.author_name}</p>
                <p className="text-sm">{reply.content}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="text-[10px] opacity-50">{timeAgo(reply.created_at)}</span>
                  {user && user.id === reply.user_id && (
                    <button onClick={() => deleteReply(reply.id)} className="ml-2">
                      <Trash2 className="w-3 h-3 text-destructive/60 hover:text-destructive" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {replies.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-8">
              Aucune réponse. Soyez le premier !
            </p>
          )}
        </div>

        {user && (
          <div className="p-3 border-t border-border flex gap-2">
            <Input
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Écrire une réponse..."
              className="flex-1 rounded-full bg-muted border-0"
              onKeyDown={(e) => e.key === "Enter" && sendReply()}
            />
            <Button size="icon" className="rounded-full" onClick={sendReply} disabled={!replyContent.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    );
  }

  // Create topic form
  if (showCreateForm) {
    return (
      <div className="pb-4">
        <div className="p-4 flex items-center gap-3 border-b border-border">
          <button onClick={() => setShowCreateForm(false)}>
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-lg font-bold text-foreground">Nouveau sujet</h2>
        </div>
        <div className="p-4 space-y-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Titre du sujet"
            className="bg-muted border-0"
          />
          <Textarea
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            placeholder="Description (optionnel)"
            className="bg-muted border-0 min-h-[120px]"
          />
          <Button onClick={createTopic} className="w-full" disabled={!newTitle.trim()}>
            Publier
          </Button>
        </div>
      </div>
    );
  }

  // Topics list
  return (
    <div className="pb-4">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <MessageSquare className="w-5 h-5 text-accent" />
          Forum
        </h2>
        {user && (
          <Button size="sm" variant="outline" className="rounded-full gap-1" onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4" />
            Nouveau
          </Button>
        )}
      </div>

      {loading ? (
        <div className="text-center text-muted-foreground text-sm py-8">Chargement...</div>
      ) : topics.length === 0 ? (
        <div className="text-center text-muted-foreground text-sm py-8">
          Aucun sujet pour le moment.
          {user && " Créez le premier !"}
        </div>
      ) : (
        topics.map((topic) => (
          <div
            key={topic.id}
            className="mx-4 mb-3 p-4 rounded-2xl bg-card border border-border cursor-pointer active:scale-[0.98] transition-transform"
            onClick={() => setSelectedTopic(topic)}
          >
            <div className="flex items-center gap-2 mb-3">
              <img
                src={topic.author_avatar || `https://ui-avatars.com/api/?name=${topic.author_name}&background=random`}
                alt=""
                className="w-8 h-8 rounded-full object-cover"
              />
              <span className="text-xs font-medium text-muted-foreground">{topic.author_name}</span>
              <span className="text-xs text-muted-foreground">• {timeAgo(topic.created_at)}</span>
              {topic.is_pinned && (
                <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full uppercase bg-accent/20 text-accent">
                  <Pin className="w-3 h-3 inline mr-0.5" />
                  Épinglé
                </span>
              )}
            </div>
            <h3 className="text-sm font-bold text-foreground mb-3">{topic.title}</h3>
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>{topic.replies_count} réponses</span>
            </div>
          </div>
        ))
      )}
    </div>
  );
};

export default ForumTab;
