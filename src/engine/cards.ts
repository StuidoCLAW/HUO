/**
 * Cards are represented as integers 0..51.
 * rank = card >> 2  (0=2, 1=3, ..., 12=A)
 * suit = card & 3   (0=spades, 1=hearts, 2=diamonds, 3=clubs)
 *
 * This matches the ordering used in the Python sim and makes hand
 * evaluation fast via bitwise operations.
 */

export type Card = number;

export const RANK_NAMES = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'] as const;
export const SUIT_NAMES = ['s', 'h', 'd', 'c'] as const;
export const SUIT_SYMBOLS = ['♠', '♥', '♦', '♣'] as const;

export function rankOf(c: Card): number {
  return c >> 2;
}

export function suitOf(c: Card): number {
  return c & 3;
}

export function cardName(c: Card): string {
  return RANK_NAMES[rankOf(c)] + SUIT_NAMES[suitOf(c)];
}

export function cardDisplay(c: Card): string {
  return RANK_NAMES[rankOf(c)] + SUIT_SYMBOLS[suitOf(c)];
}

export function makeDeck(): Card[] {
  const deck: Card[] = [];
  for (let i = 0; i < 52; i++) deck.push(i);
  return deck;
}
