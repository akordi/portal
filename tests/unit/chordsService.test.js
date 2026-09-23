import { describe, it, expect } from 'vitest';
import chordsService from '@/services/chordsService';

const XSS = '<img src=x onerror=alert(1)>';

// Parses the markup the way v-html would and returns the elements it created.
function render(html) {
  const el = document.createElement('div');
  el.innerHTML = html;
  return el;
}

describe('chordsService.transpose', () => {
  it('wraps chords in <b> and transposes them', () => {
    const html = chordsService.transpose('C G\nHello world', 2);
    expect(html).toBe('<b>D</b> <b>A</b>\nHello world');
  });

  it('escapes HTML in lyrics', () => {
    const html = chordsService.transpose(`C Am\n${XSS} hello`, 0);
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
    const el = render(html);
    expect(el.querySelector('img')).toBeNull();
    expect(el.querySelectorAll('b')).toHaveLength(2);
    expect(el.textContent).toContain(XSS);
  });

  it('keeps "<3" lyrics as literal text', () => {
    const html = chordsService.transpose('G\nI <3 you & "me"', 0);
    expect(html).toBe('<b>G</b>\nI &lt;3 you &amp; &quot;me&quot;');
    expect(render(html).textContent).toBe('G\nI <3 you & "me"');
  });

  it('escapes the body when transposing fails', () => {
    const html = chordsService.transpose(`${XSS} <3`, Number.NaN);
    // Whatever the transposer does with NaN, nothing may render as markup.
    const el = render(html);
    expect(el.querySelector('img')).toBeNull();
    expect(el.textContent).toContain(XSS);
  });

  it('escapes the body in the catch path', () => {
    const html = chordsService.transpose({ toString: () => XSS }, 0);
    expect(html).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });
});

describe('chordsService.extractChords', () => {
  it('returns unique, unescaped chord names', () => {
    const html = chordsService.transpose('C G C\nla', 0);
    expect(chordsService.extractChords(html)).toEqual(['C', 'G']);
  });
});
