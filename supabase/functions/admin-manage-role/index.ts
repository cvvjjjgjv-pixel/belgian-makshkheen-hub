import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    // Verify caller is admin/super_admin
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Check caller role
    const { data: callerRoles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id);
    const callerRoleList = callerRoles?.map((r: any) => r.role) || [];
    const isSuperAdmin = callerRoleList.includes("super_admin");
    const isAdmin = callerRoleList.includes("admin") || isSuperAdmin;

    if (!isAdmin) return new Response(JSON.stringify({ error: "Non autorisé" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const { action, target_user_id, new_role } = await req.json();

    if (action === "change_role") {
      // Only super_admin can change roles
      if (!isSuperAdmin) return new Response(JSON.stringify({ error: "Seul le Super Admin peut changer les rôles" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (!target_user_id || !new_role) return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Can't change own role
      if (target_user_id === caller.id) return new Response(JSON.stringify({ error: "Tu ne peux pas changer ton propre rôle" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Update role
      await supabaseAdmin.from("user_roles").update({ role: new_role }).eq("user_id", target_user_id);
      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "delete_user_content") {
      if (!target_user_id) return new Response(JSON.stringify({ error: "Paramètres manquants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });

      // Delete all posts, comments, stories from user
      await supabaseAdmin.from("comments").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("posts").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("stories").delete().eq("user_id", target_user_id);
      await supabaseAdmin.from("chat_messages").delete().eq("user_id", target_user_id);

      return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get_stats") {
      const [{ count: usersCount }, { count: postsCount }, { count: commentsCount }, { count: storiesCount }] = await Promise.all([
        supabaseAdmin.from("profiles").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("posts").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("comments").select("*", { count: "exact", head: true }),
        supabaseAdmin.from("stories").select("*", { count: "exact", head: true }),
      ]);
      return new Response(JSON.stringify({ users: usersCount, posts: postsCount, comments: commentsCount, stories: storiesCount }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (action === "get_users") {
      const { data: profiles } = await supabaseAdmin.from("profiles").select("user_id, display_name, avatar_url, created_at");
      const { data: roles } = await supabaseAdmin.from("user_roles").select("user_id, role");

      const roleMap = new Map(roles?.map((r: any) => [r.user_id, r.role]) || []);
      const users = profiles?.map((p: any) => ({
        ...p,
        role: roleMap.get(p.user_id) || "user",
      })) || [];

      return new Response(JSON.stringify({ users }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Action inconnue" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});