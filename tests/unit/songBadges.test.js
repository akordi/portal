import { describe, expect, it } from 'vitest';
import songBadges from '@/utils/songBadges';

const song = (extra = {}) => ({ id: 1, weeklyVisits: 81, playAlong: false, ...extra });

describe('songBadges', () => {
  it('marks only top ranks with real traffic as popular', () => {
    expect(songBadges(song(), 1)).toEqual(['popular']);
    expect(songBadges(song(), 4)).toEqual([]);
    expect(songBadges(song({ weeklyVisits: 4 }), 2)).toEqual([]);
    expect(songBadges(song())).toEqual([]);
  });

  it('marks songs with a synced chord timeline', () => {
    expect(songBadges(song({ playAlong: true }))).toEqual(['playAlong']);
    expect(songBadges(song({ playAlong: true }), 1)).toEqual(['popular', 'playAlong']);
  });
});
