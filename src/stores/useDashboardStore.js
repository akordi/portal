import { defineStore } from 'pinia';
import { ref } from 'vue';
import akordiService from '@/services/akordiService';

export default defineStore('dashboardStore', () => {
  const songCountTotal = ref(null);

  async function load() {
    const resp = await akordiService.getSongsCount();
    songCountTotal.value = resp.data.totalElements;
    return songCountTotal.value;
  }

  return { songCountTotal, load };
});
