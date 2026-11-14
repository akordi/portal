import { defineStore } from 'pinia';
import { ref } from 'vue';
import akordiService from '@/services/akordiService';

export default defineStore('dashboardStore', () => {
  const songCountTotal = ref(null);
  const featuredTags = ref([]);

  async function loadFeatured() {
    try {
      featuredTags.value = (await akordiService.getFeaturedTags()).data.content || [];
    } catch {
      // Optional: the home page renders fine without banners.
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
