import { defineStore } from 'pinia';
import { ref } from 'vue';
import akordiService from '@/services/akordiService';

/**
 * Holds the most recently fetched song so it can travel from the SSR render
 * to the browser: the server fills it before rendering (see src/ssr/prefetch.js),
 * its state is serialized into the HTML, and the client hydrates it before the
 * app mounts (see src/main.js) — so SongView's first client render matches the
 * server HTML instead of starting from an empty state and refetching.
 */
export default defineStore('songStore', () => {
  const song = ref(null);

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

  return { song, load, songFor };
});
