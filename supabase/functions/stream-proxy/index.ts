import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return new Response(JSON.stringify({ error: "Missing url parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch the target URL
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": new URL(targetUrl).origin + "/",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Upstream error: ${response.status}` }), {
        status: response.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = response.headers.get("content-type") || "application/octet-stream";
    const body = await response.text();

    // If it's an m3u8 manifest, rewrite relative URLs to absolute
    if (targetUrl.includes(".m3u8") || contentType.includes("mpegurl") || contentType.includes("m3u")) {
      const baseUrl = targetUrl.substring(0, targetUrl.lastIndexOf("/") + 1);
      const proxyBase = req.url.split("?")[0];
      
      const rewritten = body.split("\n").map(line => {
        const trimmed = line.trim();
        if (trimmed.length === 0 || trimmed.startsWith("#")) {
          // Rewrite URI= references in #EXT tags
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/g, (_match, uri) => {
              const absoluteUri = uri.startsWith("http") ? uri : baseUrl + uri;
              return `URI="${proxyBase}?url=${encodeURIComponent(absoluteUri)}"`;
            });
          }
          return line;
        }
        // It's a URL line
        const absoluteUrl = trimmed.startsWith("http") ? trimmed : baseUrl + trimmed;
        return `${proxyBase}?url=${encodeURIComponent(absoluteUrl)}`;
      }).join("\n");

      return new Response(rewritten, {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/vnd.apple.mpegurl",
          "Cache-Control": "no-cache",
        },
      });
    }

    // For .ts segments or other binary content, stream through
    const binaryResponse = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Referer": new URL(targetUrl).origin + "/",
      },
      redirect: "follow",
    });

    return new Response(binaryResponse.body, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType.includes("mpegts") || targetUrl.includes(".ts") 
          ? "video/mp2t" 
          : contentType,
        "Cache-Control": "public, max-age=5",
      },
    });
  } catch (error) {
    console.error("Proxy error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
