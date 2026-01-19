import { defineStore } from 'pinia';
import { useStorage } from '@vueuse/core';

export default defineStore('settingsStore', () => {
  const instrument = useStorage('settings:instrument', 'guitar');
  const showChords = useStorage('settings:showChords', true);
  const showAbc = useStorage('settings:showAbc', false);

  return {
    instrument,
    showChords,
    showAbc,
  };
});
