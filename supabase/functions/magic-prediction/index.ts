import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { question } = await req.json();
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
            content: `Tu es une boule magique mystique 🔮 spécialisée dans le football et le sport. 
Tu donnes des prédictions amusantes, mystérieuses et engageantes sur le futur du football, des matchs, des équipes et des joueurs.
Réponds TOUJOURS en français, avec un ton mystique et dramatique. Utilise des emojis.
Garde tes réponses courtes (2-4 phrases max).
Commence toujours par "🔮" et finis par une phrase mystique.
Si la question ne concerne pas le sport, fais quand même une prédiction fun et mystique.
Exemples de style:
- "🔮 Les étoiles sont alignées... L'Espérance remportera un titre historique cette saison ! ⭐ Le destin est écrit dans les astres..."
- "🔮 Je vois dans ma boule de cristal... Un joueur inattendu marquera un hat-trick légendaire ! ⚽🔥 Les forces du football sont en mouvement..."`,
          },
          { role: "user", content: question || "Dis-moi l'avenir du football" },
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

    const data = await response.json();
    const prediction = data.choices?.[0]?.message?.content || "🔮 Les étoiles sont voilées... Réessaie plus tard !";

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