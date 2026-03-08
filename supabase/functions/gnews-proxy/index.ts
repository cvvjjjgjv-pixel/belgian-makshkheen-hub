const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const GNEWS_API_KEY = Deno.env.get('GNEWS_API_KEY');
  console.log('GNEWS_API_KEY present:', !!GNEWS_API_KEY, 'length:', GNEWS_API_KEY?.length ?? 0);

  if (!GNEWS_API_KEY) {
    return new Response(
      JSON.stringify({ error: 'GNEWS_API_KEY not configured on server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { q, lang = 'fr', max = 10, endpoint = 'search' } = await req.json();

    // Try search first, fallback to top-headlines if no results
    const searchQueries = [
      q || 'Espérance Tunis',
      'Taraji OR Espérance sportive',
      'football tunisien',
    ];

    let articles: any[] = [];

    for (const query of searchQueries) {
      if (articles.length > 0) break;

      const url = new URL(`https://gnews.io/api/v4/search`);
      url.searchParams.set('q', query);
      url.searchParams.set('lang', lang);
      url.searchParams.set('country', 'any');
      url.searchParams.set('max', String(max));
      url.searchParams.set('apikey', GNEWS_API_KEY);

      console.log('Trying query:', query);
      const response = await fetch(url.toString());
      const data = await response.json();
      console.log('Response for query:', query, 'articles:', data.totalArticles ?? 0);

      if (response.ok && data.articles?.length > 0) {
        articles = data.articles;
        break;
      }
    }

    // If still no results, try top-headlines for Tunisia/sports
    if (articles.length === 0) {
      const url = new URL('https://gnews.io/api/v4/top-headlines');
      url.searchParams.set('topic', 'sports');
      url.searchParams.set('lang', lang);
      url.searchParams.set('country', 'tn');
      url.searchParams.set('max', String(max));
      url.searchParams.set('apikey', GNEWS_API_KEY);

      console.log('Falling back to top-headlines sports/tn');
      const response = await fetch(url.toString());
      const data = await response.json();
      console.log('Top-headlines response:', data.totalArticles ?? 0);

      if (response.ok && data.articles?.length > 0) {
        articles = data.articles;
      }
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