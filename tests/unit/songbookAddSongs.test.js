import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const { search } = vi.hoisted(() => ({ search: vi.fn() }));

vi.mock('@akordi/lx-ui', async () => ({
  LxSearchableText: (await vi.importActual('@akordi/lx-ui')).LxSearchableText,
  LxList: {
    name: 'LxList',
    props: ['items', 'searchString'],
    emits: ['action-click', 'update:items', 'update:search-string'],
    template:
      '<div><header v-for="item in items" :key="item.id"><slot name="customItem" v-bind="item" /></header></div>',
  },
}));
vi.mock('@/services/akordiService', () => ({ default: { search } }));
vi.mock('@/services/songbookService', () => ({ default: { addSong: vi.fn() } }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-router', () => ({ useRoute: () => ({ params: { id: '7' } }) }));
vi.mock('@/stores/useViewStore', () => ({ default: () => ({ title: '', goBack: false }) }));
vi.mock('@/stores/useNotifyStore', () => ({
  default: () => ({ pushError: vi.fn(), pushSuccess: vi.fn() }),
}));
vi.mock('@/utils/texts', () => ({ listTexts: () => ({}) }));

import SongbookAddSongs from '@/views/SongbookAddSongs.vue';

const XSS = '<img src=x onerror="window.__xss=1">';
const XSS_ESCAPED = '&lt;img src=x onerror=&#34;window.__xss=1&#34;&gt;';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SongbookAddSongs — search results', () => {
  it('renders API highlights as <mark> and markup in songs as text', async () => {
    search.mockResolvedValue({
      data: {
        value: [
          { id: 1, title: `${XSS}T`, mainArtistTitle: `${XSS}A`, '@search.highlights': {} },
          {
            id: 2,
            title: 'Prāta vētra',
            mainArtistTitle: 'A',
            '@search.highlights': {
              mainArtistTitle: [`${XSS_ESCAPED}A`],
              title: ['<mark>Prāta vētra</mark>'],
              bodyLyrics: [`x\n${XSS_ESCAPED} <mark>vētra</mark>`],
            },
          },
        ],
      },
    });
    const wrapper = mount(SongbookAddSongs);
    wrapper.findComponent({ name: 'LxList' }).vm.$emit('update:search-string', 'prata vetra');
    await flushPromises();
    // The raw fields render through lx-ui's async LxSearchableText
    await vi.waitFor(() => expect(wrapper.find('header .lx-primary').text()).not.toBe('-'));

    const rows = wrapper.findAll('header');
    expect(wrapper.find('img').exists()).toBe(false);
    expect(rows[0].find('.lx-primary').text()).toBe(`${XSS}A - ${XSS}T`);
    expect(rows[1].find('.lx-primary').text()).toBe(`${XSS}A - Prāta vētra`);
    expect(rows[1].find('.lx-secondary').text()).toBe(`x\n${XSS} vētra`);
    expect(rows[1].findAll('mark').map((mark) => mark.text())).toEqual(['Prāta vētra', 'vētra']);
  });
});
