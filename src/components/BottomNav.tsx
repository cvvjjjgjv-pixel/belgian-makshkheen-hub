import { Home, Tv, MessageSquare, Users, User, Newspaper, Radio } from "lucide-react";
import { motion } from "framer-motion";

type Tab = "accueil" | "tv" | "live" | "news" | "forum" | "chat" | "profil";

interface BottomNavProps {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
}

const tabs: { id: Tab; icon: typeof Home; label: string }[] = [
  { id: "accueil", icon: Home, label: "Accueil" },
  { id: "tv", icon: Tv, label: "TV" },
  { id: "live", icon: Radio, label: "Live" },
  { id: "news", icon: Newspaper, label: "Actus" },
  { id: "forum", icon: Users, label: "Forum" },
  { id: "chat", icon: MessageSquare, label: "Chat" },
  { id: "profil", icon: User, label: "Profil" },
];

const BottomNav = ({ activeTab, onTabChange }: BottomNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-accent/30 z-50 pb-[env(safe-area-inset-bottom)]">
      <div className="flex max-w-lg mx-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex-1 flex flex-col items-center py-2 relative transition-colors ${
                isActive ? "text-accent" : "text-muted-foreground"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[3px] bg-accent rounded-b"
                />
              )}
              <Icon className={`w-5 h-5 ${tab.id === "live" && !isActive ? "text-destructive" : ""}`} />
              <span className={`text-[10px] mt-1 font-medium ${tab.id === "live" && !isActive ? "text-destructive" : ""}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
