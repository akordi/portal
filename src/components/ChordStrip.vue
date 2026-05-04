<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { LxContentSwitcher, LxButton } from '@dativa-lv/lx-ui';
import ChordSvg from '@/components/ChordSvg.vue';

const props = defineProps({
  chords: { type: Array, default: () => [] },
  instrument: { type: String, default: 'guitar' },
  showChords: { type: Boolean, default: true },
});

const emit = defineEmits(['update:instrument', 'update:showChords']);

const { t: $t } = useI18n();

const instrumentOptions = computed(() => [
  { id: 'guitar', name: $t('pages.chordsLibrary.showGuitarChords.label') },
  { id: 'ukulele', name: $t('pages.chordsLibrary.showUkuleleChords.label') },
  { id: 'baritone-ukulele', name: $t('pages.chordsLibrary.showBaritoneUkuleleChords.label') },
]);

function selectInstrument(id) {
  emit('update:instrument', id);
}

function toggleChords() {
  emit('update:showChords', !props.showChords);
}
</script>

<template>
  <section
    class="akordi-card chord-strip"
    role="region"
    :aria-label="$t('pages.akordiSongView.chords', 'Akordi')"
  >
    <header class="akordi-card-header chord-strip-header">
      <span class="akordi-card-title">{{ $t('pages.akordiSongView.chords', 'Akordi') }}</span>
      <LxContentSwitcher
        v-show="showChords"
        :items="instrumentOptions"
        :model-value="instrument"
        id="chord-strip-instrument"
        @update:model-value="selectInstrument"
      />
      <LxButton
        kind="ghost"
        variant="icon-only"
        :icon="showChords ? 'visible' : 'hidden'"
        :label="$t('pages.akordiSongView.hideChords.label')"
        :active="!showChords"
        @click="toggleChords"
      />
    </header>

    <div v-show="showChords" class="chord-strip-scroll">
      <div class="chord-strip-inner">
        <ChordSvg
          v-for="chord in chords"
          :key="chord"
          :chord="chord"
          :instrument="instrument"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.chord-strip {
  margin-bottom: 1rem;
}

.chord-strip-header :deep(.lx-content-switcher) {
  flex-shrink: 0;
}

.chord-strip-scroll {
  padding: 0.75rem 1rem 1rem;
}

.chord-strip-inner {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: flex-start;
}

@media (max-width: 600px) {
  .chord-strip-header {
    padding: 0.6rem 0.75rem;
    flex-wrap: wrap;
  }
}
</style>
