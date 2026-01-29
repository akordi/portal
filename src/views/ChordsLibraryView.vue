<script setup>
import { computed, ref, shallowRef, watchEffect } from 'vue';
import { LxContentSwitcher, LxRow, LxLoaderView } from '@dativa-lv/lx-ui';
import ChordSvg from '@/components/ChordSvg.vue';
import useSettingsStore from '@/stores/useSettingsStore';
import { useI18n } from 'vue-i18n';

const settingsStore = useSettingsStore();
const translate = useI18n();
const $t = translate.t;

const loading = ref(true);
const currentDb = shallowRef(null);
const selectedKey = ref('C');

const instrumentOptions = [
  { id: 'guitar', name: $t('pages.chordsLibrary.showGuitarChords.label') },
  { id: 'ukulele', name: $t('pages.chordsLibrary.showUkuleleChords.label') },
  { id: 'baritone-ukulele', name: $t('pages.chordsLibrary.showBaritoneUkuleleChords.label') },
];

watchEffect(async () => {
  loading.value = true;
  try {
    let db;
    if (settingsStore.instrument === 'ukulele') {
      db = await import('@tombatossals/chords-db/lib/ukulele.json');
    } else if (settingsStore.instrument === 'baritone-ukulele') {
      db = await import('@/db/baritone-ukulele.json');
    } else {
      db = await import('@tombatossals/chords-db/lib/guitar.json');
    }
    currentDb.value = db.default;
  } finally {
    loading.value = false;
  }
});

const availableKeys = computed(() => {
  if (!currentDb.value?.chords) return [];

  const rawKeys = Object.keys(currentDb.value.chords);
  const normalizedSet = new Set();

  rawKeys.forEach((k) => {
    // Normalize to Flat convention for UI
    let normalized = k;
    if (k === 'C#' || k === 'Csharp') normalized = 'Db';
    if (k === 'D#' || k === 'Dsharp') normalized = 'Eb';
    if (k === 'F#' || k === 'Fsharp') normalized = 'Gb';
    if (k === 'G#' || k === 'Gsharp') normalized = 'Ab';
    if (k === 'A#' || k === 'Asharp') normalized = 'Bb';
    normalizedSet.add(normalized);
  });

  const uniqueKeys = Array.from(normalizedSet);

  const musicalOrder = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

  return uniqueKeys.sort((a, b) => {
    let indexA = musicalOrder.indexOf(a);
    let indexB = musicalOrder.indexOf(b);

    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;

    if (indexA === indexB) return a.localeCompare(b);
    return indexA - indexB;
  });
});

const filteredChords = computed(() => {
  if (!currentDb.value?.chords || !selectedKey.value) return [];

  // Find the key in the DB that matches the selected normalized key
  // E.g. if selected is 'Db', look for 'Db', 'C#', or 'Csharp'
  let dbKey = selectedKey.value;

  // Helper to check if a key exists in DB
  const exists = (k) => !!currentDb.value.chords[k];

  if (!exists(dbKey)) {
    // Try alternatives
    const map = {
      Db: ['C#', 'Csharp'],
      Eb: ['D#', 'Dsharp'],
      Gb: ['F#', 'Fsharp'],
      Ab: ['G#', 'Gsharp'],
      Bb: ['A#', 'Asharp'],
    };

    if (map[dbKey]) {
      const alt = map[dbKey].find((k) => exists(k));
      if (alt) dbKey = alt;
    }
  }

  const rootChords = currentDb.value.chords[dbKey];
  if (!rootChords) return [];
  return rootChords;
});

const keysSwitcherItems = computed(() =>
  availableKeys.value.map((k) => ({
    id: k,
    name: k,
  }))
);

function selectKey(id) {
  selectedKey.value = id;
}
</script>

<style scoped>
.chord-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}
.chord-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}
.chord-name {
  margin-top: 0.5rem;
  font-weight: bold;
}
</style>

<template>
  <LxLoaderView :loading="loading" kind="pane">
    <div class="lx-layout-column">
      <LxRow :label="$t('pages.chordsLibrary.instrument')">
        <LxContentSwitcher
          :items="instrumentOptions"
          v-model="settingsStore.instrument"
          id="instrument-switcher"
        />
      </LxRow>

      <LxRow :label="$t('pages.chordsLibrary.key')">
        <div style="display: flex; flex-wrap: wrap; gap: 0.5rem">
          <LxContentSwitcher
            :items="keysSwitcherItems"
            :model-value="selectedKey"
            @update:model-value="selectKey"
            id="key-switcher"
          />
        </div>
      </LxRow>

      <div class="chord-grid" v-if="filteredChords.length">
        <div v-for="chord in filteredChords" :key="chord.suffix" class="chord-item">
          <ChordSvg
            :root="chord.key.replace('sharp', '#')"
            :suffix="chord.suffix"
            :instrument="settingsStore.instrument"
          />
        </div>
      </div>
      <div v-else-if="!loading">
        <p class="lx-description">
          {{ $t('pages.chordsLibrary.noChords') }}
        </p>
      </div>
    </div>
  </LxLoaderView>
</template>
