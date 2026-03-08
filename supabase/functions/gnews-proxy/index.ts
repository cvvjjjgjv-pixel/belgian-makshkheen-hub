const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Simple in-memory cache to avoid burning API quota
let cache: { articles: any[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

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

  // Return cached if fresh
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    console.log('Returning cached articles:', cache.articles.length);
    return new Response(JSON.stringify({ articles: cache.articles, totalArticles: cache.articles.length, cached: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const lang = body.lang || 'fr';
    const max = body.max || 10;

    let articles: any[] = [];

    // Strategy 1: top-headlines sports Tunisia (most reliable on free plan)
    try {
      const url = new URL('https://gnews.io/api/v4/top-headlines');
      url.searchParams.set('topic', 'sports');
      url.searchParams.set('lang', lang);
      url.searchParams.set('country', 'tn');
      url.searchParams.set('max', String(max));
      url.searchParams.set('apikey', GNEWS_API_KEY);

      console.log('Trying top-headlines sports/tn');
      const res = await fetch(url.toString());
      const data = await res.json();
      console.log('top-headlines result:', data.totalArticles ?? 0, 'articles');

      if (res.ok && data.articles?.length > 0) {
        articles = data.articles;
      }
    } catch (e) {
      console.error('top-headlines failed:', e);
    }

    // Strategy 2: search if top-headlines returned nothing
    if (articles.length === 0) {
      try {
        const url = new URL('https://gnews.io/api/v4/search');
        url.searchParams.set('q', 'Espérance Tunis OR Taraji OR football tunisie');
        url.searchParams.set('lang', lang);
        url.searchParams.set('country', 'any');
        url.searchParams.set('max', String(max));
        url.searchParams.set('apikey', GNEWS_API_KEY);

        console.log('Trying search fallback');
        const res = await fetch(url.toString());
        const data = await res.json();
        console.log('search result:', data.totalArticles ?? 0, 'articles');

        if (res.ok && data.articles?.length > 0) {
          articles = data.articles;
        }
      } catch (e) {
        console.error('search failed:', e);
      }
    }

    // Strategy 3: top-headlines general from Tunisia
    if (articles.length === 0) {
      try {
        const url = new URL('https://gnews.io/api/v4/top-headlines');
        url.searchParams.set('lang', lang);
        url.searchParams.set('country', 'tn');
        url.searchParams.set('max', String(max));
        url.searchParams.set('apikey', GNEWS_API_KEY);

        console.log('Trying top-headlines general/tn');
        const res = await fetch(url.toString());
        const data = await res.json();
        console.log('general headlines result:', data.totalArticles ?? 0);

        if (res.ok && data.articles?.length > 0) {
          articles = data.articles;
        }
      } catch (e) {
        console.error('general headlines failed:', e);
      }
    }

    // Cache results
    if (articles.length > 0) {
      cache = { articles, timestamp: Date.now() };
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