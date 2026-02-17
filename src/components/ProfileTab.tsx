import { Settings, ChevronRight, Trophy, Heart, MessageSquare, Star } from "lucide-react";

const ProfileTab = () => {
  return (
    <div className="pb-4">
      {/* Profile Header */}
      <div className="p-6 text-center">
        <div className="w-24 h-24 rounded-full mx-auto mb-3 story-ring-gradient p-[3px]">
          <img
            src="https://i.pravatar.cc/150?img=68"
            alt="Profile"
            className="w-full h-full rounded-full object-cover border-2 border-background"
          />
        </div>
        <h2 className="text-lg font-bold text-foreground">Makshakh_User</h2>
        <p className="text-sm text-muted-foreground">Membre depuis 2023</p>
        <div className="flex justify-center gap-8 mt-4">
          <div className="text-center">
            <p className="text-lg font-bold text-accent">127</p>
            <p className="text-xs text-muted-foreground">Posts</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-accent">1.2K</p>
            <p className="text-xs text-muted-foreground">Followers</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-accent">456</p>
            <p className="text-xs text-muted-foreground">Following</p>
          </div>
        </div>
      </div>

      {/* Menu */}
      <div className="px-4 space-y-2">
        {[
          { icon: Heart, label: "Mes favoris", count: "23" },
          { icon: Trophy, label: "Classement", count: "Top 10" },
          { icon: MessageSquare, label: "Mes commentaires", count: "89" },
          { icon: Star, label: "Badges", count: "5" },
          { icon: Settings, label: "Paramètres" },
        ].map((item, i) => (
          <button
            key={i}
            className="w-full flex items-center gap-3 p-4 rounded-2xl bg-card border border-border hover:bg-secondary transition-colors"
          >
            <item.icon className="w-5 h-5 text-accent" />
            <span className="flex-1 text-left text-sm font-medium text-foreground">{item.label}</span>
            {item.count && <span className="text-xs text-muted-foreground">{item.count}</span>}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default ProfileTab;
