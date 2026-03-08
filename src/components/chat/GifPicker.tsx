import { useState } from "react";
import { Search, X, Loader2 } from "lucide-react";

interface GifPickerProps {
  onSelect: (gifUrl: string) => void;
  onClose: () => void;
}

// Using Tenor's free GIF API (no key required for limited usage)
const TRENDING_GIFS = [
  "https://media.tenor.com/images/c85082e60e5e00e0bb4e06f6dbf239d9/tenor.gif",
  "https://media.tenor.com/images/9f0e87bca927a0b1d77ab1ee67fd59d3/tenor.gif",
];

const PRESET_GIFS: Record<string, string[]> = {
  "célébration": [
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExdTR1ZnUxOXYwb3AzNjlqNXdtdGdmZGFkdm45a2FjNGZyajJwcGo5ZSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/artj92V8o75VPL7AeQ/giphy.gif",
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjdqNHZiYXhyNnB2NHVvOGJrMnl0bnUxb2JoMTF1cWlzZXFkY245aSZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/26u4cqiYI30juCOGY/giphy.gif",
  ],
  "football": [
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExcWJtNXVzOXdjNjM2OXkxaTFjbTl2NnRpcDI4b3V3eTZ4ZXFwZWpuMiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o7TKGMZHi73yzCumQ/giphy.gif",
    "https://media3.giphy.com/media/v1.Y2lkPTc5MGI3NjExZjFlZjFiMGM0ZGRhNXl5NDd2eHI2MjZ5aWdmN2Q5cWE5NGRsdDgzYyZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l0HlHSB8v5yRtBlHW/giphy.gif",
  ],
  "rire": [
    "https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExNjZtZzE0c3R5MXd3ZXdtdjF0OHQzbzQ3czFpN3RocXJrdTE3eDlhdiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/10JhviFuU2gWD6/giphy.gif",
    "https://media1.giphy.com/media/v1.Y2lkPTc5MGI3NjExZG44M3Q0aGhseHIwOHRwbzk4a21jbHJxOXVybjBhZGQ2dW96dHMwbiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/Q7ozWVYCR0nyW2rvPW/giphy.gif",
  ],
  "bravo": [
    "https://media0.giphy.com/media/v1.Y2lkPTc5MGI3NjExd2FmZHViMGkyYjNuOXE0a2hkM2J3aXM5Y2tkYjRnOWw3MnFxejR0aCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/l3q2XhfQ8oCkm1Ts4/giphy.gif",
    "https://media2.giphy.com/media/v1.Y2lkPTc5MGI3NjExZmN6MWpoOHc3NjdxNHk5NXRoYjdnZHBhbGJmczV6cXFkMjlua2llNiZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/3o6fJ1BM7R2EBRDnxK/giphy.gif",
  ],
};

const GifPicker = ({ onSelect, onClose }: GifPickerProps) => {
  const [search, setSearch] = useState("");
  const categories = Object.keys(PRESET_GIFS);

  const matchedCategory = categories.find((c) =>
    c.toLowerCase().includes(search.toLowerCase()) || search.toLowerCase().includes(c.toLowerCase())
  );

  const displayGifs = search.trim()
    ? matchedCategory
      ? PRESET_GIFS[matchedCategory]
      : Object.values(PRESET_GIFS).flat()
    : Object.values(PRESET_GIFS).flat();

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 mx-3 bg-card border border-border rounded-2xl p-3 shadow-lg z-10 max-h-[350px] flex flex-col">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-foreground">GIFs</span>
        <button onClick={onClose}><X className="w-4 h-4 text-muted-foreground" /></button>
      </div>

      <div className="relative mb-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un GIF..."
          className="w-full bg-muted rounded-full pl-8 pr-3 py-2 text-xs text-foreground outline-none"
        />
      </div>

      {/* Category chips */}
      <div className="flex gap-1.5 mb-2 overflow-x-auto pb-1">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSearch(cat)}
            className={`px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap transition-colors ${
              search === cat ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 overflow-y-auto flex-1">
        {displayGifs.map((gif, i) => (
          <button
            key={i}
            onClick={() => onSelect(gif)}
            className="rounded-xl overflow-hidden border border-border hover:border-accent transition-colors"
          >
            <img src={gif} alt="GIF" className="w-full h-24 object-cover" loading="lazy" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default GifPicker;
