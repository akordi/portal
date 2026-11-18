import { defineStore } from 'pinia';
import { ref } from 'vue';
import akordiService from '@/services/akordiService';
import songSummary from '@/utils/songSummary';

/**
 * Holds the most recently fetched song so it can travel from the SSR render
 * to the browser: the server fills it before rendering (see src/ssr/prefetch.js),
 * its state is serialized into the HTML, and the client hydrates it before the
 * app mounts (see src/main.js) — so SongView's first client render matches the
 * server HTML instead of starting from an empty state and refetching.
 */
export default defineStore('songStore', () => {
  const song = ref(null);
  const relatedSongs = ref([]);

  async function load(urlParam) {
    const resp = await akordiService.getSong(akordiService.parseUrl(urlParam));
    song.value = resp.data;
    return song.value;
  }

  /**
   * The held song, but only if it is the one the given /song/:url param
   * refers to — a stale song from an earlier navigation must not be reused.
   */
  function songFor(urlParam) {
    const id = akordiService.parseUrl(urlParam);
    if (id === null || !song.value || song.value.id !== id) {
      return null;
    }
    return song.value;
  }

  /**
   * A capped "more by this artist" list for the song page — loaded here
   * (not useArtistStore, which pages the whole catalogue) and transferred
   * the same way as the song itself so it's in the initial SSR HTML, where
   * it actually counts as crawlable content rather than a client-only extra.
   */
  async function loadRelated(mainArtistId, excludeSongId) {
    const resp = await akordiService.getSongs({
      'artist.id': mainArtistId,
      size: 11,
      offset: 0,
      sort: 'title,asc',
    });
    relatedSongs.value = resp.data.content
      .filter((related) => related.id !== excludeSongId)
      .slice(0, 10)
      .map(songSummary);
  }

  return { song, relatedSongs, load, songFor, loadRelated };
});
