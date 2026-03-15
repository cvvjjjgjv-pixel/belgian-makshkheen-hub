import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function resolveRelativeUrls(manifest: string, baseUrl: string): string {
  const lastSlash = baseUrl.lastIndexOf('/');
  const basePath = lastSlash >= 0 ? baseUrl.substring(0, lastSlash + 1) : baseUrl + '/';
  const urlObj = new URL(baseUrl);
  const origin = urlObj.origin;

  return manifest.split('\n').map(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return line;
    }
    if (trimmed.startsWith('//')) return urlObj.protocol + trimmed;
    if (trimmed.startsWith('/')) return origin + trimmed;
    return basePath + trimmed;
  }).join('\n');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { url, stream } = await req.json();
    
    if (!url) {
      return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const urlObj = new URL(url);
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': '*/*',
      'Accept-Language': 'fr-FR,fr;q=0.9,en-US;q=0.8,en;q=0.7',
    };

    if (urlObj.hostname.includes('alkass') || urlObj.hostname.includes('akamaized.net')) {
      headers['Referer'] = 'https://shoof.alkass.net/';
      headers['Origin'] = 'https://shoof.alkass.net';
    } else if (urlObj.hostname.includes('elahmad.com')) {
      headers['Referer'] = 'http://www.elahmad.com/tv/livetv/Arabian.htm';
      headers['Accept'] = 'application/vnd.apple.mpegurl, */*';
    }

    const response = await fetch(url, {
      headers,
      redirect: 'follow',
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Upstream returned ${response.status}` }), {
        status: 502,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    
    // For m3u8 manifests, rewrite relative URLs to absolute
    const isManifest = contentType.includes('mpegurl') || 
                       contentType.includes('m3u8') || 
                       url.endsWith('.m3u8') || 
                       contentType.includes('text/plain');
    
    if (isManifest) {
      const text = await response.text();
      if (text.trimStart().startsWith('#EXTM3U') || text.includes('#EXT-X-')) {
        const finalUrl = response.url || url;
        const rewritten = resolveRelativeUrls(text, finalUrl);
        return new Response(rewritten, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/vnd.apple.mpegurl',
            'Cache-Control': 'no-cache',
          },
        });
      }
    }

    // For streaming/live content (TS streams etc.), stream the response body directly
    if (stream && response.body) {
      return new Response(response.body, {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
          'Transfer-Encoding': 'chunked',
        },
      });
    }

    const body = await response.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': contentType,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
