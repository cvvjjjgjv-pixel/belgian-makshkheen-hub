const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { server, username, password, action, category_id } = await req.json();

    if (!server || !username || !password) {
      return new Response(
        JSON.stringify({ error: 'Missing server, username or password' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build the Xtream Codes API URL
    let apiUrl = `${server}/player_api.php?username=${encodeURIComponent(username)}&password=${encodeURIComponent(password)}`;
    
    if (action) {
      apiUrl += `&action=${encodeURIComponent(action)}`;
    }
    if (category_id) {
      apiUrl += `&category_id=${encodeURIComponent(category_id)}`;
    }

    console.log('Xtream proxy request:', action || 'auth', '→', server);

    const response = await fetch(apiUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (QtEmbedded; U; Linux; C) AppleWebKit/533.3 (KHTML, like Gecko) MAG200 stbapp ver: 2 rev: 250 Safari/533.3',
      },
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Server returned ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();

    return new Response(
      JSON.stringify(data),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Xtream proxy error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Proxy error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
