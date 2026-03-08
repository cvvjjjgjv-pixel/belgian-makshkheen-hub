import { useState, useRef } from "react";
import { Smile, X } from "lucide-react";

const EMOJI_LIST = [
  "😀", "😂", "🤣", "😍", "🥰", "😘", "😎", "🤩", "🥳", "😇",
  "🙏", "💪", "🔥", "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤",
  "⚽", "🏆", "🥇", "🎉", "🎊", "👏", "✌️", "🤝", "👊", "✊",
  "🇹🇳", "🔴", "🟡", "⭐", "🌟", "💥", "💫", "🎯", "🦅", "🏟️",
  "😢", "😭", "😡", "🤬", "😤", "🫡", "🫶", "🤲", "👀", "💀",
  "😈", "👑", "💎", "🎶", "🎵", "📣", "📢", "🚀", "💯", "⚡",
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

const EmojiPicker = ({ onSelect, onClose }: EmojiPickerProps) => {
  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 mx-3 bg-card border border-border rounded-2xl p-3 shadow-lg z-10">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-foreground">Emojis</span>
        <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
      </div>
      <div className="grid grid-cols-10 gap-1 max-h-[200px] overflow-y-auto">
        {EMOJI_LIST.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded-lg transition-colors"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
};

export default EmojiPicker;
