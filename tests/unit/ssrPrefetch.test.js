import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia } from 'pinia';

// vitest runs with isolate: false (vite.config.mjs), so modules another test
// file already imported stay cached in this worker — including the mocks
// they were bound to. This file and ssrPrefetch.test.js both import
// src/stores/useSongStore with their own akordiService/viewStore mocks, so
// each starts from an empty module registry to get modules bound to its own.
vi.hoisted(() => vi.resetModules());

const { getSong, getSongsCount, getTag, getSongs, getFeaturedTags, getArtist } = vi.hoisted(() => ({
  getArtist: vi.fn(),
  getSong: vi.fn(),
  getSongsCount: vi.fn(),
  getTag: vi.fn(),
  getSongs: vi.fn(),
  getFeaturedTags: vi.fn(),
}));

vi.mock('@/services/akordiService', () => ({
  default: {
    parseUrl: (url) => Number.parseInt(url, 10),
    getSong,
    getSongsCount,
    getTag,
    getSongs,
    getFeaturedTags,
    getArtist,
  },
}));
const viewStore = { title: null, description: null, goBack: null };
vi.mock('@/stores/useViewStore', () => ({ default: () => viewStore }));

import prefetchRoute from '@/ssr/prefetch';
import useDashboardStore from '@/stores/useDashboardStore';
import useSongStore from '@/stores/useSongStore';
import useTagStore from '@/stores/useTagStore';

// resolve() mirrors the real route shapes: the list variants keep their prefix.
const PATH_BY_ROUTE = {
  akordiSongView: '/song',
  songListTopSongView: '/top/song',
  tagView: '/tag',
  akordiArtistView: '/band',
};
const router = {
  resolve: ({ name, params }) => ({ path: `${PATH_BY_ROUTE[name]}/${params.url}` }),
};

const song = {
  id: 42,
  title: 'Bēdu, manu lielu bēdu',
  url: '/song/42-Prata_Vetra-Bedu',
  mainArtist: { title: 'Prāta vētra' },
  performers: [],
};

// The SSR entry runs this before renderToString and reports the HTTP
// outcome it sets through ssrContext (see src/entry-server.js, server.mjs).
describe('prefetchRoute for a song page', () => {
  let pinia;
  let ssrContext;
  const run = (name = 'akordiSongView', url = '42-wrong-slug') =>
    prefetchRoute({ route: { name, params: { url } }, router, pinia, ssrContext });

  beforeEach(() => {
    vi.clearAllMocks();
    pinia = createPinia();
    ssrContext = { status: 200, redirect: null };
    viewStore.title = null;
    viewStore.description = null;
    viewStore.goBack = null;
    getSong.mockResolvedValue({ data: { ...song } });
  });

  it('loads the song into the store and the header into the view store', async () => {
    const prefetched = await run('akordiSongView', '42-Prata_Vetra-Bedu');

    expect(prefetched).toBe(true);
    expect(getSong).toHaveBeenCalledWith(42);
    expect(useSongStore(pinia).song).toEqual(song);
    expect(pinia.state.value.songStore.song).toEqual(song);
    expect(viewStore.title).toBe(song.title);
    expect(viewStore.description).toBe('Prāta vētra');
    expect(viewStore.goBack).toBe(true);
    expect(ssrContext).toEqual({ status: 200, redirect: null });
  });

  it('asks for a 301 to the real song URL when the slug is wrong', async () => {
    await run();

    expect(ssrContext.redirect).toBe('/song/42-Prata_Vetra-Bedu');
    expect(ssrContext.status).toBe(200);
  });

  it('keeps the list prefix in the redirect target', async () => {
    await run('songListTopSongView');

    expect(ssrContext.redirect).toBe('/top/song/42-Prata_Vetra-Bedu');
  });

  it('reports 404 when the API says the song does not exist', async () => {
    getSong.mockRejectedValue({ response: { status: 404 } });

    await expect(run('akordiSongView', '999999-Nope')).rejects.toBeDefined();
    expect(ssrContext.status).toBe(404);
    expect(ssrContext.redirect).toBeNull();
  });

  it('keeps the fail-open 200 for any other API failure', async () => {
    getSong.mockRejectedValue({ response: { status: 503 } });

    await expect(run()).rejects.toBeDefined();
    expect(ssrContext.status).toBe(200);
  });

  it('has nothing to prefetch for other routes', async () => {
    const prefetched = await prefetchRoute({
      route: { name: 'songSearch', params: {} },
      router,
      pinia,
      ssrContext,
    });

    expect(prefetched).toBe(false);
    expect(getSong).not.toHaveBeenCalled();
  });
});

describe('prefetchRoute for the dashboard', () => {
  it('loads the song count into the dashboard store', async () => {
    const pinia = createPinia();
    getSongsCount.mockResolvedValue({ data: { totalElements: 12345 } });
    getFeaturedTags.mockResolvedValue({ data: { content: [] } });

    const prefetched = await prefetchRoute({
      route: { name: 'dashboard', params: {} },
      router,
      pinia,
      ssrContext: { status: 200, redirect: null },
    });

    expect(prefetched).toBe(true);
    expect(useDashboardStore(pinia).songCountTotal).toBe(12345);
    expect(pinia.state.value.dashboardStore.songCountTotal).toBe(12345);
  });
});

describe('prefetchRoute for the dashboard featured tags', () => {
  const run = (pinia) =>
    prefetchRoute({
      route: { name: 'dashboard', params: {} },
      router,
      pinia,
      ssrContext: { status: 200, redirect: null },
    });

  beforeEach(() => {
    vi.clearAllMocks();
    getSongsCount.mockResolvedValue({ data: { totalElements: 1 } });
  });

  it('transfers the featured tags with the dashboard state', async () => {
    const pinia = createPinia();
    const featured = [{ id: 4, title: 'ziemassvētku', url: '/tag/4-Ziemassvetku' }];
    getFeaturedTags.mockResolvedValue({ data: { content: featured } });
    getSongs.mockResolvedValue({
      data: {
        content: [
          { id: 7, title: 'Klusa nakts', url: '/song/7-K', body: 'long', chordTimeline: {} },
        ],
      },
    });

    await run(pinia);

    expect(getSongs).toHaveBeenCalledWith(
      expect.objectContaining({ 'tag.id': 4, size: 3, sort: 'songTop.visitsWeekly,desc' })
    );
    // Only the fields the banner links use travel with the page.
    expect(pinia.state.value.dashboardStore.featuredTags).toEqual([
      { ...featured[0], topSongs: [{ id: 7, title: 'Klusa nakts', url: '/song/7-K' }] },
    ]);
  });

  it('renders the home page without banners when the featured call fails', async () => {
    const pinia = createPinia();
    getFeaturedTags.mockRejectedValue({ response: { status: 404 } });

    await run(pinia);

    expect(useDashboardStore(pinia).featuredTags).toEqual([]);
    expect(useDashboardStore(pinia).songCountTotal).toBe(1);
  });
});

describe('prefetchRoute for a tag page', () => {
  const i18n = { global: { t: (key, params) => `${key}:${JSON.stringify(params)}` } };
  const tag = { id: 4, title: 'ziemassvētku', url: '/tag/4-Ziemassvetku', songCount: 3 };
  const songsPage = (n) => ({
    data: {
      content: Array.from({ length: n }, (_, i) => ({
        id: i + 1,
        title: `S${i + 1}`,
        url: `/song/${i + 1}-S`,
      })),
      totalElements: n,
    },
  });
  let pinia;
  let ssrContext;
  const run = (url = '4-Ziemassvetku') =>
    prefetchRoute({ route: { name: 'tagView', params: { url } }, router, pinia, ssrContext, i18n });

  beforeEach(() => {
    vi.clearAllMocks();
    pinia = createPinia();
    ssrContext = { status: 200, redirect: null };
    viewStore.title = null;
    viewStore.goBack = null;
    getTag.mockResolvedValue({ data: { ...tag } });
    getSongs.mockImplementation((params) =>
      Promise.resolve(params.sort === 'title,asc' ? songsPage(3) : songsPage(3))
    );
  });

  it('loads tag and songs into the transferred store, header from the tag', async () => {
    expect(await run()).toBe(true);

    expect(getTag).toHaveBeenCalledWith(4);
    expect(getSongs).toHaveBeenCalledWith(
      expect.objectContaining({ 'tag.id': 4, sort: 'title,asc' })
    );
    expect(getSongs).toHaveBeenCalledWith(
      expect.objectContaining({ 'tag.id': 4, sort: 'songTop.visitsWeekly,desc', size: 10 })
    );
    expect(pinia.state.value.tagStore.tag).toEqual(tag);
    expect(pinia.state.value.tagStore.songs).toHaveLength(3);
    // The most visited songs are kept; TagView decides how many to show.
    expect(pinia.state.value.tagStore.popular).toHaveLength(3);
    expect(viewStore.title).toBe('pages.tagView.title:{"title":"ziemassvētku"}');
    expect(viewStore.goBack).toBe(true);
    expect(ssrContext).toEqual({ status: 200, redirect: null });
  });

  it('uses the admin-entered page title as the heading', async () => {
    getTag.mockResolvedValue({ data: { ...tag, pageTitle: 'Ziemassvētku dziesmas' } });

    await run();

    expect(viewStore.title).toBe('Ziemassvētku dziesmas');
  });

  it('keeps a popular section for large tags', async () => {
    getSongs.mockImplementation((params) =>
      Promise.resolve(params.sort === 'title,asc' ? songsPage(40) : songsPage(10))
    );

    await run();

    expect(useTagStore(pinia).popular).toHaveLength(10);
    expect(useTagStore(pinia).total).toBe(40);
  });

  it('asks for a 301 to the real tag URL when the slug is wrong', async () => {
    await run('4-wrong');

    expect(ssrContext.redirect).toBe('/tag/4-Ziemassvetku');
  });

  it('reports 404 for a missing tag', async () => {
    getTag.mockRejectedValue({ response: { status: 404 } });

    await expect(run('999-Nope')).rejects.toBeDefined();
    expect(ssrContext.status).toBe(404);
  });
});

describe('prefetchRoute for an artist page', () => {
  const artist = { id: 4, title: 'Raimonds Pauls', url: '/band/4-Raimonds_Pauls' };
  let pinia;
  let ssrContext;
  const run = (url = '4-Raimonds_Pauls') =>
    prefetchRoute({
      route: { name: 'akordiArtistView', params: { url } },
      router,
      pinia,
      ssrContext,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    pinia = createPinia();
    ssrContext = { status: 200, redirect: null };
    viewStore.title = null;
    getArtist.mockResolvedValue({ data: { ...artist } });
  });

  it('server-renders the artist name as the page heading, without state to hydrate', async () => {
    // ArtistView holds its songs in component state, so the client mounts fresh.
    expect(await run()).toBe(false);
    expect(getArtist).toHaveBeenCalledWith(4);
    expect(viewStore.title).toBe('Raimonds Pauls');
    expect(ssrContext).toEqual({ status: 200, redirect: null });
  });

  it('asks for a 301 to the real artist URL when the slug is wrong', async () => {
    await run('4-wrong');
    expect(ssrContext.redirect).toBe('/band/4-Raimonds_Pauls');
  });

  it('reports 404 for a deleted artist instead of an empty 200 page', async () => {
    getArtist.mockRejectedValue({ response: { status: 404 } });
    await expect(run('61-ZIEMASSVETKU')).rejects.toBeDefined();
    expect(ssrContext.status).toBe(404);
  });
});
