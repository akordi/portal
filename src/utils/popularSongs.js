export const TOP_CARDS = 3;
export const POPULAR_COUNT = 9;
// Smaller tags show just the cards; their full list is short anyway.
const RANKED_LIST_MIN_SONGS = 10;

/**
 * Splits a tag's most visited songs into the top cards and the ranked rows
 * after them. The rows come in an even number so the two-column list has no
 * empty slot.
 */
export default function popularSections(popular, total) {
  if (total <= TOP_CARDS) return { cards: [], ranked: [] };
  const cards = popular.slice(0, TOP_CARDS);
  if (total <= RANKED_LIST_MIN_SONGS) return { cards, ranked: [] };
  const rest = popular.slice(TOP_CARDS, POPULAR_COUNT);
  return { cards, ranked: rest.slice(0, rest.length - (rest.length % 2)) };
}
