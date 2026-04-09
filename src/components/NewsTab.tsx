import { useEffect, useState, useCallback } from "react";
import { Newspaper, ExternalLink, Clock, RefreshCw, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Article {
  title: string;
  description: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

const CATEGORIES = [
  { id: "football", label: "⚽ Football", query: "football tunisie OR ligue 1 tunisie OR championnat tunisie football" },
  { id: "handball", label: "🤾 Handball", query: "handball tunisie OR championnat tunisie handball" },
  { id: "volleyball", label: "🏐 Volleyball", query: "volleyball tunisie OR volley tunisie" },
  { id: "est", label: "🔴🟡 EST", query: "Espérance Sportive de Tunis OR Taraji OR الترجي" },
  { id: "nationale", label: "🇹🇳 Équipe Nationale", query: "équipe nationale tunisie OR aigles de carthage" },
  { id: "championnat", label: "🏆 Championnat", query: "championnat tunisie OR ligue 1 tunisie" },
  { id: "all", label: "📰 Tout", query: "sport tunisie actualité" },
] as const;

const NewsTab = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeCategory, setActiveCategory] = useState("football");
  const [sourceInfo, setSourceInfo] = useState<string>("");

  const deduplicateArticles = (items: Article[]): Article[] => {
    const seen = new Set<string>();
    return items.filter((a) => {
      const key = a.title.toLowerCase().trim().slice(0, 60);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  };

  const fetchNews = useCallback(async (isRefresh = false, categoryId?: string) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    const cat = CATEGORIES.find(c => c.id === (categoryId || activeCategory)) || CATEGORIES[0];

    try {
      // Fetch from both APIs in parallel
      const [newsDataResult, gnewsResult] = await Promise.allSettled([
        supabase.functions.invoke("newsdata-proxy", {
          body: { q: cat.query, language: "fr", size: 10 },
        }),
        supabase.functions.invoke("gnews-proxy", {
          body: { q: cat.query, lang: "fr", max: 10 },
        }),
      ]);

      let allArticles: Article[] = [];
      const sources: string[] = [];

      // Process NewsData results
      if (newsDataResult.status === "fulfilled" && newsDataResult.value.data?.articles?.length > 0) {
        allArticles.push(...newsDataResult.value.data.articles);
        sources.push("NewsData");
      }

      // Process GNews results
      if (gnewsResult.status === "fulfilled" && gnewsResult.value.data?.articles?.length > 0) {
        allArticles.push(...gnewsResult.value.data.articles);
        sources.push("GNews");
      }

      // Deduplicate and sort by date
      allArticles = deduplicateArticles(allArticles);
      allArticles.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      setArticles(allArticles);
      setSourceInfo(sources.length > 0 ? sources.join(" + ") : "");

      if (allArticles.length === 0) {
        setError("Aucune actualité trouvée pour cette catégorie.");
      }
    } catch (err) {
      setError("Impossible de charger les actualités.");
      console.error("News fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchNews(false, activeCategory);
  }, [activeCategory]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000 / 60);
    if (diff < 60) return `Il y a ${diff} min`;
    if (diff < 1440) return `Il y a ${Math.floor(diff / 60)}h`;
    return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  };

  return (
    <div className="pb-4">
      <div className="p-4 flex items-center justify-between">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <Newspaper className="w-5 h-5 text-accent" />
          Actualités
        </h2>
        <div className="flex items-center gap-2">
          {sourceInfo && (
            <span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-card border border-border px-2 py-1 rounded-full">
              <Zap className="w-3 h-3 text-accent" />
              {sourceInfo}
            </span>
          )}
          <button
            onClick={() => fetchNews(true)}
            disabled={refreshing}
            className="p-2 rounded-full bg-card border border-border text-muted-foreground hover:text-accent transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Category filters */}
      <div className="px-4 pb-3 flex gap-2 overflow-x-auto scrollbar-hide">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
              activeCategory === cat.id
                ? "bg-accent text-accent-foreground border-accent"
                : "bg-card text-muted-foreground border-border hover:border-accent/40"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="space-y-3 px-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-card rounded-2xl overflow-hidden border border-border">
              <div className="skeleton-loading w-full h-40 rounded-none" />
              <div className="p-4 space-y-2">
                <div className="skeleton-loading h-4 w-3/4 rounded" />
                <div className="skeleton-loading h-3 w-full rounded" />
                <div className="skeleton-loading h-3 w-2/3 rounded" />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div className="mx-4 p-6 bg-destructive/10 border border-destructive/30 rounded-2xl text-center">
          <Newspaper className="w-12 h-12 text-destructive/40 mx-auto mb-3" />
          <p className="text-destructive text-sm font-medium">{error}</p>
          <button
            onClick={() => fetchNews()}
            className="mt-3 px-4 py-2 bg-accent text-accent-foreground text-xs font-bold rounded-full"
          >
            Réessayer
          </button>
        </div>
      )}

      {!loading && !error && articles.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Newspaper className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Aucune actualité trouvée</p>
        </div>
      )}

      {!loading && !error && articles.map((article, i) => (
        <a
          key={`${article.url}-${i}`}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mx-4 mb-3 bg-card rounded-2xl border border-border overflow-hidden hover:border-accent/40 transition-colors"
        >
          {article.image && (
            <div className="relative">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-44 object-cover"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {i === 0 && (
                <div className="absolute top-3 left-3">
                  <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-destructive text-white text-[10px] font-bold rounded-full">
                    <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                    NOUVEAU
                  </span>
                </div>
              )}
            </div>
          )}

          <div className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-accent uppercase tracking-wide">
                {article.source.name}
              </span>
              <span className="text-muted-foreground">•</span>
              <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                <Clock className="w-3 h-3" />
                {formatDate(article.publishedAt)}
              </div>
            </div>

            <h3 className="text-sm font-bold text-foreground leading-snug mb-2 line-clamp-2">
              {article.title}
            </h3>

            {article.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {article.description}
              </p>
            )}

            <div className="flex items-center gap-1 text-accent text-xs font-semibold">
              <span>Lire l'article</span>
              <ExternalLink className="w-3 h-3" />
            </div>
          </div>
        </a>
      ))}
    </div>
  );
};

export default NewsTab;
