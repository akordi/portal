import { defineStore } from 'pinia';
import { ref } from 'vue';
import akordiService from '@/services/akordiService';
import songSummary from '@/utils/songSummary';

/** The artist page's data, filled before SSR and transferred like songStore. */
export default defineStore('artistStore', () => {
  const artist = ref(null);
  const songs = ref([]);

  async function load(urlParam) {
    const id = akordiService.parseUrl(urlParam);
    const [artistResp, songsResp] = await Promise.all([
      akordiService.getArtist(id),
      // The whole catalogue in one request: the page has no paging.
      akordiService.getSongs({ 'artist.id': id, size: 5000, offset: 0, sort: 'title,asc' }),
    ]);
    artist.value = artistResp.data;
    songs.value = songsResp.data.content.map(songSummary);
    return artist.value;
  }

  function artistFor(urlParam) {
    const id = akordiService.parseUrl(urlParam);
    return id !== null && artist.value?.id === id ? artist.value : null;
  }

  return { artist, songs, load, artistFor };
});
