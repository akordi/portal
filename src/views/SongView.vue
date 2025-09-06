<script setup>
import {
  LxButton,
  lxDateUtils,
  LxForm,
  LxLoaderView,
  LxRow,
  LxSection,
  LxToolbar,
  LxToolbarGroup,
} from '@wntr/lx-ui';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import { useHead } from '@vueuse/head';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import AbcViewer from '@/components/AbcViewer.vue';
import { pageview } from 'vue-gtag';
import ChordSvg from '@/components/ChordSvg.vue';
import akordiService from '@/services/akordiService';
import chordsService from '@/services/chordsService';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';

const translate = useI18n();
const $t = translate.t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const router = useRouter();
const route = useRoute();
const songUrlParam = computed(() => route.params.url);
const bodyTransposedIndex = ref(0);
const item = ref({});
const loading = ref(true);
const hasChords = ref(false);
const chords = ref([]);
const showChords = ref(true);
const instrument = ref('guitar');
const hasAbc = computed(() => item.value.bodyAbc);
const showAbc = ref(false);
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
    item.value.bodyWithMarkup = chordsService.transpose(item.value.body, 0);
    hasChords.value = item.value.bodyWithMarkup?.indexOf('<b>') !== -1;
    if (hasChords.value) {
      chords.value = chordsService.extractChords(item.value.bodyWithMarkup);
      chords.value = [...chords.value];
    }
    const pagePath = `/song/${songUrlParam.value}`;
    const canonicalUrl = `${window.location.origin}${pagePath}`;
    const pageTitle = `${item.value.mainArtist.title} - ${item.value.title}`;
    pageview({ page_path: pagePath, page_location: canonicalUrl, page_title: pageTitle });

    // get first 150 symbols from page lyrics as description
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

const formActions = computed(() => {
  const nav = [
    {
      id: 'suggestEdit',
      icon: 'edit',
      name: $t('suggestEdit'),
      kind: 'additional',
    },
    {
      id: 'hideChords',
      icon: 'hidden',
      name: $t('pages.akordiSongView.hideChords.label'),
      title: $t('pages.akordiSongView.hideChords.description'),
      kind: 'additional',
    },
    {
      id: 'showGuitarChords',
      icon: 'config', // TODO: find better icon
      name: $t('pages.akordiSongView.showGuitarChords.label'),
      title: $t('pages.akordiSongView.showGuitarChords.description'),
      kind: 'additional',
    },
    {
      id: 'showUkuleleChords',
      icon: 'config', // TODO: find better icon
      name: $t('pages.akordiSongView.showUkuleleChords.label'),
      title: $t('pages.akordiSongView.showUkuleleChords.description'),
      kind: 'additional',
    },
  ];
  if (hasAbc.value) {
    nav.push({
      id: 'showAbc',
      name: $t('pages.akordiSongView.showSheet.label'),
      title: $t('pages.akordiSongView.showSheet.description'),
      kind: 'additional',
    });
  }

  return nav;
});
async function actionClicked(actionName) {
  if (actionName === 'cancel') {
    router.back();
  }
  if (actionName === 'suggestEdit') {
    router.push({ name: 'songEdit', query: { id: item.value.id } });
  }
  if (actionName === 'hideChords') {
    showChords.value = !showChords.value;
  }
  if (actionName === 'showGuitarChords') {
    showChords.value = true;
    instrument.value = 'guitar';
  }
  if (actionName === 'showAbc') {
    showAbc.value = !showAbc.value;
  }
  if (actionName === 'showUkuleleChords') {
    showChords.value = true;
    instrument.value = 'ukulele';
  }

  if (actionName === 'transposeUp') {
    bodyTransposedIndex.value += 1;
    if (bodyTransposedIndex.value > 11) {
      bodyTransposedIndex.value = 0; // 12 is back to original key
    }
    item.value.bodyWithMarkup = chordsService.transpose(item.value.body, bodyTransposedIndex.value);
    hasChords.value = item.value.bodyWithMarkup?.indexOf('<b>') !== -1;
    if (hasChords.value) {
      chords.value = chordsService.extractChords(item.value.bodyWithMarkup);
      chords.value = [...chords.value];
    }
  }
  if (actionName === 'transposeDown') {
    bodyTransposedIndex.value -= 1;
    if (bodyTransposedIndex.value < -11) {
      bodyTransposedIndex.value = 0; // 12 is back to original key
    }
    item.value.bodyWithMarkup = chordsService.transpose(item.value.body, bodyTransposedIndex.value);
    hasChords.value = item.value.bodyWithMarkup?.indexOf('<b>') !== -1;
    if (hasChords.value) {
      chords.value = chordsService.extractChords(item.value.bodyWithMarkup);
      chords.value = [...chords.value];
    }
  }
  if (actionName === 'fontUp') {
    fontSize.value += 0.2;
  }
  if (actionName === 'fontDown') {
    fontSize.value -= 0.2;
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
#song-view-form .lx-main {
  overflow-x: auto;
}

#song-view-form .pre {
  white-space: pre;
  font-family: monospace;
}

@media (max-width: 600px) {
  /* Hiding toolbar labels on small screens */
  #songToolbarGroup .toolbar-label {
    display: none;
  }
}

.lx-footer-slot .lx-divider {
  border-right: 1px solid var(--color-chrome);
  height: 100%;
}

.lx-footer-slot .toolbar-label {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

#chords {
  margin-bottom: 1em;
}
</style>
<template>
  <LxLoaderView :loading="loading">
    <LxForm
      id="song-view-form"
      :action-definitions="formActions"
      @button-click="actionClicked"
      :show-post-header-info="true"
      :show-pre-header-info="true"
      kind="compact"
      :show-footer="true"
      :sticky-header="false"
      :sticky-footer="true"
    >
      <template #footer>
        <LxToolbarGroup id="songToolbarGroup">
          <LxToolbar :noBorders="true">
            <template #leftArea>
              <label class="lx-data toolbar-label">{{
                $t('pages.akordiSongView.transposeHeader', {
                  offset: offsetFormatted,
                })
              }}</label>
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
              <div class="lx-divider"></div>
              <label class="lx-data toolbar-label">{{
                $t('pages.akordiSongView.fontUp.label')
              }}</label>
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
              <div class="lx-divider"></div>

              <label class="lx-data toolbar-label">{{
                $t('pages.akordiSongView.autoScroll.label', {
                  speed: autoScrollerSpeedFormatted,
                })
              }}</label>
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
            </template>
          </LxToolbar>
        </LxToolbarGroup>
      </template>
      <template #post-header>
        {{ item.createdAt }}
      </template>
      <template #post-header-info>
        <LxRow :label="$t('song.performer')" v-if="item.performers?.length > 0">
          <p class="lx-data">
            {{ item.performers.map((author) => author.title).join(', ') }}
          </p>
        </LxRow>
        <LxRow :label="$t('song.composer')" v-if="item.composers?.length > 0">
          <p class="lx-data">
            {{ item.composers.map((author) => author.title).join(', ') }}
          </p>
        </LxRow>
        <LxRow :label="$t('song.poet')" v-if="item.poets?.length > 0">
          <p class="lx-data">
            {{ item.poets.map((author) => author.title).join(', ') }}
          </p>
        </LxRow>
        <LxRow :label="$t('song.tags')" v-if="item.tags?.length > 0">
          <p class="lx-data">
            {{ item.tags.map((tag) => tag.title).join(', ') }}
          </p>
        </LxRow>
        <LxRow :label="$t('song.createdAt')">
          <p class="lx-data">{{ lxDateUtils.formatDateTime(item.createdDate) }}</p>
        </LxRow>
        <LxRow :label="$t('song.updatedAt')">
          <p class="lx-data">{{ lxDateUtils.formatDateTime(item.updatedDate) }}</p>
        </LxRow>
      </template>
      <LxSection v-show="hasAbc && showAbc" id="bodyAbc">
        <AbcViewer
          :abc="item.bodyAbc"
          @audio-unsupported="
            notificationStore.pushWarning($t('pages.akordiSongView.audioNotSupported'))
          "
        />
      </LxSection>
      <LxSection v-show="hasChords && showChords" id="chords">
        <div style="display: flex; flex-wrap: wrap; align-items: flex-start">
          <ChordSvg
            :chord="chord"
            :instrument="instrument"
            v-for="chord in chords"
            :key="chord"
          ></ChordSvg>
        </div>
      </LxSection>
      <LxSection id="body">
        <p class="pre" v-html="item.bodyWithMarkup" :style="{ fontSize: fontSize + 'em' }"></p>
      </LxSection>
    </LxForm>
  </LxLoaderView>
</template>
