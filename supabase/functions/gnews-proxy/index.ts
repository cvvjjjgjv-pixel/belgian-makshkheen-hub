import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const cache = new Map<string, { articles: any[]; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verify JWT
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );

  const token = authHeader.replace('Bearer ', '');
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const GNEWS_API_KEY = Deno.env.get('GNEWS_API_KEY');
  if (!GNEWS_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GNEWS_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const lang = String(body.lang || 'fr').slice(0, 5);
    const max = Math.min(Math.max(1, Number(body.max) || 10), 50);
    const query = String(body.q || 'sport tunisie OR football tunisie').slice(0, 200);

    const cacheKey = `${query}:${lang}:${max}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify({ articles: cached.articles, totalArticles: cached.articles.length, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let articles: any[] = [];

    try {
      const url = new URL('https://gnews.io/api/v4/search');
      url.searchParams.set('q', query);
      url.searchParams.set('lang', lang);
      url.searchParams.set('max', String(max));
      url.searchParams.set('apikey', GNEWS_API_KEY);

      const res = await fetch(url.toString());
      const data = await res.json();

      if (res.ok && data.articles?.length > 0) {
        articles = data.articles;
      }
    } catch (e) {
      console.error('Search failed:', e);
    }

    if (articles.length === 0) {
      try {
        const url = new URL('https://gnews.io/api/v4/top-headlines');
        url.searchParams.set('topic', 'sports');
        url.searchParams.set('lang', lang);
        url.searchParams.set('country', 'tn');
        url.searchParams.set('max', String(max));
        url.searchParams.set('apikey', GNEWS_API_KEY);

        const res = await fetch(url.toString());
        const data = await res.json();

        if (res.ok && data.articles?.length > 0) {
          articles = data.articles;
        }
      } catch (e) {
        console.error('Fallback failed:', e);
      }
    }

    if (articles.length > 0) {
      cache.set(cacheKey, { articles, timestamp: Date.now() });
    }

    return new Response(JSON.stringify({ articles, totalArticles: articles.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
