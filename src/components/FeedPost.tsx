import { useState } from "react";
import { Heart, MessageCircle, Send, Bookmark, MoreHorizontal, Play } from "lucide-react";

interface FeedPostProps {
  username: string;
  avatar: string;
  time: string;
  location: string;
  image: string;
  caption: string;
  hashtags: string;
  likes: string;
  comments: string;
  isLiked?: boolean;
  isVideo?: boolean;
  duration?: string;
}

const FeedPost = ({
  username, avatar, time, location, image, caption, hashtags,
  likes, comments, isLiked: initialLiked = false, isVideo = false, duration,
}: FeedPostProps) => {
  const [liked, setLiked] = useState(initialLiked);
  const [saved, setSaved] = useState(false);

  return (
    <div className="mx-4 mt-4 rounded-2xl overflow-hidden bg-card border border-border">
      {/* Header */}
      <div className="flex items-center p-3 gap-3">
        <img src={avatar} alt={username} className="w-10 h-10 rounded-full border-2 border-accent object-cover" />
        <div className="flex-1 min-w-0">
          <h4 className="font-bold text-sm text-foreground truncate">{username}</h4>
          <p className="text-xs text-muted-foreground">{time} • {location}</p>
        </div>
        <button className="text-muted-foreground">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Image/Video */}
      <div className="relative">
        <img src={image} alt="Post" className={`w-full ${isVideo ? "aspect-video" : "aspect-[4/3]"} object-cover`} />
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/30">
            <div className="w-16 h-16 rounded-full bg-accent/90 flex items-center justify-center">
              <Play className="w-7 h-7 text-accent-foreground ml-1" />
            </div>
          </div>
        )}
        {isVideo && duration && (
          <div className="absolute bottom-3 right-3 px-2 py-0.5 bg-background/70 rounded text-xs font-bold text-foreground">
            {duration}
          </div>
        )}
      </div>

      {/* Content & Actions */}
      <div className="p-3">
        <p className="text-sm mb-2 text-foreground">
          {caption} <span className="text-accent">{hashtags}</span>
        </p>
        <div className="flex justify-between items-center">
          <div className="flex gap-5">
            <button onClick={() => setLiked(!liked)} className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-destructive" : "text-secondary-foreground"}`}>
              <Heart className={`w-5 h-5 ${liked ? "fill-current" : ""}`} />
              <span>{likes}</span>
            </button>
            <button className="flex items-center gap-1.5 text-sm text-secondary-foreground">
              <MessageCircle className="w-5 h-5" />
              <span>{comments}</span>
            </button>
            <button className="text-secondary-foreground">
              <Send className="w-5 h-5" />
            </button>
          </div>
          <button onClick={() => setSaved(!saved)} className={`transition-colors ${saved ? "text-accent" : "text-secondary-foreground"}`}>
            <Bookmark className={`w-5 h-5 ${saved ? "fill-current" : ""}`} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default FeedPost;
