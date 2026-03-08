const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Per-query cache
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
    const lang = body.lang || 'fr';
    const max = body.max || 10;
    const query = body.q || 'sport tunisie OR football tunisie';

    // Check cache for this query
    const cacheKey = `${query}:${lang}:${max}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Cache hit for:', cacheKey);
      return new Response(JSON.stringify({ articles: cached.articles, totalArticles: cached.articles.length, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let articles: any[] = [];

    // Search with user query
    try {
      const url = new URL('https://gnews.io/api/v4/search');
      url.searchParams.set('q', query);
      url.searchParams.set('lang', lang);
      url.searchParams.set('max', String(max));
      url.searchParams.set('apikey', GNEWS_API_KEY);

      console.log('Searching for:', query);
      const res = await fetch(url.toString());
      const data = await res.json();
      console.log('Search result:', data.totalArticles ?? 0, 'articles');

      if (res.ok && data.articles?.length > 0) {
        articles = data.articles;
      }
    } catch (e) {
      console.error('Search failed:', e);
    }

    // Fallback: top-headlines sports Tunisia
    if (articles.length === 0) {
      try {
        const url = new URL('https://gnews.io/api/v4/top-headlines');
        url.searchParams.set('topic', 'sports');
        url.searchParams.set('lang', lang);
        url.searchParams.set('country', 'tn');
        url.searchParams.set('max', String(max));
        url.searchParams.set('apikey', GNEWS_API_KEY);

        console.log('Fallback: top-headlines sports/tn');
        const res = await fetch(url.toString());
        const data = await res.json();

        if (res.ok && data.articles?.length > 0) {
          articles = data.articles;
        }
      } catch (e) {
        console.error('Fallback failed:', e);
      }
    }

    // Cache results
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
