import { MessageSquare, Pin, Flame, Sparkles } from "lucide-react";

const topics = [
  {
    title: "Pronostics EST vs Al Ahly - Donnez vos scores!",
    author: "Admin_MKB",
    avatar: "https://i.pravatar.cc/150?img=10",
    badge: "HOT",
    badgeClass: "bg-destructive/20 text-destructive",
    replies: 127,
    time: "Il y a 2h",
  },
  {
    title: "Organisation du déplacement vers Tunis - Infos",
    author: "Cellule_BXL",
    avatar: "https://i.pravatar.cc/150?img=11",
    badge: "ÉPINGLÉ",
    badgeClass: "bg-accent/20 text-accent",
    replies: 89,
    time: "Il y a 5h",
  },
  {
    title: "Nouveau tifo pour la prochaine rencontre",
    author: "Ultra_Creator",
    avatar: "https://i.pravatar.cc/150?img=12",
    badge: "NOUVEAU",
    badgeClass: "bg-green-500/20 text-green-500",
    replies: 34,
    time: "Il y a 8h",
  },
  {
    title: "Les meilleurs moments de la saison 2024",
    author: "Historien_EST",
    avatar: "https://i.pravatar.cc/150?img=13",
    replies: 56,
    time: "Hier",
  },
];

const ForumTab = () => {
  return (
    <div className="pb-4">
      <div className="p-4">
        <h2 className="text-xl font-bold flex items-center gap-2 text-foreground">
          <MessageSquare className="w-5 h-5 text-accent" />
          Forum
        </h2>
      </div>

      {topics.map((topic, i) => (
        <div key={i} className="mx-4 mb-3 p-4 rounded-2xl bg-card border border-border">
          <div className="flex items-center gap-2 mb-3">
            <img src={topic.avatar} alt={topic.author} className="w-8 h-8 rounded-full object-cover" />
            <span className="text-xs font-medium text-muted-foreground">{topic.author}</span>
            <span className="text-xs text-muted-foreground">• {topic.time}</span>
            {topic.badge && (
              <span className={`ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${topic.badgeClass}`}>
                {topic.badge}
              </span>
            )}
          </div>
          <h3 className="text-sm font-bold text-foreground mb-3">{topic.title}</h3>
          <div className="flex items-center gap-1 text-muted-foreground text-xs">
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{topic.replies} réponses</span>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ForumTab;
