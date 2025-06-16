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
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import ChordSvg from '@/components/ChordSvg.vue';
import akordiService from '@/services/akordiService';
import chordsService from '@/services/chordsService';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import abcjs from 'abcjs';
import { pageview } from 'vue-gtag';

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

const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

let speedPxPerSec = 0;
let rafId = null;
let lastFrame = null;
let restartingTimeout = null;
const timeoutLength = 600; // ms
let leftover = 0;

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

function stopAutoScroll() {
  cancelAnimationFrame(rafId);
  rafId = null;
  lastFrame = null;
}

function startAutoScroll() {
  stopAutoScroll();
  lastFrame = null;
  rafId = requestAnimationFrame(frame);
}

// Stop on any manual scroll gesture
['wheel', 'touchstart', 'keydown'].forEach((evt) =>
  window.addEventListener(evt, stopAutoScroll, { passive: true })
);

// Resume scrolling after 600 ms of inactivity:
window.addEventListener(
  'scroll',
  () => {
    clearTimeout(restartingTimeout);
    if (!rafId) {
      restartingTimeout = setTimeout(() => startAutoScroll(), timeoutLength);
    }
  },
  { passive: true }
);

watch(autoScrollerSpeed, (level) => {
  speedPxPerSec = levelToPxSpeed(level);
  startAutoScroll();
});

const setCanonicalUrl = (canonicalUrl) => {
  const link = document.querySelector('link[rel="canonical"]');
  if (link) {
    link.setAttribute('href', canonicalUrl);
  } else {
    const newLink = document.createElement('link');
    newLink.rel = 'canonical';
    newLink.href = canonicalUrl;
    document.head.appendChild(newLink);
  }
};

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
    pageview({
      page_path: pagePath,
      page_location: canonicalUrl,
      page_title: pageTitle,
    });
    setCanonicalUrl(canonicalUrl);

    viewStore.title = item.value.title;
    viewStore.description =
      item.value.mainArtist?.title ||
      item.value.performers.map((artist) => artist.title).join(', ');
    viewStore.goBack = true;

    if (item.value.bodyAbc) {
      const visualOptions = { responsive: 'resize' };
      const abcjsObject = abcjs.renderAbc('paper', item.value.bodyAbc, visualOptions);
      const controlOptions = {
        displayPlay: true,
        displayProgress: true,
        displayClock: true,
      };
      const synthControl = new abcjs.synth.SynthController();
      synthControl.load('#audio', null, controlOptions);
      synthControl.disable(true);
      if (abcjs.synth.supportsAudio()) {
        const midiBuffer = new abcjs.synth.CreateSynth();
        midiBuffer
          .init({
            visualObj: abcjsObject[0],
            options: {},
          })
          .then(() => {
            synthControl.setTune(abcjsObject[0], true).then(() => {
              document.querySelector('.abcjs-inline-audio').classList.remove('disabled');
            });
          });
      } else {
        notificationStore.pushWarning($t('pages.akordiSongView.audioNotSupported'));
      }
    }
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
  await loadSong();
});
onUnmounted(() => {
  stopAutoScroll();
  viewStore.$reset();
});
</script>
<style>
/* Saving precious space by */
@media (max-width: 600px) {
  .lx-layout.lx-layout-public > main {
    --gap-form: 0;
    margin-left: 0;
    margin-right: 0;
  }

  .lx-form-grid > .lx-main > .lx-form-section {
    padding: 0.5em;
  }

  /* Hiding toolbar labels on small screens */
  #songToolbarGroup .toolbar-label {
    display: none;
  }

  .lx-form-grid > footer.lx-sticky {
    padding: 0;
    gap: 0;
  }
}

.lx-footer-slot .lx-divider {
  border-right: 1px solid var(--color-chrome);
  height: 100%;
}

.toolbar-label {
  padding-left: 0.5rem;
  padding-right: 0.5rem;
}

#chords {
  margin-bottom: 1em;
}

/* Some basic CSS to make the Audio controls in abcjs presentable. */

.lx .abcjs-inline-audio {
  height: 26px;
  padding: 0 5px;
  border-radius: 3px;
  background-color: #424242;
  display: flex;
  align-items: center;
  box-sizing: border-box;
}

.lx .abcjs-inline-audio.abcjs-disabled {
  opacity: 0.5;
}

.lx .abcjs-inline-audio .abcjs-btn {
  display: block;
  width: 28px;
  min-width: 28px;
  height: 34px;
  min-height: 34px;
  margin-right: 2px;
  padding: 7px 4px;

  background: none !important;
  border: 1px solid transparent;
  box-sizing: border-box;
  line-height: 1;
}

.lx .abcjs-btn g {
  fill: #f4f4f4;
  stroke: #f4f4f4;
}

.lx .abcjs-inline-audio .abcjs-btn:hover g {
  fill: #cccccc;
  stroke: #cccccc;
}

.lx .abcjs-inline-audio .abcjs-midi-selection.abcjs-pushed {
  border: 1px solid #cccccc;
  background-color: #666666;
  box-sizing: border-box;
}

.lx .abcjs-inline-audio .abcjs-midi-loop.abcjs-pushed {
  border: 1px solid #cccccc;
  background-color: #666666;
  box-sizing: border-box;
}

.lx .abcjs-inline-audio .abcjs-midi-reset.abcjs-pushed {
  border: 1px solid #cccccc;
  background-color: #666666;
  box-sizing: border-box;
}

.lx .abcjs-inline-audio .abcjs-midi-start .abcjs-pause-svg {
  display: none;
}

.lx .abcjs-inline-audio .abcjs-midi-start .abcjs-loading-svg {
  display: none;
}

.lx .abcjs-inline-audio .abcjs-midi-start.abcjs-pushed .abcjs-play-svg {
  display: none;
}

.lx .abcjs-inline-audio .abcjs-midi-start.abcjs-loading .abcjs-play-svg {
  display: none;
}

.lx .abcjs-inline-audio .abcjs-midi-start.abcjs-pushed .abcjs-pause-svg {
  display: block;
}

.lx .abcjs-inline-audio .abcjs-midi-progress-background {
  background-color: #424242;
  height: 10px;
  border-radius: 5px;
  border: 2px solid #cccccc;
  margin: 0 8px 0 15px;
  position: relative;
  flex: 1;
  padding: 0;
  box-sizing: border-box;
}

.lx .abcjs-inline-audio .abcjs-midi-progress-indicator {
  width: 20px;
  margin-left: -10px;
  /* half of the width */
  height: 14px;
  background-color: #f4f4f4;
  position: absolute;
  display: inline-block;
  border-radius: 6px;
  top: -4px;
  left: 0;
  box-sizing: border-box;
}

.lx .abcjs-inline-audio .abcjs-midi-clock {
  margin-left: 4px;
  margin-top: 1px;
  margin-right: 2px;
  display: inline-block;
  font-family: sans-serif;
  font-size: 16px;
  box-sizing: border-box;
  color: #f4f4f4;
}

.lx .abcjs-inline-audio .abcjs-tempo-wrapper {
  font-size: 10px;
  color: #f4f4f4;
  box-sizing: border-box;
  display: flex;
  align-items: center;
}

.lx .abcjs-inline-audio .abcjs-midi-tempo {
  border-radius: 2px;
  border: none;
  margin: 0 2px 0 4px;
  width: 42px;
  padding-left: 2px;
  box-sizing: border-box;
}

.lx .abcjs-inline-audio .abcjs-loading .abcjs-loading-svg {
  display: inherit;
}

.lx .abcjs-inline-audio .abcjs-loading {
  outline: none;
  animation-name: abcjs-spin;
  animation-duration: 1s;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
}

.lx .abcjs-inline-audio .abcjs-loading-svg circle {
  stroke: #f4f4f4;
}

@keyframes abcjs-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

/* Adding the class "abcjs-large" will make the control easier on a touch device. */
.lx .abcjs-large .abcjs-inline-audio {
  height: 52px;
}

.lx .abcjs-large .abcjs-btn {
  width: 56px;
  min-width: 56px;
  height: 52px;
  min-height: 52px;
  font-size: 28px;
  padding: 6px 8px;
}

.lx .abcjs-large .abcjs-midi-progress-background {
  height: 20px;
  border: 4px solid #cccccc;
}

.lx .abcjs-large .abcjs-midi-progress-indicator {
  height: 28px;
  top: -8px;
  width: 40px;
}

.lx .abcjs-large .abcjs-midi-clock {
  font-size: 32px;
  margin-right: 10px;
  margin-left: 10px;
  margin-top: -1px;
}

.lx .abcjs-large .abcjs-midi-tempo {
  font-size: 20px;
  width: 50px;
}

.lx .abcjs-large .abcjs-tempo-wrapper {
  font-size: 20px;
}

.lx .abcjs-css-warning {
  display: none;
}
</style>
<template>
  <LxLoaderView :loading="loading">
    <LxForm
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
                :icon="autoScrollerIcon"
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
        <div id="paper"></div>
        <div id="audio"></div>
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
        <LxRow>
          <p class="pre" v-html="item.bodyWithMarkup" :style="{ fontSize: fontSize + 'em' }"></p>
        </LxRow>
      </LxSection>
    </LxForm>
  </LxLoaderView>
</template>
