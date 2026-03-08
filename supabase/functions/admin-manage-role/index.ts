import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { data: callerRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id);
    const callerRoleList = callerRoles?.map((r: any) => r.role) || [];
    const isSuperAdmin = callerRoleList.includes("super_admin");
    const isAdmin = callerRoleList.includes("admin") || isSuperAdmin;

    if (!isAdmin) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const body = await req.json();
    const { action, target_user_id, new_role } = body;

    // ========== ROLE MANAGEMENT ==========
    if (action === "change_role") {
      if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Seul le Super Admin peut changer les rôles" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!target_user_id || !new_role) return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (target_user_id === caller.id) return new Response(JSON.stringify({ error: "Tu ne peux pas changer ton propre rôle" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      await supabaseAdmin.from("user_roles").update({ role: new_role }).eq("user_id", target_user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== DELETE USER CONTENT ==========
    if (action === "delete_user_content") {
      if (!target_user_id) return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supabaseAdmin.from("comments").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("post_likes").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("posts").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("stories").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("chat_messages").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("forum_replies").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("forum_topics").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("live_chat_messages").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("live_streams").delete().eq("user_id", target_user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== STATS ==========
    if (action === "get_stats") {
      const [
        { count: usersCount },
        { count: postsCount },
        { count: commentsCount },
        { count: storiesCount },
        { count: chatCount },
        { count: forumTopicsCount },
        { count: forumRepliesCount },
        { count: liveStreamsCount },
        { count: tvChannelsCount },
      ] = await Promise.all([
        supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("posts").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("comments").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("stories").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("chat_messages").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("forum_topics").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("forum_replies").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("live_streams").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("tv_channels").select("*", { count: "exact", head: true }),
      ]);
      return new Response(JSON.stringify({
        users: usersCount, posts: postsCount, comments: commentsCount, stories: storiesCount,
        chat_messages: chatCount, forum_topics: forumTopicsCount, forum_replies: forumRepliesCount,
        live_streams: liveStreamsCount, tv_channels: tvChannelsCount,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== USERS ==========
    if (action === "get_users") {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, display_name, avatar_url, created_at").order("created_at", { ascending: false });
      const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");
      const roleMap = new Map(roles?.map((r: any) => [r.user_id, r.role]) || []);
      const users = profiles?.map((p: any) => ({ ...p, role: roleMap.get(p.user_id) || "user" })) || [];
      return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== POSTS ==========
    if (action === "get_posts") {
      const { data: posts } = await supabaseAdmin.from("posts").select("id, content, image_url, likes_count, comments_count, created_at, user_id").order("created_at", { ascending: false }).limit(50);
      const userIds = [...new Set(posts?.map((p: any) => p.user_id) || [])];
      const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p.display_name]) || []);
      const result = posts?.map((p: any) => ({ ...p, display_name: profileMap.get(p.user_id) || "?" })) || [];
      return new Response(JSON.stringify({ posts: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_post") {
      const { post_id } = body;
      if (!post_id) return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supabaseAdmin.from("comments").delete().eq("post_id", post_id);
      await supabaseAdmin.from("post_likes").delete().eq("post_id", post_id);
      await supabaseAdmin.from("favorites").delete().eq("post_id", post_id);
      await supabaseAdmin.from("posts").delete().eq("id", post_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== CHAT MESSAGES ==========
    if (action === "get_chat_messages") {
      const { data: messages } = await supabaseAdmin.from("chat_messages").select("id, content, created_at, user_id, media_url").order("created_at", { ascending: false }).limit(50);
      const userIds = [...new Set(messages?.map((m: any) => m.user_id) || [])];
      const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p.display_name]) || []);
      const result = messages?.map((m: any) => ({ ...m, display_name: profileMap.get(m.user_id) || "?" })) || [];
      return new Response(JSON.stringify({ messages: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_chat_message") {
      const { message_id } = body;
      if (!message_id) return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supabaseAdmin.from("chat_messages").delete().eq("id", message_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== FORUM ==========
    if (action === "get_forum_topics") {
      const { data: topics } = await supabaseAdmin.from("forum_topics").select("id, title, content, replies_count, is_pinned, created_at, user_id").order("created_at", { ascending: false }).limit(50);
      const userIds = [...new Set(topics?.map((t: any) => t.user_id) || [])];
      const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p.display_name]) || []);
      const result = topics?.map((t: any) => ({ ...t, display_name: profileMap.get(t.user_id) || "?" })) || [];
      return new Response(JSON.stringify({ topics: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_forum_topic") {
      const { topic_id } = body;
      if (!topic_id) return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supabaseAdmin.from("forum_replies").delete().eq("topic_id", topic_id);
      await supabaseAdmin.from("forum_topics").delete().eq("id", topic_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "toggle_pin_topic") {
      const { topic_id, is_pinned } = body;
      if (!topic_id) return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supabaseAdmin.from("forum_topics").update({ is_pinned }).eq("id", topic_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== LIVE STREAMS ==========
    if (action === "get_live_streams") {
      const { data: streams } = await supabaseAdmin.from("live_streams").select("id, title, is_active, viewers_count, created_at, user_id").order("created_at", { ascending: false }).limit(50);
      const userIds = [...new Set(streams?.map((s: any) => s.user_id) || [])];
      const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p.display_name]) || []);
      const result = streams?.map((s: any) => ({ ...s, display_name: profileMap.get(s.user_id) || "?" })) || [];
      return new Response(JSON.stringify({ streams: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "end_live_stream") {
      const { stream_id } = body;
      if (!stream_id) return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supabaseAdmin.from("live_streams").update({ is_active: false, ended_at: new Date().toISOString() }).eq("id", stream_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_live_stream") {
      const { stream_id } = body;
      if (!stream_id) return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supabaseAdmin.from("live_chat_messages").delete().eq("live_id", stream_id);
      await supabaseAdmin.from("live_streams").delete().eq("id", stream_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ========== STORIES ==========
    if (action === "get_stories") {
      const { data: stories } = await supabaseAdmin.from("stories").select("id, image_url, caption, created_at, expires_at, user_id").order("created_at", { ascending: false }).limit(50);
      const userIds = [...new Set(stories?.map((s: any) => s.user_id) || [])];
      const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, display_name").in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p.display_name]) || []);
      const result = stories?.map((s: any) => ({ ...s, display_name: profileMap.get(s.user_id) || "?" })) || [];
      return new Response(JSON.stringify({ stories: result }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_story") {
      const { story_id } = body;
      if (!story_id) return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      await supabaseAdmin.from("story_views").delete().eq("story_id", story_id);
      await supabaseAdmin.from("story_reactions").delete().eq("story_id", story_id);
      await supabaseAdmin.from("stories").delete().eq("id", story_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
