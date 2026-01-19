<script setup>
import { computed, ref, shallowRef, watchEffect } from 'vue';
import { LxContentSwitcher, LxRow, LxLoaderView } from '@wntr/lx-ui';
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
];

watchEffect(async () => {
  loading.value = true;
  try {
    let db;
    if (settingsStore.instrument === 'ukulele') {
      db = await import('@tombatossals/chords-db/lib/ukulele.json');
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
  const musicalOrder = [
    'C',
    'C#',
    'Db',
    'D',
    'D#',
    'Eb',
    'E',
    'F',
    'F#',
    'Gb',
    'G',
    'G#',
    'Ab',
    'A',
    'A#',
    'Bb',
    'B',
  ];
  const keys = Object.keys(currentDb.value.chords);

  return keys.sort((a, b) => {
    let indexA = musicalOrder.indexOf(a);
    let indexB = musicalOrder.indexOf(b);

    // Fallback for unknown keys (shouldn't happen with standard DB) to end of list
    if (indexA === -1) indexA = 999;
    if (indexB === -1) indexB = 999;

    // Secondary sort alphabetical for unknown keys or same index (unlikely)
    if (indexA === indexB) return a.localeCompare(b);

    return indexA - indexB;
  });
});

const filteredChords = computed(() => {
  if (!currentDb.value?.chords || !selectedKey.value) return [];
  const rootChords = currentDb.value.chords[selectedKey.value];
  if (!rootChords) return [];
  return rootChords;
});

const keysSwitcherItems = computed(() =>
  availableKeys.value.map((k) => ({
    id: k,
    name: k.replace('sharp', '#'),
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
