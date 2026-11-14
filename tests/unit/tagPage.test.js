import { describe, expect, it } from 'vitest';
import { serializeState } from '@/ssr/serializeState';
import {
  introParagraphs,
  tagDocumentTitle,
  tagHeading,
  tagJsonLd,
  tagMetaDescription,
} from '@/utils/tagPage';

const t = (key, params) => `${key}:${JSON.stringify(params)}`;
const tag = { id: 4, title: 'ziemassvētku', url: '/tag/4-Ziemassvetku' };
const songs = [
  {
    id: 1,
    title: 'Klusa nakts',
    url: '/song/1-Klusa_Nakts',
    artist: 'Tautasdziesma',
  },
  { id: 2, title: 'Eglīte', url: '/song/2-Eglite' },
];

describe('tag page texts', () => {
  it('falls back to translated generic texts', () => {
    expect(tagHeading(tag, t)).toBe('pages.tagView.title:{"title":"ziemassvētku"}');
    expect(tagDocumentTitle(tag, t)).toBe('pages.tagView.pageTitle:{"title":"ziemassvētku"}');
    expect(tagMetaDescription(tag, songs, t)).toBe(
      'pages.tagView.metaDescription:{"songTitles":"Klusa nakts, Eglīte"}'
    );
  });

  it('prefers the content entered in admin', () => {
    const curated = { ...tag, pageTitle: 'Ziemassvētku dziesmas', metaDescription: 'Apraksts' };
    expect(tagHeading(curated, t)).toBe('Ziemassvētku dziesmas');
    expect(tagDocumentTitle(curated, t)).toBe('Ziemassvētku dziesmas');
    expect(tagMetaDescription(curated, songs, t)).toBe('Apraksts');
  });

  it('splits the intro into paragraphs on blank lines', () => {
    expect(introParagraphs('Pirmā rinda\nturpinās.\n\n  \nOtrā. ')).toEqual([
      'Pirmā rinda\nturpinās.',
      'Otrā.',
    ]);
    expect(introParagraphs(undefined)).toEqual([]);
  });

  it('describes the page as a schema.org collection of its songs', () => {
    const ld = tagJsonLd(tag, songs, 74, 'https://www.akordi.lv', 'Ziemassvētku dziesmas');
    expect(ld).toMatchObject({
      '@type': 'CollectionPage',
      name: 'Ziemassvētku dziesmas',
      url: 'https://www.akordi.lv/tag/4-Ziemassvetku',
      mainEntity: { '@type': 'ItemList', numberOfItems: 74 },
    });
    expect(ld.mainEntity.itemListElement).toEqual([
      {
        '@type': 'ListItem',
        position: 1,
        url: 'https://www.akordi.lv/song/1-Klusa_Nakts',
        name: 'Tautasdziesma - Klusa nakts',
      },
      {
        '@type': 'ListItem',
        position: 2,
        url: 'https://www.akordi.lv/song/2-Eglite',
        name: 'Eglīte',
      },
    ]);
  });

  it('cannot close the inline script it is embedded in', () => {
    const hostile = [{ id: 3, title: '</script><img src=x onerror=alert(1)>', url: '/song/3-X' }];
    const json = serializeState(tagJsonLd(tag, hostile, 1, 'https://x', 'n'));
    expect(json).not.toContain('</script>');
    expect(JSON.parse(json).mainEntity.itemListElement[0].name).toBe(hostile[0].title);
  });
});
