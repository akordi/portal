import { defineStore } from 'pinia';
import { ref } from 'vue';
import akordiService from '@/services/akordiService';

export default defineStore('dashboardStore', () => {
  const songCountTotal = ref(null);
  // Tags featured on the home page today (set in admin), shown as banners.
  const featuredTags = ref([]);

  async function loadFeatured() {
    try {
      const resp = await akordiService.getFeaturedTags();
      featuredTags.value = resp.data.content || [];
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
