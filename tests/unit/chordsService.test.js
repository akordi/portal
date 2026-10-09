import { describe, it, expect } from 'vitest';
import chordsService from '@/services/chordsService';

describe('chordsService.transpose', () => {
  it('wraps chords in <b> and transposes them', () => {
    expect(chordsService.transpose('Am   C\nlyrics', 2)).toBe('<b>Bm</b>   <b>D</b>\nlyrics');
  });

  it('escapes HTML tags in song text', () => {
    const out = chordsService.transpose('Am\nhello <br /> <img src=x onerror=alert(1)>', 0);
    expect(out).not.toContain('<img');
    expect(out).not.toContain('<br');
    expect(out).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('keeps HTML entities so quotes still render', () => {
    expect(chordsService.transpose('say &quot;hi&quot;', 0)).toBe('say &quot;hi&quot;');
  });

  it('does not report chords for a literal <b> in lyrics', () => {
    const out = chordsService.transpose('some <b>bold</b> lyrics', 0);
    expect(out).not.toContain('<b>');
    expect(chordsService.extractChords(out)).toEqual([]);
  });

  it('returns null and undefined bodies unchanged', () => {
    expect(chordsService.transpose(null, 0)).toBe(null);
    expect(chordsService.transpose(undefined, 0)).toBe(undefined);
  });
});
