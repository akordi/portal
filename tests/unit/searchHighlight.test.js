import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

import SearchHighlight from '@/components/SearchHighlight.vue';
import { firstHighlight, parseHighlight } from '@/utils/searchHighlight';

const XSS = '<img src=x onerror="window.__xss=1">';
// What the API sends for XSS: Go's html.EscapeString
const XSS_ESCAPED = '&lt;img src=x onerror=&#34;window.__xss=1&#34;&gt;';

const marks = (wrapper) => wrapper.findAll('mark').map((mark) => mark.text());

// lx-ui exports LxSearchableText as an async component; wait for it to load.
async function mountFallback(props) {
  const wrapper = mount(SearchHighlight, { props });
  await vi.waitFor(() => expect(wrapper.text()).not.toBe(''));
  return wrapper;
}

describe('parseHighlight', () => {
  it('splits a fragment into plain and marked segments', () => {
    expect(parseHighlight('<mark>Saule</mark>, <mark>Pērkons</mark>, Daugava')).toEqual([
      { text: 'Saule', marked: true },
      { text: ', ', marked: false },
      { text: 'Pērkons', marked: true },
      { text: ', Daugava', marked: false },
    ]);
  });

  it('decodes the entities the API escapes, exactly once', () => {
    expect(parseHighlight('<mark>Rock</mark> n&#39; &amp;lt; &#34;x&#34; &lt;b&gt;')).toEqual([
      { text: 'Rock', marked: true },
      { text: ' n\' &lt; "x" <b>', marked: false },
    ]);
  });

  it('keeps newlines inside and around marks, normalizing \\r\\n to \\n', () => {
    expect(parseHighlight('…a\r\n<mark>es tevi\nmīlu</mark>\rb…')).toEqual([
      { text: '…a\n', marked: false },
      { text: 'es tevi\nmīlu', marked: true },
      { text: '\nb…', marked: false },
    ]);
  });

  it('returns null for a missing fragment and no segments for an empty one', () => {
    expect(parseHighlight(null)).toBeNull();
    expect(parseHighlight(undefined)).toBeNull();
    expect(parseHighlight('')).toEqual([]);
  });
});

describe('firstHighlight', () => {
  it('returns the first fragment of a field or null', () => {
    const song = { '@search.highlights': { title: ['<mark>a</mark>', 'b'], bodyLyrics: [] } };
    expect(firstHighlight(song, 'title')).toBe('<mark>a</mark>');
    expect(firstHighlight(song, 'bodyLyrics')).toBeNull();
    expect(firstHighlight(song, 'mainArtistTitle')).toBeNull();
    expect(firstHighlight({}, 'title')).toBeNull();
  });
});

describe('SearchHighlight', () => {
  it('renders server matches as <mark>, including diacritic-folded and multi-word ones', () => {
    // Server response for the query "perkons saule": folded, reordered words
    const wrapper = mount(SearchHighlight, {
      props: { highlight: '<mark>Saule</mark>, <mark>Pērkons</mark>, Daugava', value: 'ignored' },
    });
    expect(wrapper.text()).toBe('Saule, Pērkons, Daugava');
    expect(marks(wrapper)).toEqual(['Saule', 'Pērkons']);
  });

  it('keeps a merged multi-word server match as one mark', () => {
    const wrapper = mount(SearchHighlight, {
      props: { highlight: '<mark>Prāta Vētra</mark>/Brainstorm' },
    });
    expect(marks(wrapper)).toEqual(['Prāta Vētra']);
    expect(wrapper.text()).toBe('Prāta Vētra/Brainstorm');
  });

  it('renders escaped markup in a server fragment as text', () => {
    const wrapper = mount(SearchHighlight, {
      props: { highlight: `a\n${XSS_ESCAPED} <mark>pērkons</mark>` },
    });
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toBe(`a\n${XSS} pērkons`);
    expect(marks(wrapper)).toEqual(['pērkons']);
  });

  it('never renders markup other than <mark>, even unescaped', () => {
    const wrapper = mount(SearchHighlight, { props: { highlight: `<mark>${XSS}</mark>` } });
    expect(wrapper.find('img').exists()).toBe(false);
    expect(marks(wrapper)).toEqual([XSS]);
  });

  it('falls back to the raw value as text, highlighting the query client-side', async () => {
    const wrapper = await mountFallback({
      value: 'Saule, Pērkons, Daugava',
      searchString: 'perkons',
    });
    expect(wrapper.text()).toBe('Saule, Pērkons, Daugava');
    expect(wrapper.find('.lx-highlight').text()).toBe('Pērkons');
  });

  it('renders a raw fallback value containing markup as text', async () => {
    const wrapper = await mountFallback({ value: `${XSS}Title`, searchString: 'title' });
    expect(wrapper.find('img').exists()).toBe(false);
    expect(wrapper.text()).toBe(`${XSS}Title`);
    expect(wrapper.find('.lx-highlight').text()).toBe('Title');
  });
});
