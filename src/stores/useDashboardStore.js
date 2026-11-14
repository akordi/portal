import { defineStore } from 'pinia';
import { ref } from 'vue';
import akordiService from '@/services/akordiService';

const FEATURED_SONGS = 3;

export default defineStore('dashboardStore', () => {
  const songCountTotal = ref(null);
  // Tags featured on the home page today (set in admin), shown as banners.
  const featuredTags = ref([]);

  // Each featured tag with its most visited songs, linked from the banner.
  async function loadFeatured() {
    try {
      const resp = await akordiService.getFeaturedTags();
      const tags = resp.data.content || [];
      featuredTags.value = await Promise.all(
        tags.map(async (tag) => {
          try {
            const songs = await akordiService.getSongs({
              'tag.id': tag.id,
              size: FEATURED_SONGS,
              sort: 'songTop.visitsWeekly,desc',
              page: 0,
            });
            // Only what the banner links need: this state is sent with the page.
            const topSongs = songs.data.content.map(({ id, title, url }) => ({ id, title, url }));
            return { ...tag, topSongs };
          } catch (err) {
            return { ...tag, topSongs: [] };
          }
        })
      );
    } catch (err) {
      // Optional content: the home page renders fine without it.
      featuredTags.value = [];
    }
  }

  async function load() {
    const [resp] = await Promise.all([akordiService.getSongsCount(), loadFeatured()]);
    songCountTotal.value = resp.data.totalElements;
    return songCountTotal.value;
  }

  return { songCountTotal, featuredTags, load };
});
