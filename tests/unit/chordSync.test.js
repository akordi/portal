import { describe, expect, it } from 'vitest';

import {
  activeSegmentIndex,
  nextSegment,
  segmentProgress,
  segmentWindow,
  youtubeId,
} from '@/utils/chordSync';

describe('youtubeId', () => {
  it.each([
    ['https://www.youtube.com/watch?v=V4e_38Z9xDA', 'V4e_38Z9xDA'],
    ['https://youtu.be/V4e_38Z9xDA', 'V4e_38Z9xDA'],
    ['https://www.youtube.com/embed/V4e_38Z9xDA', 'V4e_38Z9xDA'],
    ['https://www.youtube.com/shorts/V4e_38Z9xDA', 'V4e_38Z9xDA'],
    ['https://www.youtube.com/watch?v=V4e_38Z9xDA&list=abc', 'V4e_38Z9xDA'],
  ])('extracts the id from %s', (url, id) => {
    expect(youtubeId(url)).toBe(id);
  });

  it('returns empty string when no id is present', () => {
    expect(youtubeId('')).toBe('');
    expect(youtubeId('https://example.com/watch')).toBe('');
    expect(youtubeId(null)).toBe('');
  });
});

describe('activeSegmentIndex', () => {
  const segments = [
    { start: 0, end: 2.5, label: 'C' },
    { start: 2.5, end: 5, label: 'G' },
    { start: 5, end: 7.5, label: 'Am' },
  ];

  it('returns -1 before the first segment starts', () => {
    expect(activeSegmentIndex(segments, -1)).toBe(-1);
  });

  it('matches a segment on its start (inclusive) and within its span', () => {
    expect(activeSegmentIndex(segments, 0)).toBe(0);
    expect(activeSegmentIndex(segments, 2.4)).toBe(0);
  });

  it('is end-exclusive: the boundary belongs to the next segment', () => {
    expect(activeSegmentIndex(segments, 2.5)).toBe(1);
    expect(activeSegmentIndex(segments, 5)).toBe(2);
  });

  it('keeps the last chord highlighted past the end', () => {
    expect(activeSegmentIndex(segments, 100)).toBe(2);
  });

  it('handles empty / non-array input', () => {
    expect(activeSegmentIndex([], 3)).toBe(-1);
    expect(activeSegmentIndex(undefined, 3)).toBe(-1);
  });
});

describe('nextSegment', () => {
  const segments = [
    { start: 0, end: 2.5, label: 'C' },
    { start: 2.5, end: 5, label: 'G' },
    { start: 5, end: 7.5, label: 'Am' },
  ];

  it('returns the following segment for a middle index', () => {
    expect(nextSegment(segments, 0)).toEqual({ start: 2.5, end: 5, label: 'G' });
    expect(nextSegment(segments, 1)).toEqual({ start: 5, end: 7.5, label: 'Am' });
  });

  it('returns null on the last segment', () => {
    expect(nextSegment(segments, 2)).toBeNull();
  });

  it('returns null when nothing is active or input is empty', () => {
    expect(nextSegment(segments, -1)).toBeNull();
    expect(nextSegment([], 0)).toBeNull();
    expect(nextSegment(undefined, 0)).toBeNull();
  });
});

describe('segmentProgress', () => {
  const segments = [{ start: 4, end: 8, label: 'C' }]; // 4s span

  it('is 0 at the start', () => {
    expect(segmentProgress(segments, 0, 4)).toBe(0);
  });

  it('is ~0.5 at the midpoint', () => {
    expect(segmentProgress(segments, 0, 6)).toBeCloseTo(0.5, 5);
  });

  it('is 1 at the end', () => {
    expect(segmentProgress(segments, 0, 8)).toBe(1);
  });

  it('clamps before the start and after the end', () => {
    expect(segmentProgress(segments, 0, 0)).toBe(0);
    expect(segmentProgress(segments, 0, 100)).toBe(1);
  });

  it('returns 0 for an invalid index', () => {
    expect(segmentProgress(segments, -1, 6)).toBe(0);
    expect(segmentProgress(segments, 5, 6)).toBe(0);
    expect(segmentProgress([], 0, 6)).toBe(0);
  });

  it('does not divide by zero for a zero-length segment', () => {
    const zero = [{ start: 3, end: 3, label: 'C' }];
    expect(segmentProgress(zero, 0, 2)).toBe(0);
    expect(segmentProgress(zero, 0, 3)).toBe(1);
  });
});

describe('segmentWindow', () => {
  const segments = Array.from({ length: 10 }, (_, i) => ({
    start: i,
    end: i + 1,
    label: `c${i}`,
  }));

  it('centres a window around the active index', () => {
    const win = segmentWindow(segments, 4, { before: 1, after: 2 });
    expect(win.items.map((it) => it.index)).toEqual([3, 4, 5, 6]);
    expect(win.start).toBe(3);
    expect(win.end).toBe(7);
  });

  it('clamps at the song start', () => {
    const win = segmentWindow(segments, 0, { before: 3, after: 2 });
    expect(win.items.map((it) => it.index)).toEqual([0, 1, 2]);
    expect(win.start).toBe(0);
    expect(win.end).toBe(3);
  });

  it('clamps at the song end', () => {
    const win = segmentWindow(segments, 9, { before: 2, after: 3 });
    expect(win.items.map((it) => it.index)).toEqual([7, 8, 9]);
    expect(win.start).toBe(7);
    expect(win.end).toBe(10);
  });

  it('anchors at the start when nothing is active yet', () => {
    const win = segmentWindow(segments, -1, { before: 1, after: 2 });
    expect(win.items.map((it) => it.index)).toEqual([0, 1, 2]);
  });

  it('returns the whole list when it is smaller than the window', () => {
    const few = segments.slice(0, 2);
    const win = segmentWindow(few, 0, { before: 1, after: 5 });
    expect(win.items.map((it) => it.index)).toEqual([0, 1]);
    expect(win.start).toBe(0);
    expect(win.end).toBe(2);
  });

  it('handles empty input', () => {
    expect(segmentWindow([], 0)).toEqual({ items: [], start: 0, end: 0 });
    expect(segmentWindow(undefined, 0)).toEqual({ items: [], start: 0, end: 0 });
  });
});
