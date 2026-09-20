import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const { getSong, getSongPreferences, saveSongTransposeOffset, useHead, routerReplace, routeState } =
  vi.hoisted(() => ({
    getSong: vi.fn(),
    getSongPreferences: vi.fn(),
    saveSongTransposeOffset: vi.fn(),
    useHead: vi.fn(),
    routerReplace: vi.fn(),
    // Mutable so the SSR-outcome tests below can vary the requested route.
    routeState: { name: 'akordiSongView', params: { url: '42-song' }, fullPath: '/song/42-song' },
  }));

vi.mock('@akordi/lx-ui', () => {
  // Slot-rendering stubs — the indicator lives in the form's postHeader slot
  // and the reset action in the footer toolbar, so both slots have to render.
  const slotStub = (name, props = []) => ({
    name,
    props,
    template: '<div><slot name="postHeader" /><slot name="footer" /><slot /></div>',
  });
  return {
    LxButton: {
      name: 'LxButton',
      props: ['id', 'label', 'icon', 'kind', 'variant', 'title', 'active'],
      emits: ['click'],
      template: '<button @click="$emit(\'click\')">{{ label }}</button>',
    },
    LxCheckbox: { name: 'LxCheckbox', props: ['id', 'label'], template: '<div />' },
    LxForm: slotStub('LxForm', ['actionDefinitions', 'kind']),
    LxLoaderView: slotStub('LxLoaderView', ['loading']),
    LxModal: { name: 'LxModal', props: ['label'], template: '<div><slot /></div>' },
    LxRow: { name: 'LxRow', props: ['label'], template: '<div><slot /></div>' },
    LxSection: { name: 'LxSection', props: ['id'], template: '<div><slot /></div>' },
    LxStateDisplay: {
      name: 'LxStateDisplay',
      props: ['id', 'value', 'dictionary'],
      template: '<div />',
    },
    LxTextInput: { name: 'LxTextInput', props: ['modelValue'], template: '<div />' },
    LxToolbar: {
      name: 'LxToolbar',
      props: ['noBorders'],
      template: '<div><slot name="leftArea" /></div>',
    },
    LxToolbarGroup: { name: 'LxToolbarGroup', props: ['id'], template: '<div><slot /></div>' },
    lxDateUtils: { formatDate: (d) => d, formatDateTime: (d) => d },
  };
});
vi.mock('@/components/AbcViewer.vue', () => ({
  default: { name: 'AbcViewer', props: ['abc'], template: '<div />' },
}));
vi.mock('@/components/ChordSvg.vue', () => ({
  default: { name: 'ChordSvg', props: ['chord', 'instrument'], template: '<div />' },
}));
vi.mock('vue-gtag', () => ({ event: vi.fn(), pageview: vi.fn() }));
vi.mock('@vueuse/head', () => ({ useHead }));
// Interpolated params are appended so assertions can see the offset.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => (params ? `${key} ${Object.values(params).join(' ')}` : key),
  }),
}));
// resolve() mirrors the real route shapes: the list variants keep their prefix.
const PATH_BY_ROUTE = {
  akordiSongView: '/song',
  songListTopSongView: '/top/song',
  songSearchSongView: '/search/song',
  songListNewSongView: '/new/song',
};
vi.mock('vue-router', () => ({
  useRoute: () => routeState,
  useRouter: () => ({
    push: vi.fn(),
    replace: routerReplace,
    back: vi.fn(),
    resolve: ({ name, params }) => ({ path: `${PATH_BY_ROUTE[name]}/${params.url}` }),
  }),
}));
vi.mock('@/services/akordiService', () => ({
  default: { parseUrl: (url) => Number.parseInt(url, 10), getSong },
}));
vi.mock('@/services/songbookService', () => ({
  default: { findAll: vi.fn(), getSongSongbooks: vi.fn(), addSong: vi.fn(), removeSong: vi.fn() },
}));
vi.mock('@/stores/useAccountPreferencesStore', () => ({
  default: () => ({ getSongPreferences, saveSongTransposeOffset }),
}));
vi.mock('@/stores/useAuthStore', () => ({
  default: () => ({ isAuthenticated: () => true, login: vi.fn() }),
}));
vi.mock('@/stores/useNotifyStore', () => ({
  default: () => ({ pushError: vi.fn(), pushSuccess: vi.fn(), pushWarning: vi.fn() }),
}));
vi.mock('@/stores/useSettingsStore', () => ({
  default: () => ({ showChords: true, showAbc: false, instrument: 'guitar' }),
}));
vi.mock('@/stores/useViewStore', () => ({
  default: () => ({ title: '', description: '', goBack: false, $reset: vi.fn() }),
}));

import SongView from '@/views/SongView.vue';

const song = {
  id: 42,
  title: 'Bēdu, manu lielu bēdu',
  url: '/song/42-song',
  body: 'Am       F        C        G\nBēdu, manu lielu bēdu,',
  mainArtist: { title: 'Prāta vētra' },
  createdDate: '2026-08-14T10:00:00Z',
  updatedDate: '2026-08-14T10:00:00Z',
};

const mountView = async (transposeOffset) => {
  getSong.mockResolvedValue({ data: { ...song } });
  getSongPreferences.mockResolvedValue({ transposeOffset });
  const wrapper = mount(SongView);
  await flushPromises();
  return wrapper;
};

const badge = (wrapper) => wrapper.findComponent({ name: 'LxStateDisplay' });
const badgeSection = (wrapper) =>
  wrapper
    .findAllComponents({ name: 'LxSection' })
    .find((s) => s.props('id') === 'transposedNotice');
const resetButton = (wrapper) =>
  wrapper.findAllComponents({ name: 'LxButton' }).find((b) => b.props('icon') === 'reset');
const transposeLabel = (wrapper) => wrapper.find('.toolbar-label');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SongView transposed indicator', () => {
  it('marks a song restored from saved preferences as transposed', async () => {
    const wrapper = await mountView(2);

    expect(badge(wrapper).exists()).toBe(true);
    expect(badge(wrapper).props('dictionary')[0].displayName).toContain(
      'pages.akordiSongView.transposed.badge +2'
    );
    expect(badge(wrapper).props('dictionary')[0].title).toContain(
      'pages.akordiSongView.transposed.tooltip +2'
    );
    expect(resetButton(wrapper)).toBeTruthy();
    // Icon-only: a text label here is ~2.5x the width of an icon button and
    // pushed the autoscroll controls off a 390px sticky toolbar.
    expect(resetButton(wrapper).props('variant')).toBe('icon-only');
    expect(transposeLabel(wrapper).classes()).toContain('transpose-active');
    // The badge belongs in the song content, not the form's #postHeader slot:
    // LX collapses the header groups into a popover at <=800px, which hid it
    // on every phone.
    expect(badgeSection(wrapper)).toBeTruthy();
    expect(badgeSection(wrapper).findComponent({ name: 'LxStateDisplay' }).exists()).toBe(true);
    // The sheet itself really is in the shifted key.
    expect(wrapper.html()).toContain('Bm');
  });

  it('shows a negative offset with its sign', async () => {
    const wrapper = await mountView(-3);

    expect(badge(wrapper).props('dictionary')[0].displayName).toContain(
      'pages.akordiSongView.transposed.badge -3'
    );
  });

  it('adds nothing when the song is in its original key', async () => {
    const wrapper = await mountView(0);

    expect(badge(wrapper).exists()).toBe(false);
    expect(badgeSection(wrapper)).toBeUndefined();
    expect(resetButton(wrapper)).toBeUndefined();
    expect(transposeLabel(wrapper).classes()).not.toContain('transpose-active');
  });

  it('reset returns to the written key and clears the saved offset', async () => {
    const wrapper = await mountView(2);

    await resetButton(wrapper).trigger('click');
    await flushPromises();

    expect(saveSongTransposeOffset).toHaveBeenCalledWith(42, 0);
    expect(badge(wrapper).exists()).toBe(false);
    expect(resetButton(wrapper)).toBeUndefined();
    expect(wrapper.html()).toContain('Am');
  });
});

// The SSR entry provides a per-request `ssrContext` the view reports its
// HTTP outcome through (see src/entry-server.js and server.mjs).
describe('SongView SSR outcome', () => {
  const realSong = { ...song, url: '/song/42-Prata_Vetra-Bedu', performers: [] };

  const mountWithRoute = async ({ ssrContext, name = 'akordiSongView', url = '42-wrong-slug' }) => {
    routeState.name = name;
    routeState.params = { url };
    getSongPreferences.mockResolvedValue({ transposeOffset: 0 });
    const wrapper = mount(SongView, {
      global: {
        provide: ssrContext ? { ssrContext } : {},
        // loadSong() rethrows after reporting — onMounted's await would
        // otherwise surface it as an unhandled rejection in the API-failure cases.
        config: { errorHandler: () => {} },
      },
    });
    await flushPromises();
    return wrapper;
  };

  const canonical = () => useHead.mock.calls.at(-1)[0].link.find((l) => l.rel === 'canonical').href;

  beforeEach(() => {
    getSong.mockResolvedValue({ data: { ...realSong } });
  });

  afterEach(() => {
    routeState.name = 'akordiSongView';
    routeState.params = { url: '42-song' };
  });

  it('asks for a 301 to the real song URL when the slug is wrong', async () => {
    const ssrContext = { status: 200, redirect: null };
    await mountWithRoute({ ssrContext });

    expect(ssrContext.redirect).toBe('/song/42-Prata_Vetra-Bedu');
    expect(ssrContext.status).toBe(200);
    expect(routerReplace).not.toHaveBeenCalled();
  });

  it('keeps the list prefix in the redirect target', async () => {
    const ssrContext = { status: 200, redirect: null };
    await mountWithRoute({ ssrContext, name: 'songListTopSongView' });

    expect(ssrContext.redirect).toBe('/top/song/42-Prata_Vetra-Bedu');
  });

  it('does not redirect when the requested URL is already the real one', async () => {
    const ssrContext = { status: 200, redirect: null };
    await mountWithRoute({ ssrContext, url: '42-Prata_Vetra-Bedu' });

    expect(ssrContext.redirect).toBeNull();
    expect(ssrContext.status).toBe(200);
  });

  it('builds the canonical from the real song URL, not the requested one', async () => {
    await mountWithRoute({
      ssrContext: { status: 200, redirect: null },
      name: 'songListTopSongView',
    });

    expect(canonical()).toBe(`${window.location.origin}/song/42-Prata_Vetra-Bedu`);
  });

  it('falls back to router.replace in the browser (no ssrContext)', async () => {
    await mountWithRoute({ name: 'songSearchSongView' });

    expect(routerReplace).toHaveBeenCalledWith({
      name: 'songSearchSongView',
      params: { url: '42-Prata_Vetra-Bedu' },
    });
  });

  it('reports 404 when the API says the song does not exist', async () => {
    getSong.mockRejectedValue({ response: { status: 404 } });
    const ssrContext = { status: 200, redirect: null };
    await mountWithRoute({ ssrContext, url: '999999-Nope' });

    expect(ssrContext.status).toBe(404);
    expect(ssrContext.redirect).toBeNull();
  });

  it('keeps the fail-open 200 for any other API failure', async () => {
    getSong.mockRejectedValue({ response: { status: 503 } });
    const ssrContext = { status: 200, redirect: null };
    await mountWithRoute({ ssrContext });

    expect(ssrContext.status).toBe(200);
  });
});
