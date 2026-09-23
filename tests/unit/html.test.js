import { describe, it, expect } from 'vitest';
import {
  escapeHtml,
  sanitizeHighlight,
  searchResultTitleHtml,
  searchResultDescriptionHtml,
} from '@/utils/html';

const XSS = '<img src=x onerror=alert(1)>';

describe('escapeHtml', () => {
  it('escapes & < > " \'', () => {
    expect(escapeHtml(`&<>"'`)).toBe('&amp;&lt;&gt;&quot;&#39;');
  });

  it('neutralizes markup', () => {
    expect(escapeHtml(XSS)).toBe('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('escapes existing entities too (plain text is literal)', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });

  it('returns "" for null/undefined', () => {
    expect(escapeHtml(null)).toBe('');
    expect(escapeHtml(undefined)).toBe('');
  });
});

describe('sanitizeHighlight', () => {
  it('keeps <em> and <mark> tags', () => {
    expect(sanitizeHighlight('a <em>b</em> <mark>c</mark>')).toBe('a <em>b</em> <mark>c</mark>');
  });

  it('escapes any other tag', () => {
    expect(sanitizeHighlight(`<em>x</em>${XSS}`)).toBe(
      '<em>x</em>&lt;img src=x onerror=alert(1)&gt;'
    );
    expect(sanitizeHighlight('<em onmouseover=alert(1)>x</em>')).toBe(
      '&lt;em onmouseover=alert(1)&gt;x</em>'
    );
    expect(sanitizeHighlight('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('does not double-escape valid entities', () => {
    expect(sanitizeHighlight('&lt;3 &amp; <em>&quot;x&quot;</em> &#39; &#x27;')).toBe(
      '&lt;3 &amp; <em>&quot;x&quot;</em> &#39; &#x27;'
    );
  });

  it('escapes stray < > and bare &', () => {
    expect(sanitizeHighlight('<3 & a > b &foo bar')).toBe('&lt;3 &amp; a &gt; b &amp;foo bar');
  });

  it('returns "" for null/undefined', () => {
    expect(sanitizeHighlight(null)).toBe('');
  });
});

describe('search result html', () => {
  it('escapes raw title/artist when there are no highlights', () => {
    const song = { title: XSS, mainArtistTitle: 'A & B', '@search.highlights': {} };
    expect(searchResultTitleHtml(song)).toBe(
      'A &amp; B - &lt;img src=x onerror=alert(1)&gt;'
    );
    expect(searchResultDescriptionHtml(song)).toBe('');
  });

  it('sanitizes highlights, keeping <em>', () => {
    const song = {
      title: 'ignored',
      mainArtistTitle: 'Band',
      '@search.highlights': {
        title: [`<em>Love</em> ${XSS}`],
        bodyLyrics: ['I <em>love</em> you &lt;3 <3'],
      },
    };
    expect(searchResultTitleHtml(song)).toBe(
      'Band - <em>Love</em> &lt;img src=x onerror=alert(1)&gt;'
    );
    expect(searchResultDescriptionHtml(song)).toBe('I <em>love</em> you &lt;3 &lt;3');
  });

  it('tolerates a missing highlights object', () => {
    expect(searchResultTitleHtml({ title: 'T', mainArtistTitle: 'A' })).toBe('A - T');
  });
});
