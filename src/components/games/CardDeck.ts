// Tunisian/Italian-style deck (40 cards) for Chkobba
// Suits: Denari (coins), Coppe (cups), Spade (swords), Bastoni (clubs)
export type Suit = "denari" | "coppe" | "spade" | "bastoni";
export type CardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface Card {
  suit: Suit;
  value: CardValue;
  id: string;
}

export const SUIT_SYMBOLS: Record<Suit, string> = {
  denari: "🪙",
  coppe: "🏆",
  spade: "⚔️",
  bastoni: "🏑",
};

export const SUIT_COLORS: Record<Suit, string> = {
  denari: "text-yellow-400",
  coppe: "text-blue-400",
  spade: "text-slate-300",
  bastoni: "text-green-400",
};

export const VALUE_LABELS: Record<number, string> = {
  1: "A",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
  6: "6",
  7: "7",
  8: "F", // Fante
  9: "C", // Cavallo
  10: "R", // Re
};

export function createDeck(): Card[] {
  const suits: Suit[] = ["denari", "coppe", "spade", "bastoni"];
  const deck: Card[] = [];
  for (const suit of suits) {
    for (let v = 1; v <= 10; v++) {
      deck.push({ suit, value: v as CardValue, id: `${suit}-${v}` });
    }
  }
  return deck;
}

export function shuffleDeck(deck: Card[]): Card[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Standard 52-card deck for Rami
export type StandardSuit = "hearts" | "diamonds" | "clubs" | "spades";
export type StandardValue = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13;

export interface StandardCard {
  suit: StandardSuit;
  value: StandardValue;
  id: string;
}

export const STANDARD_SUIT_SYMBOLS: Record<StandardSuit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

export const STANDARD_SUIT_COLORS: Record<StandardSuit, string> = {
  hearts: "text-red-500",
  diamonds: "text-red-500",
  clubs: "text-foreground",
  spades: "text-foreground",
};

export const STANDARD_VALUE_LABELS: Record<number, string> = {
  1: "A", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6", 7: "7",
  8: "8", 9: "9", 10: "10", 11: "J", 12: "Q", 13: "K",
};

export function createStandardDeck(): StandardCard[] {
  const suits: StandardSuit[] = ["hearts", "diamonds", "clubs", "spades"];
  const deck: StandardCard[] = [];
  for (const suit of suits) {
    for (let v = 1; v <= 13; v++) {
      deck.push({ suit, value: v as StandardValue, id: `${suit}-${v}` });
    }
  }
  return deck;
}

export function createDoubleDeck(): StandardCard[] {
  return [...createStandardDeck().map(c => ({ ...c, id: c.id + "-a" })), ...createStandardDeck().map(c => ({ ...c, id: c.id + "-b" }))];
}

export function shuffleStandardDeck(deck: StandardCard[]): StandardCard[] {
  const shuffled = [...deck];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
