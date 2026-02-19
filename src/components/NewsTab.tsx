import { useEffect, useState } from "react";
import { Newspaper, ExternalLink, Clock, RefreshCw } from "lucide-react";

interface Article {
  title: string;
  description: string;
  content: string;
  url: string;
  image: string | null;
  publishedAt: string;
  source: {
    name: string;
    url: string;
  };
}

const GNEWS_API_KEY = import.meta.env.VITE_GNEWS_API_KEY;

const NewsTab = () => {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `https://gnews.io/api/v4/search?q=EST+Tunis+OR+Espérance+Sportive+Tunis+OR+مكشخين&lang=fr&country=any&max=10&apikey=${GNEWS_API_KEY}`
      );
      if (!res.ok) throw new Error("Erreur de chargement des actualités");
      const data = await res.json();
      setArticles(data.articles || []);
    } catch (err) {
      setError("Impossible de charger les actualités. Vérifie ta clé API GNews.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchNews();
  }, []);

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
        <button
          onClick={() => fetchNews(true)}
          disabled={refreshing}
          className="p-2 rounded-full bg-card border border-border text-muted-foreground hover:text-accent transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Loading skeleton */}
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

      {/* Error state */}
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

      {/* Articles list */}
      {!loading && !error && articles.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Newspaper className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-sm">Aucune actualité trouvée</p>
        </div>
      )}

      {!loading && articles.map((article, i) => (
        <a
          key={i}
          href={article.url}
          target="_blank"
          rel="noopener noreferrer"
          className="block mx-4 mb-3 bg-card rounded-2xl border border-border overflow-hidden hover:border-accent/40 transition-colors"
        >
          {/* Featured image */}
          {article.image && (
            <div className="relative">
              <img
                src={article.image}
                alt={article.title}
                className="w-full h-44 object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              {/* Live-style overlay for first article */}
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
            {/* Source + time */}
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

            {/* Title */}
            <h3 className="text-sm font-bold text-foreground leading-snug mb-2 line-clamp-2">
              {article.title}
            </h3>

            {/* Description */}
            {article.description && (
              <p className="text-xs text-muted-foreground line-clamp-2 mb-3">
                {article.description}
              </p>
            )}

            {/* Read more */}
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
