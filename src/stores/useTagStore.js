import { defineStore } from 'pinia';
import { ref } from 'vue';
import akordiService from '@/services/akordiService';

const PAGE_SIZE = 100;
const POPULAR_SIZE = 10;

/**
 * The tag page's data: the tag, its most visited songs and its song list.
 * Filled before SSR (src/ssr/prefetch.js) and transferred to the browser like
 * songStore, so TagView hydrates without refetching.
 */
export default defineStore('tagStore', () => {
  const tag = ref(null);
  const popular = ref([]);
  const songs = ref([]);
  const total = ref(0);
  const page = ref(0);

  function songsQuery(id, extra) {
    return akordiService.getSongs({ 'tag.id': id, ...extra });
  }

  async function load(urlParam) {
    const id = akordiService.parseUrl(urlParam);
    const [tagResp, songsResp, popularResp] = await Promise.all([
      akordiService.getTag(id),
      songsQuery(id, { size: PAGE_SIZE, sort: 'title,asc', page: 0 }),
      songsQuery(id, { size: POPULAR_SIZE, sort: 'songTop.visitsWeekly,desc', page: 0 }),
    ]);
    tag.value = tagResp.data;
    songs.value = songsResp.data.content;
    total.value = songsResp.data.totalElements;
    page.value = 0;
    // Only worth a separate section when it isn't simply the whole list.
    popular.value = total.value > POPULAR_SIZE ? popularResp.data.content : [];
    return tag.value;
  }

  async function loadMore() {
    const resp = await songsQuery(tag.value.id, {
      size: PAGE_SIZE,
      sort: 'title,asc',
      page: page.value + 1,
    });
    page.value += 1;
    songs.value = [...songs.value, ...resp.data.content];
  }

  /** The held tag, only if it is the one the /tag/:url param refers to. */
  function tagFor(urlParam) {
    const id = akordiService.parseUrl(urlParam);
    return id !== null && tag.value?.id === id ? tag.value : null;
  }

  return { tag, popular, songs, total, page, load, loadMore, tagFor };
});
