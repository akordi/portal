import useArtistStore from '@/stores/useArtistStore';
import useDashboardStore from '@/stores/useDashboardStore';
import useSongStore from '@/stores/useSongStore';
import useTagStore from '@/stores/useTagStore';
import useViewStore from '@/stores/useViewStore';
import { tagHeading } from '@/utils/tagPage';
import { tagUrlParam } from '@/utils/tagUrl';

/**
 * Per-route data loading that has to happen *before* renderToString. A
 * component-level onServerPrefetch is too late for anything the layout
 * renders above the route's view — MainLayout's header (<h1>) is already in
 * the output buffer by the time SongView's prefetch resolves — so the song
 * (and the view store's title/description the header reads) are loaded here
 * into Pinia first. The same stores are serialized for the client, see
 * serializeState() and entry-server.js.
 */
export function songHeader(song) {
  return {
    title: song.title,
    description:
      song.mainArtist?.title || (song.performers || []).map((artist) => artist.title).join(', '),
  };
}

/** The song's own /song/... URL as this route's :url param (the slug part). */
export function songUrlParam(song) {
  return song.url.replace(/^\/song\//, '');
}

async function prefetchSong({ route, router, pinia, ssrContext }) {
  // The per-request HTTP outcome channel (see entry-server.js) is meant to
  // be written to by whoever resolves the route's data.
  const outcome = ssrContext;
  let song;
  try {
    song = await useSongStore(pinia).load(route.params.url);
  } catch (err) {
    // Only a definite "no such song" becomes a 404 — any other failure keeps
    // the fail-open 200 shell (see entry-server.js).
    if (err?.response?.status === 404) {
      outcome.status = 404;
    }
    throw err;
  }

  // Any slug with the right id resolves to the song; a mismatched one
  // becomes a real 301 to the song's own URL, keeping the current route (a
  // /search/, /top/ or /new/ list prefix stays).
  if (`/song/${route.params.url}` !== song.url) {
    outcome.redirect = router.resolve({
      name: route.name,
      params: { url: songUrlParam(song) },
    }).path;
  }

  const viewStore = useViewStore(pinia);
  const header = songHeader(song);
  viewStore.title = header.title;
  viewStore.description = header.description;
  viewStore.goBack = true;
}

async function prefetchTag({ route, router, pinia, ssrContext, i18n }) {
  const outcome = ssrContext;
  let tag;
  try {
    tag = await useTagStore(pinia).load(route.params.url);
  } catch (err) {
    if (err?.response?.status === 404) {
      outcome.status = 404;
    }
    throw err;
  }

  if (tag.url && `/tag/${route.params.url}` !== tag.url) {
    outcome.redirect = router.resolve({ name: 'tagView', params: { url: tagUrlParam(tag) } }).path;
  }

  const viewStore = useViewStore(pinia);
  viewStore.title = tagHeading(tag, i18n.global.t);
  viewStore.goBack = true;
}

async function prefetchArtist({ route, router, pinia, ssrContext }) {
  const outcome = ssrContext;
  let artist;
  try {
    artist = await useArtistStore(pinia).load(route.params.url);
  } catch (err) {
    if (err?.response?.status === 404) {
      outcome.status = 404;
    }
    throw err;
  }

  if (`/band/${route.params.url}` !== artist.url) {
    outcome.redirect = router.resolve({
      name: 'akordiArtistView',
      params: { url: artist.url.replace(/^\/band\//, '') },
    }).path;
  }

  const viewStore = useViewStore(pinia);
  viewStore.title = artist.title;
  viewStore.goBack = true;
}

async function prefetchDashboard({ pinia }) {
  await useDashboardStore(pinia).load();
}

// Every route that renders SongView (see router/routes.js) — the list
// prefixed ones (/search/, /new/, /top/) are server-rendered too.
const prefetchers = {
  dashboard: prefetchDashboard,
  akordiSongView: prefetchSong,
  songSearchSongView: prefetchSong,
  songListNewSongView: prefetchSong,
  songListTopSongView: prefetchSong,
  songbookViewSongView: prefetchSong,
  tagView: prefetchTag,
  akordiArtistView: prefetchArtist,
};

/**
 * @param {{ route, router, pinia, ssrContext, i18n }} ctx the request's resolved
 *   route, its router, Pinia and i18n, and the per-request HTTP outcome channel
 *   (see entry-server.js) the prefetch may set a status/redirect on.
 * @returns {boolean} whether the route had anything to prefetch — only then
 *   is there state worth transferring to the client.
 */
export default async function prefetchRoute(ctx) {
  const prefetch = prefetchers[ctx.route.name];
  if (!prefetch) {
    return false;
  }
  await prefetch(ctx);
  return true;
}
