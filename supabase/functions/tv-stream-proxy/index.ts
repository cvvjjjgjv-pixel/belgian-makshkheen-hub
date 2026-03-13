const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, range, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Expose-Headers': 'content-length, content-range, accept-ranges, content-type',
};

const resolveUrl = (value: string, baseUrl: string) => {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
};

const buildProxyUrl = (targetUrl: string, reqUrl: URL, referrer?: string | null, userAgent?: string | null) => {
  const proxyUrl = new URL(reqUrl.pathname, reqUrl.origin);
  proxyUrl.searchParams.set('url', targetUrl);
  if (referrer) proxyUrl.searchParams.set('ref', referrer);
  if (userAgent) proxyUrl.searchParams.set('ua', userAgent);
  return proxyUrl.toString();
};

const rewriteM3U8 = (content: string, baseUrl: string, reqUrl: URL, referrer?: string | null, userAgent?: string | null) => {
  const lines = content.split('\n');

  return lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith('#EXT-X-KEY') || trimmed.startsWith('#EXT-X-MAP')) {
        return line.replace(/URI="([^"]+)"/g, (_full, uri) => {
          const absolute = resolveUrl(uri, baseUrl);
          const proxied = buildProxyUrl(absolute, reqUrl, referrer, userAgent);
          return `URI="${proxied}"`;
        });
      }

      if (trimmed.startsWith('#')) return line;

      const absolute = resolveUrl(trimmed, baseUrl);
      return buildProxyUrl(absolute, reqUrl, referrer, userAgent);
    })
    .join('\n');
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const reqUrl = new URL(req.url);
    const target = reqUrl.searchParams.get('url');
    const referrer = reqUrl.searchParams.get('ref');
    const userAgent = reqUrl.searchParams.get('ua');

    if (!target) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const targetUrl = new URL(target);
    if (!['http:', 'https:'].includes(targetUrl.protocol)) {
      return new Response(JSON.stringify({ error: 'Invalid protocol' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const upstreamHeaders = new Headers();
    const incomingRange = req.headers.get('range');
    if (incomingRange) upstreamHeaders.set('range', incomingRange);
    if (referrer) upstreamHeaders.set('referer', referrer);
    if (userAgent) upstreamHeaders.set('user-agent', userAgent);

    const upstream = await fetch(targetUrl.toString(), {
      method: 'GET',
      headers: upstreamHeaders,
      redirect: 'follow',
    });

    const contentType = upstream.headers.get('content-type') || '';
    const responseHeaders = new Headers({ ...corsHeaders });

    const passthroughHeaders = ['content-type', 'cache-control', 'content-length', 'content-range', 'accept-ranges', 'expires', 'last-modified'];
    passthroughHeaders.forEach((headerName) => {
      const value = upstream.headers.get(headerName);
      if (value) responseHeaders.set(headerName, value);
    });

    if (contentType.includes('application/vnd.apple.mpegurl') || contentType.includes('application/x-mpegurl') || targetUrl.pathname.endsWith('.m3u8')) {
      const text = await upstream.text();
      const rewritten = rewriteM3U8(text, targetUrl.toString(), reqUrl, referrer, userAgent);
      responseHeaders.set('content-type', 'application/vnd.apple.mpegurl');

      return new Response(rewritten, {
        status: upstream.status,
        headers: responseHeaders,
      });
    }

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error('tv-stream-proxy error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown proxy error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
