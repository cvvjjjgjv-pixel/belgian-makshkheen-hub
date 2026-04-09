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

      console.log('GNews search:', query);
      const res = await fetch(url.toString());
      const data = await res.json();

      if (res.ok && data.articles?.length > 0) {
        articles = data.articles.map((a: any) => ({
          title: a.title || '',
          description: a.description || '',
          url: a.url || '',
          image: a.image || null,
          publishedAt: a.publishedAt || '',
          source: { name: a.source?.name || 'Unknown', url: a.source?.url || '' },
        }));
      }
    } catch (e) {
      console.error('GNews search failed:', e);
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
          articles = data.articles.map((a: any) => ({
            title: a.title || '',
            description: a.description || '',
            url: a.url || '',
            image: a.image || null,
            publishedAt: a.publishedAt || '',
            source: { name: a.source?.name || 'Unknown', url: a.source?.url || '' },
          }));
        }
      } catch (e) {
        console.error('GNews fallback failed:', e);
      }
    }

    if (articles.length > 0) {
      cache.set(cacheKey, { articles, timestamp: Date.now() });
    }

    console.log(`GNews returned ${articles.length} articles`);

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
