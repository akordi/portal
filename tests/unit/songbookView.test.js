import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const { findOne, getSongs, findPublic, getPublicSongs, push } = vi.hoisted(() => ({
  findOne: vi.fn(),
  getSongs: vi.fn(),
  findPublic: vi.fn(),
  getPublicSongs: vi.fn(),
  push: vi.fn(),
}));

vi.mock('@dativa-lv/lx-ui', () => ({
  LxList: {
    name: 'LxList',
    props: ['items', 'toolbarActionDefinitions', 'actionDefinitions'],
    emits: ['toolbar-action-click', 'action-click', 'update:items'],
    template: '<div />',
  },
}));
vi.mock('@/services/songbookService', () => ({
  default: { findOne, getSongs, findPublic, getPublicSongs },
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-router', () => ({
  useRoute: () => ({ params: { id: '7' } }),
  useRouter: () => ({ push }),
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

const mountView = () => mount(SongbookView);
const list = (wrapper) => wrapper.findComponent({ name: 'LxList' });
const ids = (actions) => (actions || []).map((a) => a.id);

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
    expect(findPublic).toHaveBeenCalledWith('7');
    expect(getPublicSongs).toHaveBeenCalledWith('7');
    // No edit control for anonymous viewers.
    expect(ids(l.props('toolbarActionDefinitions'))).toEqual([]);
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

  it('shows a single Edit action that navigates to the edit page', async () => {
    const wrapper = mountView();
    await flushPromises();

    const l = list(wrapper);
    expect(ids(l.props('toolbarActionDefinitions'))).toEqual(['edit']);
    expect(l.props('items').every((s) => s.clickable)).toBe(true);

    l.vm.$emit('toolbar-action-click', 'edit');
    await flushPromises();
    expect(push).toHaveBeenCalledWith({ name: 'songbookEdit', params: { id: '7' } });
  });

  it('opens a song in the reader when a row is clicked', async () => {
    const wrapper = mountView();
    await flushPromises();

    list(wrapper).vm.$emit('action-click', 'click', 1);
    await flushPromises();
    expect(push).toHaveBeenCalledWith({ name: 'akordiSongView', params: { url: 'first' } });
  });
});
