<script setup>
import { LxLoaderView, LxRating } from '@dativa-lv/lx-ui';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import ChordPlayer from '@/components/ChordPlayer.vue';
import chordgenSongService from '@/services/chordgenSongService';
import useAccountPreferencesStore from '@/stores/useAccountPreferencesStore';
import useAuthStore from '@/stores/useAuthStore';
import useNotifyStore from '@/stores/useNotifyStore';
import useSettingsStore from '@/stores/useSettingsStore';
import useViewStore from '@/stores/useViewStore';

const $t = useI18n().t;
const route = useRoute();
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const authStore = useAuthStore();
const settingsStore = useSettingsStore();
const accountPreferencesStore = useAccountPreferencesStore();
const isAuthorized = authStore.isAuthenticated();

const loading = ref(true);
const song = ref({});
const myRating = ref(null);

const ratingSummary = computed(() => {
  if (!song.value.ratingsCount) {
    return $t('pages.chordGenerator.rating.none');
  }
  return `${(song.value.averageRating || 0).toFixed(1)} (${song.value.ratingsCount})`;
});

// Artist is optional — don't show a dangling "— Title" when it's blank.
const displayTitle = computed(() =>
  song.value.artist ? `${song.value.artist} — ${song.value.title}` : song.value.title || ''
);

async function loadSong() {
  try {
    loading.value = true;
    const resp = await chordgenSongService.findOne(route.params.id);
    song.value = resp.data;
    viewStore.title = displayTitle.value;
    viewStore.description = '';
    viewStore.goBack = true;
  } catch (err) {
    notificationStore.pushError($t('pages.chordGenerator.errors.loadFailed'));
  } finally {
    loading.value = false;
  }
}

async function loadMyRating() {
  try {
    const resp = await chordgenSongService.getMyRating(route.params.id);
    myRating.value = resp.data.rating ?? null;
  } catch (err) {
    // Own-rating fetch is a nice-to-have — leave the control unset on failure.
  }
}

// Same behaviour as SongView/ChordsLibraryView: the choice applies immediately
// for everyone (device-local setting) and is also saved to the account
// preferences when signed in.
async function selectInstrument(instrument) {
  settingsStore.instrument = instrument;
  if (!isAuthorized) {
    return;
  }
  try {
    await accountPreferencesStore.saveInstrument(instrument);
  } catch (err) {
    notificationStore.pushError($t('pages.userProfile.preferences.saveError'));
  }
}

async function onRate(value) {
  const previous = myRating.value;
  myRating.value = value;
  try {
    const resp = await chordgenSongService.submitRating(route.params.id, value);
    song.value.averageRating = resp.data.averageRating;
    song.value.ratingsCount = resp.data.ratingsCount;
  } catch (err) {
    myRating.value = previous;
    notificationStore.pushError($t('pages.chordGenerator.errors.submitFailed'));
  }
}

onMounted(async () => {
  await loadSong();
  if (isAuthorized) {
    await loadMyRating();
  }
});
</script>

<template>
  <LxLoaderView :loading="loading">
    <!-- The page header (viewStore.title, set in loadSong) already shows the
         title — no need to repeat it here. -->
    <ChordPlayer
      :video-url="song.youtubeUrl"
      :segments="song.segments"
      :duration="song.duration"
      show-diagrams
      :instrument="settingsStore.instrument"
      @update:instrument="selectInstrument"
    />

    <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 1rem">
      <LxRating :model-value="song.averageRating || 0" read-only kind="5stars" :focusable="false" />
      <span class="lx-secondary">{{ ratingSummary }}</span>
    </div>

    <div
      v-if="isAuthorized"
      style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem"
    >
      <span class="lx-label">{{ $t('pages.chordGenerator.rating.yours') }}</span>
      <LxRating :model-value="myRating || 0" kind="5stars" @update:model-value="onRate" />
    </div>
  </LxLoaderView>
</template>
