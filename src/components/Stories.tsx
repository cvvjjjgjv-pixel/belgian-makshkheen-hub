import { Plus } from "lucide-react";

const stories = [
  { name: "Votre story", img: "https://i.pravatar.cc/150?img=68", isYou: true },
  { name: "Ahmed_BXL", img: "https://i.pravatar.cc/150?img=1" },
  { name: "Karim_EST", img: "https://i.pravatar.cc/150?img=2" },
  { name: "Makshakh_01", img: "https://i.pravatar.cc/150?img=3", seen: true },
  { name: "Tunisien_Bel", img: "https://i.pravatar.cc/150?img=4" },
  { name: "Ultra_Rouge", img: "https://i.pravatar.cc/150?img=5" },
];

const Stories = () => {
  return (
    <div className="flex gap-3 overflow-x-auto scrollbar-hide px-4 py-4">
      {stories.map((story, i) => (
        <button key={i} className="flex flex-col items-center gap-1 flex-shrink-0">
          <div
            className={`w-[72px] h-[72px] rounded-full p-[3px] ${
              story.seen ? "bg-muted" : "story-ring-gradient"
            } relative`}
          >
            <img
              src={story.img}
              alt={story.name}
              className="w-full h-full rounded-full object-cover border-2 border-background"
            />
            {story.isYou && (
              <div className="absolute bottom-0 right-0 w-5 h-5 bg-accent rounded-full flex items-center justify-center border-2 border-background">
                <Plus className="w-3 h-3 text-accent-foreground" />
              </div>
            )}
          </div>
          <span className="text-[11px] text-secondary-foreground max-w-[70px] truncate">
            {story.name}
          </span>
        </button>
      ))}
    </div>
  );
};

export default Stories;
