import { defineStore } from 'pinia';
import { ref } from 'vue';

import preferenceService from '@/services/preferenceService';
import useSettingsStore from '@/stores/useSettingsStore';

const defaultPreferences = {
  instrument: 'guitar',
};

export default defineStore('accountPreferencesStore', () => {
  const preferences = ref({ ...defaultPreferences });
  const loading = ref(false);
  const loaded = ref(false);

  async function loadPreferences() {
    loading.value = true;
    try {
      const resp = await preferenceService.getPreferences();
      preferences.value = {
        ...defaultPreferences,
        ...resp.data,
      };
      useSettingsStore().instrument = preferences.value.instrument;
      loaded.value = true;
      return preferences.value;
    } finally {
      loading.value = false;
    }
  }

  async function saveInstrument(instrument) {
    useSettingsStore().instrument = instrument;
    preferences.value.instrument = instrument;
    const resp = await preferenceService.savePreferences({ instrument });
    preferences.value = {
      ...defaultPreferences,
      ...resp.data,
    };
    loaded.value = true;
    return preferences.value;
  }

  async function getSongPreferences(songId) {
    const resp = await preferenceService.getSongPreferences(songId);
    return resp.data;
  }

  async function saveSongTransposeOffset(songId, transposeOffset) {
    const resp = await preferenceService.saveSongPreferences(songId, { transposeOffset });
    return resp.data;
  }

  function $reset() {
    preferences.value = { ...defaultPreferences };
    loaded.value = false;
    loading.value = false;
  }

  return {
    preferences,
    loading,
    loaded,
    loadPreferences,
    saveInstrument,
    getSongPreferences,
    saveSongTransposeOffset,
    $reset,
  };
});
