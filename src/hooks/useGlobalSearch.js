import { ref } from 'vue';
import axios from 'axios';
import akordiService from '@/services/akordiService';

const ARTIST_LIMIT = 3;
const SONG_LIMIT = 6;

async function searchSongs(q, signal) {
  const params = { size: SONG_LIMIT, skip: 0 };
  const resp = await akordiService.quickSearch(q, params, signal);
  if (resp.data.value?.length) return resp.data.value;
  return (await akordiService.quickSearch(`${q}*`, params, signal)).data.value || [];
}

async function searchArtists(q) {
  try {
    const resp = await akordiService.searchArtist(q);
    return resp.data.content || [];
  } catch {
    return [];
  }
}

export default function useGlobalSearch() {
  const items = ref([]);
  const loading = ref(false);
  let controller = null;

  async function search(q) {
    controller?.abort();
    controller = new AbortController();
    const { signal } = controller;
    loading.value = true;
    try {
      const [artists, songs] = await Promise.all([searchArtists(q), searchSongs(q, signal)]);
      if (signal.aborted) return;
      items.value = [
        ...artists.slice(0, ARTIST_LIMIT).map((a) => ({
          id: `artist-${a.id}`,
          name: `${a.title} (${a.songCount})`,
          icon: 'users',
          href: a.url,
        })),
        ...songs.map((s) => ({
          id: `song-${s.id}`,
          name: `${s.mainArtistTitle} – ${s.title}`,
          href: s.url,
        })),
      ];
    } catch (err) {
      if (axios.isCancel(err)) return;
      items.value = [];
    } finally {
      if (!signal.aborted) loading.value = false;
    }
  }

  return { items, loading, search };
}
