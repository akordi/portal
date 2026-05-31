<script setup>
import {
  LxButton,
  lxDateUtils,
  LxLoaderView,
  LxModal,
  LxCheckbox,
  LxTextInput,
} from '@dativa-lv/lx-ui';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import AbcViewer from '@/components/AbcViewer.vue';
import { pageview } from 'vue-gtag';
import ChordStrip from '@/components/ChordStrip.vue';
import useAccountPreferencesStore from '@/stores/useAccountPreferencesStore';
import useAuthStore from '@/stores/useAuthStore';
import akordiAdminListService from '@/services/songbookService';
import akordiService from '@/services/akordiService';
import chordsService from '@/services/chordsService';
import useNotifyStore from '@/stores/useNotifyStore';
import useSettingsStore from '@/stores/useSettingsStore';
import useViewStore from '@/stores/useViewStore';

const translate = useI18n();
const $t = translate.t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const settingsStore = useSettingsStore();
const accountPreferencesStore = useAccountPreferencesStore();
const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const isAuthorized = authStore.isAuthenticated();
const addToListModal = ref();
const authRequiredModal = ref();
const userLists = ref([]);
const loadingLists = ref(false);
const userListSelected = ref([]);
const selectedLists = ref([]);
const loadingStates = ref({}); // To track per-list loading
const newSongbookName = ref('');
const creatingSongbook = ref(false);
const songUrlParam = computed(() => route.params.url);
const bodyTransposedIndex = ref(0);
const item = ref({});
const loading = ref(true);
const hasChords = ref(false);
const chords = ref([]);
const hasAbc = computed(() => item.value.bodyAbc);
const fontSize = ref(1);
const offsetFormatted = computed(() => {
  if (bodyTransposedIndex.value > 0) {
    return `+${bodyTransposedIndex.value}`;
  }
  if (bodyTransposedIndex.value < 0) {
    return `${bodyTransposedIndex.value}`;
  }
  return '+0'; // + is added just to avoid shift of the text
});

const autoScrollerSpeed = ref(0);
const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

let speedPxPerSec = 0;
let rafId = null;
let lastFrame = null;
let restartingTimeout = null;
const timeoutLength = 400; // ms
let leftover = 0;
const pauseAutoScroll = ref(false);

const autoScrollerSpeedFormatted = computed(() => {
  if (autoScrollerSpeed.value > 0) {
    return `+${autoScrollerSpeed.value}`;
  }
  return '+0'; // + is added just to avoid shift of the text
});

const autoScrollerIcon = computed(() => {
  if (autoScrollerSpeed.value === 1) {
    return 'status-one-outline';
  }
  if (autoScrollerSpeed.value === 2) {
    return 'status-two-outline';
  }
  if (autoScrollerSpeed.value === 3) {
    return 'status-three-outline';
  }
  if (autoScrollerSpeed.value === 4) {
    return 'status-four-outline';
  }
  if (autoScrollerSpeed.value === 5) {
    return 'status-five-outline';
  }
  return 'play';
});

const autoScrollerUp = () => {
  if (autoScrollerSpeed.value >= 5) {
    autoScrollerSpeed.value = 0;
    return;
  }
  autoScrollerSpeed.value += 1;
};

function applyTranspose(offset) {
  bodyTransposedIndex.value = offset;
  item.value.bodyWithMarkup = chordsService.transpose(item.value.body, bodyTransposedIndex.value);
  hasChords.value = item.value.bodyWithMarkup?.indexOf('<b>') !== -1;
  if (hasChords.value) {
    chords.value = chordsService.extractChords(item.value.bodyWithMarkup);
    chords.value = [...chords.value];
  } else {
    chords.value = [];
  }
}

async function persistTranspose() {
  if (!isAuthorized || !item.value.id) {
    return;
  }
  try {
    await accountPreferencesStore.saveSongTransposeOffset(item.value.id, bodyTransposedIndex.value);
  } catch (err) {
    notificationStore.pushError($t('pages.akordiSongView.transposeSaveError'));
  }
}

async function saveInstrument(instrument) {
  settingsStore.showChords = true;
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

function levelToPxSpeed(level) {
  const basePxByLevel = {
    1: 10,
    2: 20,
    3: 40,
    4: 60,
    5: 80,
  };
  const pixelsPerStep = basePxByLevel[level] || 0;
  return pixelsPerStep;
}

function frame(now) {
  if (!lastFrame) lastFrame = now;

  const elapsed = now - lastFrame;

  const dist = speedPxPerSec * (elapsed / 1000) + leftover;
  const whole = Math.trunc(dist);
  leftover = dist - whole;

  if (whole) window.scrollBy({ top: whole, behavior: 'instant' });

  lastFrame = now - (elapsed % FRAME_INTERVAL);

  rafId = requestAnimationFrame(frame);
}

function resetAnimationFrames() {
  cancelAnimationFrame(rafId);
  rafId = null;
  lastFrame = null;
}

function stopAutoScroll() {
  speedPxPerSec = 0;
  autoScrollerSpeed.value = 0;
  resetAnimationFrames();
}

function startAutoScroll() {
  pauseAutoScroll.value = false;
  resetAnimationFrames();
  rafId = requestAnimationFrame(frame);
}

function shouldIgnoreEvent(event) {
  if (event.target && (event.target.matches('.lx-button') || event.target.closest('.lx-button'))) {
    return true;
  }
  return false;
}

const handleScrollInterruption = (event) => {
  if (shouldIgnoreEvent(event)) {
    return;
  }
  resetAnimationFrames();
};
const handleScrollRestart = () => {
  clearTimeout(restartingTimeout);
  if (!rafId && autoScrollerSpeed.value > 0) {
    pauseAutoScroll.value = true;
    restartingTimeout = setTimeout(() => startAutoScroll(), timeoutLength);
  }
};
// Store event listeners for cleanup
const eventListeners = [];
// Add event listeners with stored references
const addEventListeners = () => {
  // Stop on any manual scroll gesture
  ['wheel', 'touchstart', 'keydown'].forEach((evt) => {
    window.addEventListener(evt, handleScrollInterruption, { passive: true });
    eventListeners.push({ event: evt, handler: handleScrollInterruption });
  });
  // Resume scrolling after inactivity
  window.addEventListener('scroll', handleScrollRestart, { passive: true });
  eventListeners.push({ event: 'scroll', handler: handleScrollRestart });
};
// Remove all event listeners
const removeEventListeners = () => {
  eventListeners.forEach(({ event, handler }) => {
    window.removeEventListener(event, handler);
  });
  eventListeners.length = 0;
};

watch(autoScrollerSpeed, (level) => {
  speedPxPerSec = levelToPxSpeed(level);
  startAutoScroll();
});

const loadSong = async () => {
  try {
    const songId = akordiService.parseUrl(songUrlParam.value);
    const resp = await akordiService.getSong(songId);
    item.value = resp.data;
    item.value.createdAt = lxDateUtils.formatDate(item.value.createdDate);
    let transposeOffset = 0;
    if (isAuthorized) {
      try {
        const preferences = await accountPreferencesStore.getSongPreferences(item.value.id);
        transposeOffset = preferences.transposeOffset || 0;
      } catch (err) {
        notificationStore.pushError($t('pages.akordiSongView.transposeLoadError'));
      }
    }
    applyTranspose(transposeOffset);

    const pagePath = `/song/${songUrlParam.value}`;
    const canonicalUrl = `${window.location.origin}${pagePath}`;
    const pageTitle = `${item.value.mainArtist.title} - ${item.value.title}`;
    if (pagePath !== item.value.url) {
      const songUrl = item.value.url.replace(/^\/song\//, '');
      router.replace({
        name: 'akordiSongView',
        params: { url: songUrl },
      });
    }

    pageview({ page_path: pagePath, page_location: canonicalUrl, page_title: pageTitle });

    const metaDescription = item.value.bodyLyrics?.slice(0, 150) || '';

    useHead({
      title: pageTitle,
      link: [{ rel: 'canonical', href: canonicalUrl }],
      meta: [
        { name: 'description', content: metaDescription },
        { property: 'og:title', content: pageTitle },
        { property: 'og:description', content: metaDescription },
        { property: 'og:url', content: canonicalUrl },
      ],
    });

    viewStore.title = item.value.title;
    viewStore.description =
      item.value.mainArtist?.title ||
      item.value.performers.map((artist) => artist.title).join(', ');
    viewStore.goBack = true;
  } catch (err) {
    notificationStore.pushError('Failed to load song');
    throw err;
  } finally {
    loading.value = false;
  }
};

async function createSongbookAndAddSong() {
  const name = newSongbookName.value.trim();
  if (!name) {
    notificationStore.pushError($t('pages.akordiSongView.createSongbook.nameRequired'));
    return;
  }

  creatingSongbook.value = true;
  try {
    const resp = await akordiAdminListService.save({ name });
    const list = {
      ...resp.data,
      id: String(resp.data.id),
      title: resp.data.name,
      songCount: 1,
    };
    await akordiAdminListService.addSong(list.id, item.value.id);

    userLists.value.unshift(list);
    userListSelected.value.push(list.id);
    selectedLists.value = userListSelected.value.map((id) => String(id));
    newSongbookName.value = '';
    notificationStore.pushSuccess($t('pages.akordiSongView.createSongbook.success'));
  } catch (err) {
    notificationStore.pushError($t('pages.akordiSongView.createSongbook.error'));
  } finally {
    creatingSongbook.value = false;
  }
}

async function actionClicked(action) {
  const actionName = typeof action === 'string' ? action : action?.id;

  if (actionName === 'addToList') {
    if (!isAuthorized) {
      authRequiredModal.value.open();
      return;
    }
    try {
      loadingLists.value = true;
      const resp = await akordiAdminListService.findAll();
      userLists.value = resp.data.map((list) => ({
        ...list,
        id: String(list.id),
        title: list.name,
      }));

      const songbooksResp = await akordiAdminListService.getSongSongbooks(item.value.id);
      userListSelected.value = songbooksResp.data || [];
      selectedLists.value = userListSelected.value?.map((id) => String(id));

      addToListModal.value.open();
    } catch (err) {
      notificationStore.pushError($t('errors.loadFailed'));
    } finally {
      loadingLists.value = false;
    }
  }
  if (actionName === 'cancel') {
    router.back();
  }
  if (actionName === 'close') {
    addToListModal.value?.close();
    authRequiredModal.value?.close();
  }
  if (actionName === 'authenticate') {
    await authStore.login(route.fullPath);
  }
  if (actionName === 'suggestEdit') {
    router.push({ name: 'songEdit', query: { id: item.value.id } });
  }
  if (actionName === 'hideChords') {
    settingsStore.showChords = !settingsStore.showChords;
  }
  if (actionName === 'showGuitarChords') {
    await saveInstrument('guitar');
  }
  if (actionName === 'showAbc') {
    settingsStore.showAbc = !settingsStore.showAbc;
  }
  if (actionName === 'showUkuleleChords') {
    await saveInstrument('ukulele');
  }
  if (actionName === 'showBaritoneUkuleleChords') {
    await saveInstrument('baritone-ukulele');
  }

  if (actionName === 'transposeUp') {
    bodyTransposedIndex.value += 1;
    if (bodyTransposedIndex.value > 11) {
      bodyTransposedIndex.value = 0; // 12 is back to original key
    }
    applyTranspose(bodyTransposedIndex.value);
    await persistTranspose();
  }
  if (actionName === 'transposeDown') {
    bodyTransposedIndex.value -= 1;
    if (bodyTransposedIndex.value < -11) {
      bodyTransposedIndex.value = 0; // 12 is back to original key
    }
    applyTranspose(bodyTransposedIndex.value);
    await persistTranspose();
  }
  if (actionName === 'fontUp') {
    fontSize.value += 0.2;
  }
  if (actionName === 'fontDown') {
    fontSize.value -= 0.2;
  }
}

async function toggleListSelection(listId, value) {
  loadingStates.value[listId] = true;
  try {
    if (value) {
      await akordiAdminListService.addSong(listId, item.value.id);
      userListSelected.value.push(listId);
      notificationStore.pushSuccess($t('pages.akordiSongView.addToList.success'));
    } else {
      await akordiAdminListService.removeSong(listId, item.value.id);
      userListSelected.value = userListSelected.value.filter((id) => id !== listId);
      notificationStore.pushSuccess($t('pages.akordiSongView.removeFromList.success'));
    }
    selectedLists.value = userListSelected.value.map((id) => String(id));
  } catch (err) {
    if (value) {
      notificationStore.pushError($t('pages.akordiSongView.addToList.error'));
      // Revert checkbox state
      selectedLists.value = selectedLists.value.filter((id) => id !== String(listId));
    } else {
      notificationStore.pushError($t('pages.akordiSongView.removeFromList.error'));
      // Revert checkbox state
      if (!selectedLists.value.includes(String(listId))) {
        selectedLists.value.push(String(listId));
      }
    }
  } finally {
    loadingStates.value[listId] = false;
  }
}

onMounted(async () => {
  addEventListeners();
  await loadSong();
});

onUnmounted(() => {
  removeEventListeners();
  clearTimeout(restartingTimeout);
  stopAutoScroll();
  viewStore.$reset();
});
</script>
<style>
.akordi-song {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: calc(var(--toolbar-h, 56px) + 1.5rem);
}

.akordi-song-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.6rem 0.75rem;
}

.akordi-song-dates {
  margin: 0;
  color: var(--c-ink3);
  font-size: 0.78rem;
}

.akordi-song-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.akordi-song-section {
  background: var(--color-region);
  border: 1px solid var(--color-chrome);
  border-radius: 1rem;
  padding: 1rem 1.25rem;
  box-shadow: var(--shadow-1);
}

.lyrics-card .pre.lyrics-body {
  white-space: pre;
  font-family: var(--font-family-mono);
  color: var(--c-ink1);
  line-height: 1.7;
  padding: 1rem 1.25rem;
  margin: 0;
  overflow-x: auto;
}

.lyrics-card .lyrics-ref {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--color-chrome);
  font: 0.72rem/1.5 var(--font-family);
  color: var(--c-ink3);
}
.lyrics-card .lyrics-ref a {
  color: var(--c-ink3);
  text-decoration: underline;
  text-underline-offset: 2px;
}

/* Sticky bottom toolbar — mirrors song-view.html .song-toolbar */
.akordi-song-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--toolbar-h, 56px);
  background: var(--color-region);
  border-top: 1px solid var(--color-chrome);
  box-shadow: var(--shadow-up, 0 -4px 20px rgba(7, 0, 77, 0.1));
  display: flex;
  align-items: center;
  padding: 0 1rem;
  z-index: 90;
}

.akordi-song-toolbar .tg {
  display: flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0 0.75rem;
  border-right: 1px solid var(--color-chrome);
}
.akordi-song-toolbar .tg:first-child {
  padding-left: 0;
}
.akordi-song-toolbar .tg:last-child {
  border-right: none;
  padding-right: 0;
  margin-left: auto;
}

.akordi-song-toolbar .tg-label {
  font: 500 0.72rem/1 var(--font-family);
  color: var(--c-ink3);
  white-space: nowrap;
  min-width: 2.5rem;
  text-align: center;
}

@media (max-width: 600px) {
  .akordi-song-toolbar .tg-label {
    display: none;
  }
  .akordi-song-toolbar .tg {
    padding: 0 0.4rem;
  }
}

.songbook-picker {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.songbook-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}
.songbook-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.625rem 1rem;
  border: 1px solid var(--color-chrome);
  border-radius: 0.625rem;
  background-color: var(--color-region);
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.songbook-row:hover {
  border-color: var(--color-brand);
}
.songbook-row-selected {
  border-color: var(--color-brand);
  background-color: var(--color-highlight-background);
}
.songbook-row-count {
  flex: 0 0 auto;
  color: var(--color-label);
  font-size: var(--small-font-size);
  white-space: nowrap;
}
.songbook-new {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding-top: 0.25rem;
}
.songbook-new > :first-child {
  flex: 1 1 auto;
}
</style>
<template>
  <LxLoaderView :loading="loading">
    <article class="akordi-song" id="song-view">
      <header class="akordi-song-meta" v-if="item.id">
        <div class="akordi-tag-set" v-if="item.tags?.length > 0">
          <router-link
            v-for="tag in item.tags"
            :key="tag.id"
            :to="{ name: 'tagView', params: { url: tag.url.replace(/^\/tag\//, '') } }"
            class="akordi-chip"
          >{{ tag.title }}</router-link>
        </div>
        <p class="akordi-song-dates lx-description">
          {{ $t('song.createdAt') }} {{ item.createdAt }}
          <template v-if="item.updatedDate && item.updatedDate !== item.createdDate">
            · {{ $t('song.updatedAt') }} {{ lxDateUtils.formatDate(item.updatedDate) }}
          </template>
        </p>
      </header>

      <div class="akordi-song-actions" v-if="item.id">
        <LxButton
          kind="ghost"
          icon="edit"
          :label="$t('suggestEdit')"
          @click="actionClicked('suggestEdit')"
        />
        <LxButton
          kind="ghost"
          icon="add"
          :label="$t('pages.akordiSongView.addToList.label')"
          @click="actionClicked('addToList')"
        />
      </div>

      <section v-show="hasAbc && settingsStore.showAbc" class="akordi-song-section">
        <AbcViewer
          :abc="item.bodyAbc"
          @audio-unsupported="
            notificationStore.pushWarning($t('pages.akordiSongView.audioNotSupported'))
          "
        />
      </section>

      <ChordStrip
        v-show="hasChords"
        :chords="chords"
        :instrument="settingsStore.instrument"
        :show-chords="settingsStore.showChords"
        @update:instrument="saveInstrument"
        @update:show-chords="settingsStore.showChords = $event"
      />

      <section class="akordi-card lyrics-card">
        <header class="akordi-card-header">
          <span class="akordi-card-title">{{
            $t('pages.akordiSongView.lyricsTitle', 'Dziesmu vārdi un akordi')
          }}</span>
        </header>
        <p class="pre lyrics-body" v-html="item.bodyWithMarkup" :style="{ fontSize: fontSize + 'em' }"></p>
        <footer class="lyrics-ref" v-if="item.reference">
          {{ $t('song.reference') }}:
          <a :href="item.reference" target="_blank" rel="noopener noreferrer">{{ item.reference }}</a>
        </footer>
      </section>
    </article>

    <footer class="akordi-song-toolbar" v-if="item.id">
      <div class="tg">
        <span class="tg-label">{{
          $t('pages.akordiSongView.transposeHeader', { offset: offsetFormatted })
        }}</span>
        <LxButton
          kind="ghost"
          variant="icon-only"
          icon="move-up"
          :label="$t('pages.akordiSongView.transposeUp.label')"
          @click="actionClicked('transposeUp')"
        />
        <LxButton
          kind="ghost"
          variant="icon-only"
          icon="move-down"
          :label="$t('pages.akordiSongView.transposeDown.label')"
          @click="actionClicked('transposeDown')"
        />
      </div>
      <div class="tg">
        <span class="tg-label">{{ $t('pages.akordiSongView.fontUp.label') }}</span>
        <LxButton
          kind="ghost"
          variant="icon-only"
          icon="zoom-in"
          :label="$t('pages.akordiSongView.fontUp.label')"
          @click="actionClicked('fontUp')"
        />
        <LxButton
          kind="ghost"
          variant="icon-only"
          icon="zoom-out"
          :label="$t('pages.akordiSongView.fontDown.label')"
          @click="actionClicked('fontDown')"
        />
      </div>
      <div class="tg">
        <span class="tg-label">{{
          $t('pages.akordiSongView.autoScroll.label', { speed: autoScrollerSpeedFormatted })
        }}</span>
        <LxButton
          kind="ghost"
          variant="icon-only"
          :icon="pauseAutoScroll ? 'pause' : autoScrollerIcon"
          :active="autoScrollerSpeed > 0"
          :label="$t('pages.akordiSongView.autoScroll.playDescription')"
          @click="autoScrollerUp"
        />
        <LxButton
          kind="ghost"
          variant="icon-only"
          icon="stop"
          :label="$t('pages.akordiSongView.autoScroll.stopDescription')"
          @click="autoScrollerSpeed = 0"
        />
      </div>
    </footer>
  </LxLoaderView>

  <LxModal
    ref="addToListModal"
    :label="$t('pages.akordiSongView.addToList.label')"
    size="m"
    :action-definitions="[{ id: 'close', name: $t('cancel'), kind: 'secondary' }]"
    @action-click="actionClicked"
  >
    <div class="songbook-picker">
      <ul class="songbook-list" v-if="userLists.length">
        <li
          v-for="list in userLists"
          :key="list.id"
          class="songbook-row"
          :class="{ 'songbook-row-selected': selectedLists.includes(String(list.id)) }"
        >
          <LxCheckbox
            :id="'list-' + list.id"
            :label="list.title"
            :model-value="selectedLists.includes(String(list.id))"
            :disabled="loadingStates[list.id]"
            @update:model-value="(val) => toggleListSelection(list.id, val)"
          />
          <span class="songbook-row-count">
            {{ $t('pages.akordiSongView.addToList.songCount', { count: list.songCount ?? 0 }) }}
          </span>
        </li>
      </ul>

      <form class="songbook-new" @submit.prevent="createSongbookAndAddSong">
        <LxTextInput
          v-model="newSongbookName"
          :placeholder="$t('pages.akordiSongView.createSongbook.placeholder')"
          :disabled="creatingSongbook"
          @keyup.enter="createSongbookAndAddSong"
        />
        <LxButton
          icon="add"
          kind="ghost"
          :label="$t('pages.akordiSongView.createSongbook.action')"
          :busy="creatingSongbook"
          :disabled="!newSongbookName.trim()"
          @click="createSongbookAndAddSong"
        />
      </form>
    </div>
  </LxModal>

  <LxModal
    ref="authRequiredModal"
    :label="$t('pages.akordiSongView.authRequired.title')"
    size="m"
    :actionDefinitions="[
      { id: 'authenticate', name: $t('pages.akordiSongView.authRequired.login'), icon: 'next' },
      { id: 'close', name: $t('cancel'), kind: 'secondary' },
    ]"
    @action-click="actionClicked"
  >
    <p class="lx-description">
      {{ $t('pages.akordiSongView.authRequired.description') }}
    </p>
  </LxModal>
</template>
