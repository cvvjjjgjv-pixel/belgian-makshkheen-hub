const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000; // 2 min cache for live scores

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const API_KEY = Deno.env.get('FOOTBALL_API_KEY');
  if (!API_KEY) {
    return new Response(
      JSON.stringify({ error: 'FOOTBALL_API_KEY not configured' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'live');

    let endpoint = '';
    let cacheKey = '';

    if (action === 'live') {
      endpoint = 'https://v3.football.api-sports.io/fixtures?live=all';
      cacheKey = 'live';
    } else if (action === 'today') {
      const today = new Date().toISOString().split('T')[0];
      endpoint = `https://v3.football.api-sports.io/fixtures?date=${today}`;
      cacheKey = `today-${today}`;
    } else if (action === 'league') {
      const leagueId = Number(body.league) || 202; // Ligue 1 Tunisie by default
      const season = Number(body.season) || new Date().getFullYear();
      endpoint = `https://v3.football.api-sports.io/standings?league=${leagueId}&season=${season}`;
      cacheKey = `league-${leagueId}-${season}`;
    }

    // Check cache
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify({ ...cached.data, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching:', endpoint);

    const res = await fetch(endpoint, {
      headers: {
        'x-apisports-key': API_KEY,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('API-Football error:', data);
      return new Response(
        JSON.stringify({ error: 'API request failed', details: data }),
        { status: res.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Process response based on action
    let result: any = {};

    if (action === 'live' || action === 'today') {
      const fixtures = (data.response || []).map((f: any) => ({
        id: f.fixture?.id,
        date: f.fixture?.date,
        status: {
          short: f.fixture?.status?.short,
          long: f.fixture?.status?.long,
          elapsed: f.fixture?.status?.elapsed,
        },
        league: {
          id: f.league?.id,
          name: f.league?.name,
          country: f.league?.country,
          logo: f.league?.logo,
          round: f.league?.round,
        },
        home: {
          id: f.teams?.home?.id,
          name: f.teams?.home?.name,
          logo: f.teams?.home?.logo,
          winner: f.teams?.home?.winner,
        },
        away: {
          id: f.teams?.away?.id,
          name: f.teams?.away?.name,
          logo: f.teams?.away?.logo,
          winner: f.teams?.away?.winner,
        },
        goals: {
          home: f.goals?.home,
          away: f.goals?.away,
        },
        score: {
          halftime: f.score?.halftime,
          fulltime: f.score?.fulltime,
        },
      }));

      // Sort: live matches first, then upcoming
      fixtures.sort((a: any, b: any) => {
        const liveStatuses = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'SUSP', 'INT', 'LIVE'];
        const aLive = liveStatuses.includes(a.status.short);
        const bLive = liveStatuses.includes(b.status.short);
        if (aLive && !bLive) return -1;
        if (!aLive && bLive) return 1;
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      });

      result = { fixtures, total: fixtures.length };
    } else if (action === 'league') {
      result = { standings: data.response || [] };
    }

    cache.set(cacheKey, { data: result, timestamp: Date.now() });

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Live scores error:', err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
