import { describe, it, expect } from 'vitest';
import chordsService from '@/services/chordsService';

describe('chordsService.transpose', () => {
  it('transposes H chords and keeps H spelling', () => {
    expect(chordsService.transpose('Hm G D A', 2)).toBe('<b>C#m</b> <b>A</b> <b>E</b> <b>H</b>');
    expect(chordsService.transpose('Hm G D A', 0)).toBe('<b>Hm</b> <b>G</b> <b>D</b> <b>A</b>');
  });

  it('handles H as a slash bass and in brackets', () => {
    expect(chordsService.transpose('[E/H]la', 1)).toBe('[<b>F/C</b>]la');
  });

  it('leaves lyrics starting with H untouched', () => {
    expect(chordsService.transpose('H7\nHello Hm', 0)).toBe('<b>H7</b>\nHello <b>Hm</b>');
  });

  it('keeps B spelling for songs without H', () => {
    expect(chordsService.transpose('A E', 2)).toBe('<b>B</b> <b>F#</b>');
  });
});
