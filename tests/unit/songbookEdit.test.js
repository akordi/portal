import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const { findOne, getSongs, reorderSongs, removeSong, save, push } = vi.hoisted(() => ({
  findOne: vi.fn(),
  getSongs: vi.fn(),
  reorderSongs: vi.fn(),
  removeSong: vi.fn(),
  save: vi.fn(),
  push: vi.fn(),
}));

// Stub the lx-ui pieces the edit page uses; LxList captures the song actions.
vi.mock('@dativa-lv/lx-ui', () => {
  const passthrough = (name) => ({ name, template: '<div><slot /></div>' });
  return {
    LxList: {
      name: 'LxList',
      props: ['items', 'toolbarActionDefinitions', 'actionDefinitions'],
      emits: ['toolbar-action-click', 'action-click', 'update:items'],
      template: '<div />',
    },
    LxLoaderView: passthrough('LxLoaderView'),
    LxForm: passthrough('LxForm'),
    LxSection: passthrough('LxSection'),
    LxRow: passthrough('LxRow'),
    LxButton: { name: 'LxButton', props: ['label'], template: '<button />' },
    LxTextInput: { name: 'LxTextInput', props: ['modelValue'], template: '<input />' },
    LxToggle: { name: 'LxToggle', props: ['modelValue'], template: '<div />' },
    LxModal: { name: 'LxModal', template: '<div><slot /></div>', methods: { open() {}, close() {} } },
  };
});
vi.mock('@/services/songbookService', () => ({
  default: { findOne, getSongs, reorderSongs, removeSong, save },
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

import SongbookEdit from '@/views/SongbookEdit.vue';

const songsPayload = {
  data: {
    content: [
      { id: 1, title: 'First', url: '/song/first', mainArtist: { title: 'Band' } },
      { id: 2, title: 'Second', url: '/song/second', mainArtist: { title: 'Band' } },
    ],
  },
};

const list = (wrapper) => wrapper.findComponent({ name: 'LxList' });
const ids = (actions) => (actions || []).map((a) => a.id);

beforeEach(() => {
  vi.clearAllMocks();
  findOne.mockResolvedValue({ data: { id: 7, name: 'My book', isPublic: false } });
  getSongs.mockResolvedValue(songsPayload);
});

describe('SongbookEdit page', () => {
  it('loads the songbook with its songs and management actions', async () => {
    const wrapper = mount(SongbookEdit);
    await flushPromises();

    const l = list(wrapper);
    expect(l.props('items').map((s) => s.title)).toEqual(['First', 'Second']);
    // Rows are not clickable here — this is the management surface.
    expect(l.props('items').every((s) => !s.clickable)).toBe(true);
    expect(ids(l.props('actionDefinitions'))).toEqual(['moveUp', 'moveDown', 'delete']);
    expect(ids(l.props('toolbarActionDefinitions'))).toEqual(['add']);
  });

  it('persists the new order when a song is moved down', async () => {
    reorderSongs.mockResolvedValue({});
    const wrapper = mount(SongbookEdit);
    await flushPromises();

    list(wrapper).vm.$emit('action-click', 'moveDown', 1);
    await flushPromises();

    expect(reorderSongs).toHaveBeenCalledWith(7, [2, 1]);
    expect(list(wrapper).props('items').map((s) => s.title)).toEqual(['Second', 'First']);
  });

  it('removes a song from the songbook', async () => {
    removeSong.mockResolvedValue({});
    const wrapper = mount(SongbookEdit);
    await flushPromises();

    list(wrapper).vm.$emit('action-click', 'delete', 1);
    await flushPromises();

    expect(removeSong).toHaveBeenCalledWith(7, 1);
    expect(list(wrapper).props('items').map((s) => s.title)).toEqual(['Second']);
  });

  it('navigates to the add page from the toolbar', async () => {
    const wrapper = mount(SongbookEdit);
    await flushPromises();

    list(wrapper).vm.$emit('toolbar-action-click', 'add');
    await flushPromises();
    expect(push).toHaveBeenCalledWith({ name: 'songbookAddSongs', params: { id: '7' } });
  });
});
