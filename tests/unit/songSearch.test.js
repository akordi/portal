import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const { search, gtagEvent, push } = vi.hoisted(() => ({
  search: vi.fn(),
  gtagEvent: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@dativa-lv/lx-ui', () => ({
  LxList: {
    name: 'LxList',
    props: ['items', 'searchString', 'showLoadMore'],
    emits: ['action-click', 'update:items', 'update:search-string', 'load-more'],
    template: '<div />',
  },
  LxContentSwitcher: { name: 'LxContentSwitcher', props: ['modelValue'], template: '<div />' },
  LxLoader: { name: 'LxLoader', props: ['loading'], template: '<div />' },
}));
vi.mock('@/services/akordiService', () => ({ default: { search } }));
vi.mock('vue-gtag', () => ({ event: gtagEvent }));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: {} }),
  useRouter: () => ({ push }),
}));
vi.mock('@/stores/useViewStore', () => ({ default: () => ({ goBack: false }) }));
vi.mock('@/stores/useNotifyStore', () => ({ default: () => ({ pushError: vi.fn() }) }));
vi.mock('@/utils/texts', () => ({ listTexts: () => ({}) }));

import SongSearch from '@/views/SongSearch.vue';

const noResults = () => ({ data: { value: [], '@odata.count': 0 } });
const withResults = () => ({
  data: {
    value: [{ id: 1, title: 'A song', mainArtistTitle: 'A band', '@search.highlights': {} }],
    '@odata.count': 1,
  },
});

const list = (wrapper) => wrapper.findComponent({ name: 'LxList' });
// Simulate a user (debounced) keystroke arriving at the view.
const type = async (wrapper, term) => {
  list(wrapper).vm.$emit('update:search-string', term);
  await flushPromises();
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

describe('SongSearch — search / search_no_results reporting', () => {
  it('reports only the term the user settles on for a successful search, not the prefixes typed through', async () => {
    search.mockResolvedValue(withResults());
    const wrapper = mount(SongSearch);

    // Every one of these keystrokes independently returns results (the API
    // has no debounce), so pre-fix each one fired its own "search" event.
    await type(wrapper, 'D');
    await type(wrapper, 'Da');
    await type(wrapper, 'Dak');
    await type(wrapper, 'Dakota');

    expect(gtagEvent).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2000);

    const searchCalls = gtagEvent.mock.calls.filter((c) => c[0] === 'search');
    expect(searchCalls).toHaveLength(1);
    expect(searchCalls[0][1]).toEqual({ search_term: 'Dakota' });
  });

  it('reports only the term the user settles on, not the prefixes typed through', async () => {
    search.mockResolvedValue(noResults());
    const wrapper = mount(SongSearch);

    // User types a single word; each debounced keystroke completes a search.
    await type(wrapper, 'Cir');
    await type(wrapper, 'Circ');
    await type(wrapper, 'Circen');
    await type(wrapper, 'Circenī');

    // Still typing — nothing reported yet.
    expect(gtagEvent).not.toHaveBeenCalled();

    // User stops; the settle window elapses.
    await vi.advanceTimersByTimeAsync(2000);

    const noResultsCalls = gtagEvent.mock.calls.filter((c) => c[0] === 'search_no_results');
    expect(noResultsCalls).toHaveLength(1);
    expect(noResultsCalls[0][1]).toEqual({ search_term: 'Circenī' });
  });

  it('does not report when a later keystroke finds results', async () => {
    search.mockResolvedValueOnce(noResults()); // "Circ*" fallback also empty
    search.mockResolvedValueOnce(noResults());
    search.mockResolvedValue(withResults()); // "Circle" hits
    const wrapper = mount(SongSearch);

    await type(wrapper, 'Circ'); // no results -> event pending
    await type(wrapper, 'Circle'); // results -> cancels the pending no-results event
    await vi.advanceTimersByTimeAsync(2000);

    expect(gtagEvent.mock.calls.filter((c) => c[0] === 'search_no_results')).toHaveLength(0);
    expect(gtagEvent.mock.calls.filter((c) => c[0] === 'search')).toHaveLength(1);
  });

  it('does not report a term abandoned by navigating away (unmount)', async () => {
    search.mockResolvedValue(noResults());
    const wrapper = mount(SongSearch);

    await type(wrapper, 'Circenī'); // no results -> event pending
    wrapper.unmount();
    await vi.advanceTimersByTimeAsync(2000);

    expect(gtagEvent.mock.calls.filter((c) => c[0] === 'search_no_results')).toHaveLength(0);
  });
});
