const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const cache = new Map<string, { results: any[]; timestamp: number }>();
const CACHE_TTL = 15 * 60 * 1000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const NEWSDATA_API_KEY = Deno.env.get('NEWSDATA_API_KEY');
  if (!NEWSDATA_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'NEWSDATA_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const query = body.q || 'football tunisie';
    const language = body.language || 'fr';
    const category = body.category || '';
    const country = body.country || '';
    const size = body.size || 10;

    const cacheKey = `${query}:${language}:${category}:${country}:${size}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('Cache hit for:', cacheKey);
      return new Response(JSON.stringify({ articles: cached.results, totalResults: cached.results.length, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Try search query first
    const url = new URL('https://newsdata.io/api/1/latest');
    url.searchParams.set('apikey', NEWSDATA_API_KEY);
    url.searchParams.set('q', query);
    url.searchParams.set('language', language);
    url.searchParams.set('size', String(size));
    if (category) url.searchParams.set('category', category);
    if (country) url.searchParams.set('country', country);

    console.log('Fetching NewsData.io:', query);
    const res = await fetch(url.toString());
    const data = await res.json();
    console.log('NewsData response status:', data.status, 'results:', data.totalResults ?? 0);

    let articles: any[] = [];

    if (data.status === 'success' && data.results?.length > 0) {
      articles = data.results.map((r: any) => ({
        title: r.title || '',
        description: r.description || '',
        url: r.link || '',
        image: r.image_url || null,
        publishedAt: r.pubDate || '',
        source: {
          name: r.source_name || r.source_id || 'Unknown',
          url: r.source_url || '',
        },
      }));
    }

    // Fallback: sports category Tunisia
    if (articles.length === 0) {
      console.log('Fallback: sports category');
      const fbUrl = new URL('https://newsdata.io/api/1/latest');
      fbUrl.searchParams.set('apikey', NEWSDATA_API_KEY);
      fbUrl.searchParams.set('language', language);
      fbUrl.searchParams.set('category', 'sports');
      fbUrl.searchParams.set('country', 'tn');
      fbUrl.searchParams.set('size', String(size));

      const fbRes = await fetch(fbUrl.toString());
      const fbData = await fbRes.json();
      console.log('Fallback response:', fbData.status, fbData.totalResults ?? 0);

      if (fbData.status === 'success' && fbData.results?.length > 0) {
        articles = fbData.results.map((r: any) => ({
          title: r.title || '',
          description: r.description || '',
          url: r.link || '',
          image: r.image_url || null,
          publishedAt: r.pubDate || '',
          source: {
            name: r.source_name || r.source_id || 'Unknown',
            url: r.source_url || '',
          },
        }));
      }
    }

    if (articles.length > 0) {
      cache.set(cacheKey, { results: articles, timestamp: Date.now() });
    }

    return new Response(JSON.stringify({ articles, totalResults: articles.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('NewsData proxy error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
