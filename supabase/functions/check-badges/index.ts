const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No auth' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // Client as user to get user id
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Admin client for inserting badges
    const adminClient = createClient(supabaseUrl, serviceKey);
    const userId = user.id;

    // Fetch user stats in parallel
    const [postsRes, commentsRes, likesRes, profileRes, forumRes, badgesRes, userBadgesRes] = await Promise.all([
      adminClient.from('posts').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      adminClient.from('comments').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      adminClient.from('posts').select('likes_count').eq('user_id', userId),
      adminClient.from('profiles').select('created_at').eq('user_id', userId).single(),
      adminClient.from('forum_replies').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      adminClient.from('badges').select('*'),
      adminClient.from('user_badges').select('badge_id').eq('user_id', userId),
    ]);

    const postsCount = postsRes.count ?? 0;
    const commentsCount = commentsRes.count ?? 0;
    const totalLikes = (likesRes.data || []).reduce((sum: number, p: any) => sum + (p.likes_count || 0), 0);
    const memberSince = profileRes.data?.created_at ? new Date(profileRes.data.created_at) : new Date();
    const memberDays = Math.floor((Date.now() - memberSince.getTime()) / (1000 * 60 * 60 * 24));
    const forumReplies = forumRes.count ?? 0;

    const allBadges = badgesRes.data || [];
    const earnedBadgeIds = new Set((userBadgesRes.data || []).map((ub: any) => ub.badge_id));

    // Badge conditions map by name
    const conditions: Record<string, boolean> = {
      'Premier Post': postsCount >= 1,
      'Commentateur': commentsCount >= 10,
      'Populaire': totalLikes >= 50,
      'Vétéran': memberDays >= 365,
      'Supporter': forumReplies >= 5,
    };

    const awarded: string[] = [];

    for (const badge of allBadges) {
      if (earnedBadgeIds.has(badge.id)) continue;
      const condition = conditions[badge.name];
      if (condition) {
        const { error: insertError } = await adminClient.from('user_badges').insert({
          user_id: userId,
          badge_id: badge.id,
        });
        if (!insertError) {
          awarded.push(badge.name);
        }
      }
    }

    console.log(`User ${userId}: posts=${postsCount}, comments=${commentsCount}, likes=${totalLikes}, days=${memberDays}, forum=${forumReplies}. Awarded: ${awarded.join(', ') || 'none'}`);

    return new Response(JSON.stringify({
      awarded,
      stats: { postsCount, commentsCount, totalLikes, memberDays, forumReplies },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});