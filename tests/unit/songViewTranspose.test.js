import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { unref } from 'vue';
import { useHead } from '@vueuse/head';

const { getSong, getSongPreferences, saveSongTransposeOffset } = vi.hoisted(() => ({
  getSong: vi.fn(),
  getSongPreferences: vi.fn(),
  saveSongTransposeOffset: vi.fn(),
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
vi.mock('@vueuse/head', () => ({ useHead: vi.fn() }));
// Interpolated params are appended so assertions can see the offset.
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => (params ? `${key} ${Object.values(params).join(' ')}` : key),
  }),
}));
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { url: '42-song' }, fullPath: '/song/42-song' }),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), back: vi.fn() }),
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

describe('SongView head tags', () => {
  // useHead() must run synchronously in setup() so it can inject() the
  // per-request head. Calling it after the song fetch resolves falls back to
  // Unhead's process-global shared head, which under concurrent SSR renders
  // drops the song's <title>/description/og/canonical tags.
  it('registers the head entry during setup and fills it once the song loads', async () => {
    let resolveSong;
    getSong.mockReturnValue(
      new Promise((resolve) => {
        resolveSong = resolve;
      })
    );
    getSongPreferences.mockResolvedValue({ transposeOffset: 0 });

    mount(SongView);

    expect(useHead).toHaveBeenCalledTimes(1);
    const input = useHead.mock.calls[0][0];
    expect(unref(input)).toEqual({});

    resolveSong({ data: { ...song, bodyLyrics: 'Bēdu, manu lielu bēdu, kur es tevi nolikšu' } });
    await flushPromises();

    expect(useHead).toHaveBeenCalledTimes(1);
    const pageTitle = 'Prāta vētra - Bēdu, manu lielu bēdu';
    const canonicalUrl = `${window.location.origin}/song/42-song`;
    const description = 'Bēdu, manu lielu bēdu, kur es tevi nolikšu';
    expect(unref(input)).toEqual({
      title: pageTitle,
      link: [{ rel: 'canonical', href: canonicalUrl }],
      meta: [
        { name: 'description', content: description },
        { property: 'og:title', content: pageTitle },
        { property: 'og:description', content: description },
        { property: 'og:url', content: canonicalUrl },
      ],
    });
  });
});
