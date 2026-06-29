import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const { findOne, getSongs, findPublic, getPublicSongs, reorderSongs, removeSong } = vi.hoisted(
  () => ({
    findOne: vi.fn(),
    getSongs: vi.fn(),
    findPublic: vi.fn(),
    getPublicSongs: vi.fn(),
    reorderSongs: vi.fn(),
    removeSong: vi.fn(),
  })
);

// Replace LxList with a lightweight stub so we can read the props the view
// passes (toolbar/song action definitions, items) and emit its events.
vi.mock('@dativa-lv/lx-ui', () => ({
  LxList: {
    name: 'LxList',
    props: ['items', 'toolbarActionDefinitions', 'actionDefinitions'],
    emits: ['toolbar-action-click', 'action-click', 'update:items'],
    template: '<div />',
  },
}));
vi.mock('@/services/songbookService', () => ({
  default: { findOne, getSongs, findPublic, getPublicSongs, reorderSongs, removeSong },
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '7' } }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/stores/useViewStore', () => ({ default: () => ({ title: '', goBack: false }) }));
vi.mock('@/stores/useNotifyStore', () => ({
  default: () => ({ pushError: vi.fn(), pushSuccess: vi.fn() }),
}));

import SongbookView from '@/views/SongbookView.vue';

const songsPayload = {
  data: {
    content: [
      { id: 1, title: 'First', url: '/song/first', mainArtist: { title: 'Band' } },
      { id: 2, title: 'Second', url: '/song/second', mainArtist: { title: 'Band' } },
    ],
  },
};

function mountView() {
  return mount(SongbookView);
}

function list(wrapper) {
  return wrapper.findComponent({ name: 'LxList' });
}

function ids(actions) {
  return (actions || []).map((a) => a.id);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SongbookView anonymous (public) view', () => {
  it('renders the public songbook with no owner controls and clickable songs', async () => {
    findOne.mockRejectedValue({ response: { status: 401 } });
    findPublic.mockResolvedValue({ data: { id: 7, name: 'Public book', isPublic: true } });
    getPublicSongs.mockResolvedValue(songsPayload);

    const wrapper = mountView();
    await flushPromises();

    const l = list(wrapper);
    // Fell back to the public endpoint, never showed owner data.
    expect(findPublic).toHaveBeenCalledWith('7');
    expect(getPublicSongs).toHaveBeenCalledWith('7');
    // No edit / management controls for anonymous viewers.
    expect(ids(l.props('toolbarActionDefinitions'))).toEqual([]);
    expect(ids(l.props('actionDefinitions'))).toEqual([]);
    // Songs are listed and clickable so they open in the reader.
    const items = l.props('items');
    expect(items.map((s) => s.title)).toEqual(['First', 'Second']);
    expect(items.every((s) => s.clickable)).toBe(true);
  });
});

describe('SongbookView owner view', () => {
  beforeEach(() => {
    findOne.mockResolvedValue({ data: { id: 7, name: 'My book', isPublic: false } });
    getSongs.mockResolvedValue(songsPayload);
  });

  it('shows only Edit by default; songs stay clickable', async () => {
    const wrapper = mountView();
    await flushPromises();

    const l = list(wrapper);
    expect(ids(l.props('toolbarActionDefinitions'))).toEqual(['edit']);
    expect(ids(l.props('actionDefinitions'))).toEqual([]);
    expect(l.props('items').every((s) => s.clickable)).toBe(true);
  });

  it('reveals reorder/add/settings controls in edit mode and makes rows non-clickable', async () => {
    const wrapper = mountView();
    await flushPromises();

    const l = list(wrapper);
    l.vm.$emit('toolbar-action-click', 'edit');
    await flushPromises();

    expect(ids(l.props('toolbarActionDefinitions'))).toEqual(['add', 'settings', 'done']);
    expect(ids(l.props('actionDefinitions'))).toEqual(['moveUp', 'moveDown', 'delete']);
    expect(l.props('items').every((s) => !s.clickable)).toBe(true);

    // Done returns to the clean view.
    l.vm.$emit('toolbar-action-click', 'done');
    await flushPromises();
    expect(ids(l.props('toolbarActionDefinitions'))).toEqual(['edit']);
    expect(ids(l.props('actionDefinitions'))).toEqual([]);
  });

  it('persists the new order when a song is moved', async () => {
    reorderSongs.mockResolvedValue({});
    const wrapper = mountView();
    await flushPromises();

    const l = list(wrapper);
    l.vm.$emit('toolbar-action-click', 'edit');
    await flushPromises();

    // Move the first song down.
    l.vm.$emit('action-click', 'moveDown', 1);
    await flushPromises();

    expect(reorderSongs).toHaveBeenCalledWith(7, [2, 1]);
    expect(l.props('items').map((s) => s.title)).toEqual(['Second', 'First']);
  });
});
