import { describe, expect, it } from 'vitest';
import popularSections from '@/utils/popularSongs';

const songs = (n) => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));
const ids = (list) => list.map((s) => s.id);

describe('popularSections', () => {
  it('shows nothing for tags with three songs or fewer', () => {
    expect(popularSections(songs(3), 3)).toEqual({ cards: [], ranked: [] });
  });

  it('shows only the cards for small tags', () => {
    const { cards, ranked } = popularSections(songs(8), 8);
    expect(ids(cards)).toEqual([1, 2, 3]);
    expect(ranked).toEqual([]);
  });

  it('shows nine songs in all for large tags', () => {
    const { cards, ranked } = popularSections(songs(9), 74);
    expect(ids(cards)).toEqual([1, 2, 3]);
    expect(ids(ranked)).toEqual([4, 5, 6, 7, 8, 9]);
  });

  it('keeps the ranked rows even', () => {
    expect(ids(popularSections(songs(8), 11).ranked)).toEqual([4, 5, 6, 7]);
  });
});
