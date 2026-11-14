import { describe, expect, it } from 'vitest';
import songSummary from '@/utils/songSummary';

describe('songSummary', () => {
  it('keeps only what lists render', () => {
    const full = {
      id: 7,
      title: 'Klusa nakts',
      url: '/song/7-K',
      body: 'long chords',
      mainArtist: { id: 1, title: 'Franz Xaver Gruber', url: '/band/1-F' },
      songTop: { visitsWeekly: 25 },
      youtubeLink: 'abc',
      chordTimeline: { segments: [{ start: 0, end: 1, label: 'A' }] },
      tags: [{ id: 4, title: 'ziemassvētku' }],
    };
    expect(songSummary(full)).toEqual({
      id: 7,
      title: 'Klusa nakts',
      url: '/song/7-K',
      artist: 'Franz Xaver Gruber',
      youtubeLink: 'abc',
      weeklyVisits: 25,
      playAlong: true,
    });
  });

  it('copes with missing optional data', () => {
    expect(songSummary({ id: 1, title: 'X', url: '/song/1-X' })).toMatchObject({
      artist: '',
      youtubeLink: '',
      weeklyVisits: 0,
      playAlong: false,
    });
  });

  it('offers play-along only for a timeline with real chords', () => {
    const timed = (labels) => ({
      id: 1,
      title: 'X',
      url: '/song/1-X',
      chordTimeline: { segments: labels.map((label, i) => ({ start: i, end: i + 1, label })) },
    });
    expect(songSummary(timed(['N'])).playAlong).toBe(false);
    expect(songSummary(timed(['N', 'N.C.'])).playAlong).toBe(false);
    expect(songSummary(timed(['N', 'Am'])).playAlong).toBe(true);
  });
});
