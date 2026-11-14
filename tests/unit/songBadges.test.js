import { describe, expect, it } from 'vitest';
import songBadges, { hasPlayAlong } from '@/utils/songBadges';

const song = (extra = {}) => ({ id: 1, title: 'X', songTop: { visitsWeekly: 81 }, tags: [], ...extra });

describe('songBadges', () => {
  it('marks only top ranks with real traffic as popular', () => {
    expect(songBadges(song(), { rank: 1 })).toEqual(['popular']);
    expect(songBadges(song(), { rank: 4 })).toEqual([]);
    expect(songBadges(song({ songTop: { visitsWeekly: 4 } }), { rank: 2 })).toEqual([]);
    expect(songBadges(song({ songTop: null }), { rank: 1 })).toEqual([]);
    expect(songBadges(song())).toEqual([]);
  });

  it('marks songs with a synced chord timeline', () => {
    const timed = song({ chordTimeline: { segments: [{ start: 0, end: 1, label: 'A' }] } });
    expect(hasPlayAlong(timed)).toBe(true);
    expect(hasPlayAlong(song({ chordTimeline: { segments: [] } }))).toBe(false);
    expect(songBadges(timed)).toEqual(['playAlong']);
  });

  it("marks lyrics-only songs by the site's no-chords tag", () => {
    const lyricsOnly = song({ tags: [{ id: 22, title: 'Bez Akordiem ' }] });
    expect(songBadges(lyricsOnly, { noChordsTag: 'bez akordiem' })).toEqual(['noChords']);
    expect(songBadges(lyricsOnly, { noChordsTag: '' })).toEqual([]);
  });

  it('combines badges in a stable order', () => {
    const all = song({
      chordTimeline: { segments: [{ start: 0, end: 1, label: 'A' }] },
      tags: [{ title: 'bez akordiem' }],
    });
    expect(songBadges(all, { rank: 1, noChordsTag: 'bez akordiem' })).toEqual([
      'popular',
      'playAlong',
      'noChords',
    ]);
  });
});
