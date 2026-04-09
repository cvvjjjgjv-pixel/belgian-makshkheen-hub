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
    const query = String(body.q || 'football tunisie').slice(0, 200);
    const language = String(body.language || 'fr').slice(0, 5);
    const category = String(body.category || '').slice(0, 50);
    const country = String(body.country || '').slice(0, 5);
    const size = Math.min(Math.max(1, Number(body.size) || 10), 50);

    const cacheKey = `${query}:${language}:${category}:${country}:${size}`;
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify({ articles: cached.results, totalResults: cached.results.length, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching NewsData.io:', query);

    const url = new URL('https://newsdata.io/api/1/latest');
    url.searchParams.set('apikey', NEWSDATA_API_KEY);
    url.searchParams.set('q', query);
    url.searchParams.set('language', language);
    url.searchParams.set('size', String(size));
    if (category) url.searchParams.set('category', category);
    if (country) url.searchParams.set('country', country);

    const res = await fetch(url.toString());
    const data = await res.json();

    let articles: any[] = [];

    console.log('NewsData response status:', data.status, 'results:', data.results?.length || 0);

    if (data.status === 'success' && data.results?.length > 0) {
      articles = data.results.map((r: any) => ({
        title: r.title || '',
        description: r.description || '',
        url: r.link || '',
        image: r.image_url || null,
        publishedAt: r.pubDate || '',
        source: { name: r.source_name || r.source_id || 'Unknown', url: r.source_url || '' },
      }));
    }

    if (articles.length === 0) {
      const fbUrl = new URL('https://newsdata.io/api/1/latest');
      fbUrl.searchParams.set('apikey', NEWSDATA_API_KEY);
      fbUrl.searchParams.set('language', language);
      fbUrl.searchParams.set('category', 'sports');
      fbUrl.searchParams.set('country', 'tn');
      fbUrl.searchParams.set('size', String(size));

      const fbRes = await fetch(fbUrl.toString());
      const fbData = await fbRes.json();

      if (fbData.status === 'success' && fbData.results?.length > 0) {
        articles = fbData.results.map((r: any) => ({
          title: r.title || '',
          description: r.description || '',
          url: r.link || '',
          image: r.image_url || null,
          publishedAt: r.pubDate || '',
          source: { name: r.source_name || r.source_id || 'Unknown', url: r.source_url || '' },
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
