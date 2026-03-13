const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

const LOCALHOSTS = new Set(["localhost", "127.0.0.1", "::1", "0.0.0.0"]);

const isPrivateIp = (host: string) => {
  if (LOCALHOSTS.has(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;
  return false;
};

const buildProxyUrl = ({
  proxyBase,
  target,
  referrer,
  userAgent,
}: {
  proxyBase: string;
  target: string;
  referrer?: string | null;
  userAgent?: string | null;
}) => {
  const params = new URLSearchParams({ url: target });
  if (referrer) params.set("referrer", referrer);
  if (userAgent) params.set("user_agent", userAgent);
  return `${proxyBase}?${params.toString()}`;
};

const rewriteManifest = ({
  manifest,
  sourceUrl,
  proxyBase,
  referrer,
  userAgent,
}: {
  manifest: string;
  sourceUrl: URL;
  proxyBase: string;
  referrer?: string | null;
  userAgent?: string | null;
}) => {
  return manifest
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;

      if (trimmed.startsWith("#EXT-X-KEY")) {
        return line.replace(/URI="([^"]+)"/, (_match, uri: string) => {
          const absoluteKeyUrl = new URL(uri, sourceUrl).toString();
          return `URI="${buildProxyUrl({
            proxyBase,
            target: absoluteKeyUrl,
            referrer,
            userAgent,
          })}"`;
        });
      }

      if (trimmed.startsWith("#")) return line;

      const absoluteUrl = new URL(trimmed, sourceUrl).toString();
      return buildProxyUrl({
        proxyBase,
        target: absoluteUrl,
        referrer,
        userAgent,
      });
    })
    .join("\n");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestUrl = new URL(req.url);
    const rawUrl = requestUrl.searchParams.get("url");
    const referrer = requestUrl.searchParams.get("referrer");
    const userAgent = requestUrl.searchParams.get("user_agent");

    if (!rawUrl) {
      return new Response(JSON.stringify({ error: "Missing 'url' query param" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetUrl = new URL(rawUrl);
    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return new Response(JSON.stringify({ error: "Only http/https protocols are allowed" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (isPrivateIp(targetUrl.hostname)) {
      return new Response(JSON.stringify({ error: "Private/internal hosts are not allowed" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const upstreamHeaders = new Headers();
    const range = req.headers.get("range");

    if (referrer) upstreamHeaders.set("Referer", referrer);
    if (userAgent) upstreamHeaders.set("User-Agent", userAgent);
    if (range) upstreamHeaders.set("Range", range);

    const upstreamResponse = await fetch(targetUrl.toString(), {
      method: "GET",
      headers: upstreamHeaders,
      redirect: "follow",
    });

    if (!upstreamResponse.ok) {
      return new Response(
        JSON.stringify({
          error: "Upstream stream unavailable",
          status: upstreamResponse.status,
          url: targetUrl.toString(),
        }),
        {
          status: upstreamResponse.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const upstreamContentType = upstreamResponse.headers.get("content-type") || "application/octet-stream";
    const isManifest =
      targetUrl.pathname.endsWith(".m3u8") ||
      upstreamContentType.includes("application/vnd.apple.mpegurl") ||
      upstreamContentType.includes("application/x-mpegurl");

    if (isManifest) {
      const manifestText = await upstreamResponse.text();
      const proxyBase = `${requestUrl.origin}${requestUrl.pathname}`;
      const rewritten = rewriteManifest({
        manifest: manifestText,
        sourceUrl: targetUrl,
        proxyBase,
        referrer,
        userAgent,
      });

      return new Response(rewritten, {
        status: upstreamResponse.status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "public, max-age=20",
        },
      });
    }

    const passthroughHeaders = new Headers({
      ...corsHeaders,
      "Content-Type": upstreamContentType,
      "Cache-Control": "public, max-age=20",
    });

    const passthroughHeaderKeys = ["content-length", "content-range", "accept-ranges"];
    for (const key of passthroughHeaderKeys) {
      const value = upstreamResponse.headers.get(key);
      if (value) passthroughHeaders.set(key, value);
    }

    return new Response(upstreamResponse.body, {
      status: upstreamResponse.status,
      headers: passthroughHeaders,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unexpected error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
