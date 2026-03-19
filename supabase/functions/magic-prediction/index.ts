import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { question } = await req.json();
    const sanitizedQuestion = String(question || "Dis-moi mon avenir").slice(0, 500);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Tu es une boule magique 🎱 fun qui invente des prédictions CONCRÈTES et PERSONNALISÉES.
Règles STRICTES :
- Maximum 1 à 2 phrases COURTES
- Invente des DÉTAILS PRÉCIS : prénoms, montants, dates, lieux, couleurs
- Sois SPÉCIFIQUE : "Mardi tu vas croiser une Sarah aux yeux verts 💚" pas "l'amour arrive bientôt"
- Utilise 1-2 emojis max
- Réponds en français
- Sois positif et fun, jamais méchant
- Commence DIRECT par la prédiction
Exemples :
"Jeudi, 847€ vont tomber sur ton compte par surprise 💰"
"Une fille qui s'appelle Yasmine va te sourire demain au café ☕"
"Vendredi soir, ton équipe va gagner 3-1, mise dessus 🔥"
"Tu vas trouver un billet de 50€ dans ta vieille veste lundi 🧥"`,
          },
          { role: "user", content: sanitizedQuestion },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de prédictions ! Réessaie dans un moment 🔮" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Les forces mystiques sont épuisées pour le moment" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const prediction = aiData.choices?.[0]?.message?.content || "🔮 Les étoiles sont voilées... Réessaie plus tard !";

    return new Response(JSON.stringify({ prediction }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("magic-prediction error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur mystique" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
