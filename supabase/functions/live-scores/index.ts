const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 2 * 60 * 1000;

// TheSportsDB free public API (key "3" = free tier, no signup required)
const BASE = 'https://www.thesportsdb.com/api/v1/json/3';
const LIVE_STATUSES = ['1H', '2H', 'HT', 'ET', 'BT', 'P', 'LIVE'];

function mapStatus(strStatus: string | null, strProgress: string | null) {
  const s = (strStatus || '').toUpperCase();
  const p = (strProgress || '').toUpperCase();
  if (s.includes('FT') || s.includes('FINISHED')) {
    return { short: 'FT', long: 'Terminé', elapsed: null };
  }
  if (s.includes('HT') || s === 'HALF TIME') return { short: 'HT', long: 'Mi-temps', elapsed: 45 };
  if (s.includes('NS') || s === 'NOT STARTED' || !s) {
    return { short: 'NS', long: 'À venir', elapsed: null };
  }
  const elapsed = parseInt(p) || parseInt(s) || null;
  return { short: '1H', long: 'En direct', elapsed };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || 'live');

    let endpoint = '';
    let cacheKey = '';

    if (action === 'live') {
      endpoint = `${BASE}/livescore.php?s=Soccer`;
      cacheKey = 'live';
    } else {
      const today = new Date().toISOString().split('T')[0];
      endpoint = `${BASE}/eventsday.php?d=${today}&s=Soccer`;
      cacheKey = `today-${today}`;
    }

    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return new Response(JSON.stringify({ ...cached.data, cached: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Fetching:', endpoint);
    const res = await fetch(endpoint);
    const data = await res.json();

    const events = data.events || data.livescore || [];

    const fixtures = events.map((e: any) => {
      const status = mapStatus(e.strStatus, e.strProgress);
      const dateStr = e.strTimestamp || `${e.dateEvent}T${e.strTime || '00:00:00'}`;
      const homeGoals = e.intHomeScore !== null && e.intHomeScore !== undefined && e.intHomeScore !== ''
        ? parseInt(e.intHomeScore) : null;
      const awayGoals = e.intAwayScore !== null && e.intAwayScore !== undefined && e.intAwayScore !== ''
        ? parseInt(e.intAwayScore) : null;

      return {
        id: e.idEvent,
        date: dateStr,
        status,
        league: {
          id: e.idLeague,
          name: e.strLeague || 'Football',
          country: e.strCountry || '',
          logo: e.strLeagueBadge || '',
          round: e.intRound ? `Round ${e.intRound}` : '',
        },
        home: {
          id: e.idHomeTeam,
          name: e.strHomeTeam,
          logo: e.strHomeTeamBadge || '',
          winner: homeGoals !== null && awayGoals !== null ? homeGoals > awayGoals : null,
        },
        away: {
          id: e.idAwayTeam,
          name: e.strAwayTeam,
          logo: e.strAwayTeamBadge || '',
          winner: homeGoals !== null && awayGoals !== null ? awayGoals > homeGoals : null,
        },
        goals: { home: homeGoals, away: awayGoals },
      };
    });

    fixtures.sort((a: any, b: any) => {
      const aLive = LIVE_STATUSES.includes(a.status.short);
      const bLive = LIVE_STATUSES.includes(b.status.short);
      if (aLive && !bLive) return -1;
      if (!aLive && bLive) return 1;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });

    const result = { fixtures, total: fixtures.length };
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