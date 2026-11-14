import { defineStore } from 'pinia';
import { ref } from 'vue';
import akordiService from '@/services/akordiService';
import { POPULAR_COUNT } from '@/utils/popularSongs';
import songSummary from '@/utils/songSummary';

const PAGE_SIZE = 100;

function songsQuery(id, extra) {
  return akordiService.getSongs({ 'tag.id': id, ...extra });
}

/**
 * The tag page's data: the tag, its most visited songs and its song list.
 * Filled before SSR and transferred to the browser like songStore.
 */
export default defineStore('tagStore', () => {
  const tag = ref(null);
  const popular = ref([]);
  const songs = ref([]);
  const total = ref(0);
  const page = ref(0);

  async function load(urlParam) {
    const id = akordiService.parseUrl(urlParam);
    const [tagResp, songsResp, popularResp] = await Promise.all([
      akordiService.getTag(id),
      songsQuery(id, { size: PAGE_SIZE, sort: 'title,asc', page: 0 }),
      songsQuery(id, { size: POPULAR_COUNT, sort: 'songTop.visitsWeekly,desc', page: 0 }),
    ]);
    tag.value = tagResp.data;
    songs.value = songsResp.data.content.map(songSummary);
    total.value = songsResp.data.totalElements;
    page.value = 0;
    popular.value = popularResp.data.content.map(songSummary);
    return tag.value;
  }

  async function loadMore() {
    const resp = await songsQuery(tag.value.id, {
      size: PAGE_SIZE,
      sort: 'title,asc',
      page: page.value + 1,
    });
    page.value += 1;
    songs.value = [...songs.value, ...resp.data.content.map(songSummary)];
  }

  function tagFor(urlParam) {
    const id = akordiService.parseUrl(urlParam);
    return id !== null && tag.value?.id === id ? tag.value : null;
  }

  return { tag, popular, songs, total, page, load, loadMore, tagFor };
});
