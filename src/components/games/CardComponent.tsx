import { motion } from "framer-motion";
import { SUIT_SYMBOLS, SUIT_COLORS, VALUE_LABELS, type Card } from "./CardDeck";
import { STANDARD_SUIT_SYMBOLS, STANDARD_SUIT_COLORS, STANDARD_VALUE_LABELS, type StandardCard } from "./CardDeck";

interface CardComponentProps {
  card: Card | StandardCard;
  onClick?: () => void;
  selected?: boolean;
  faceDown?: boolean;
  size?: "sm" | "md";
  type?: "tunisian" | "standard";
}

const CardComponent = ({ card, onClick, selected, faceDown, size = "md", type = "tunisian" }: CardComponentProps) => {
  const w = size === "sm" ? "w-10 h-14" : "w-14 h-20";

  if (faceDown) {
    return (
      <div className={`${w} rounded-lg bg-gradient-to-br from-accent/60 to-accent/30 border-2 border-accent/40 flex items-center justify-center shadow-md`}>
        <span className="text-lg">🂠</span>
      </div>
    );
  }

  const isTunisian = type === "tunisian";
  const suitSymbol = isTunisian
    ? SUIT_SYMBOLS[(card as Card).suit]
    : STANDARD_SUIT_SYMBOLS[(card as StandardCard).suit];
  const suitColor = isTunisian
    ? SUIT_COLORS[(card as Card).suit]
    : STANDARD_SUIT_COLORS[(card as StandardCard).suit];
  const valueLabel = isTunisian
    ? VALUE_LABELS[card.value]
    : STANDARD_VALUE_LABELS[card.value];

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={`${w} rounded-lg bg-card border-2 ${
        selected ? "border-accent shadow-lg shadow-accent/30 -translate-y-2" : "border-border"
      } flex flex-col items-center justify-center shadow-md cursor-pointer transition-all hover:border-accent/50 relative`}
    >
      <span className={`font-black ${size === "sm" ? "text-xs" : "text-sm"} ${suitColor}`}>
        {valueLabel}
      </span>
      <span className={size === "sm" ? "text-sm" : "text-lg"}>{suitSymbol}</span>
    </motion.button>
  );
};

export default CardComponent;
