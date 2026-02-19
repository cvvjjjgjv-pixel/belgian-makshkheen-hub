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
    console.error('GNEWS_API_KEY is not set in environment');
    return new Response(
      JSON.stringify({ error: 'GNEWS_API_KEY not configured on server' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const { q, lang = 'fr', max = 10 } = await req.json();

    const url = new URL('https://gnews.io/api/v4/search');
    url.searchParams.set('q', q || 'EST Tunis OR Espérance Sportive Tunis');
    url.searchParams.set('lang', lang);
    url.searchParams.set('country', 'any');
    url.searchParams.set('max', String(max));
    url.searchParams.set('apikey', GNEWS_API_KEY);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data.errors?.[0] || 'GNews API error' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
