import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia } from 'pinia';

const { getSong } = vi.hoisted(() => ({ getSong: vi.fn() }));

vi.mock('@/services/akordiService', () => ({
  default: { parseUrl: (url) => Number.parseInt(url, 10), getSong },
}));
const viewStore = { title: null, description: null, goBack: null };
vi.mock('@/stores/useViewStore', () => ({ default: () => viewStore }));

import prefetchRoute from '@/ssr/prefetch';
import useSongStore from '@/stores/useSongStore';

// resolve() mirrors the real route shapes: the list variants keep their prefix.
const PATH_BY_ROUTE = {
  akordiSongView: '/song',
  songListTopSongView: '/top/song',
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
      route: { name: 'dashboard', params: {} },
      router,
      pinia,
      ssrContext,
    });

    expect(prefetched).toBe(false);
    expect(getSong).not.toHaveBeenCalled();
  });
});
