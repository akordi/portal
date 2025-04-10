<script setup>
import { lxDateUtils, LxForm, LxLoaderView, LxRow, LxSection } from '@wntr/lx-ui';
import { computed, onMounted, onUnmounted, ref } from 'vue';
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
    viewStore.description = item.value.performers.map((artist) => artist.title).join(', ');
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
    console.log(err);
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
    {
      id: 'transposeUp',
      icon: 'move-up',
      name: $t('pages.akordiSongView.transposeUp.label'),
      title: hasChords.value
        ? $t('pages.akordiSongView.transposeUp.description')
        : $t('pages.akordiSongView.transposeDisabled'),
      disabled: !hasChords.value,
      kind: 'additional',
    },
    {
      id: 'transposeDown',
      icon: 'move-down',
      name: $t('pages.akordiSongView.transposeDown.label'),
      title: hasChords.value
        ? $t('pages.akordiSongView.transposeDown.description')
        : $t('pages.akordiSongView.transposeDisabled'),
      disabled: !hasChords.value,
      kind: 'additional',
    },
    {
      id: 'fontUp',
      icon: 'zoom-in',
      name: $t('pages.akordiSongView.fontUp.label'),
      title: $t('pages.akordiSongView.fontUp.description'),
      kind: 'additional',
    },
    {
      id: 'fontDown',
      icon: 'zoom-out',
      name: $t('pages.akordiSongView.fontDown.label'),
      title: $t('pages.akordiSongView.fontDown.description'),
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
    item.value.bodyWithMarkup = chordsService.transpose(item.value.body, bodyTransposedIndex.value);
    hasChords.value = item.value.bodyWithMarkup?.indexOf('<b>') !== -1;
    if (hasChords.value) {
      chords.value = chordsService.extractChords(item.value.bodyWithMarkup);
      chords.value = [...chords.value];
    }
  }
  if (actionName === 'transposeDown') {
    bodyTransposedIndex.value -= 1;
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
  const menuButton = document.querySelector('.additional-button-icon-menu');
  if (menuButton) {
    menuButton.click();
  }
}

onMounted(async () => {
  await loadSong();
});
onUnmounted(() => {
  viewStore.$reset();
});
</script>
<style>
/* Saving precious space by */
@media (max-width: 600px) {
  .lx-layout.lx-layout-public > main {
    margin-left: 0;
    margin-right: 0;
  }
  .lx-form-grid > .lx-main > .lx-form-section {
    padding: 0.5em;
  }
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
  margin-left: -10px; /* half of the width */
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
      :sticky-header="true"
      :show-footer="false"
      :action-definitions="formActions"
      @button-click="actionClicked"
      :show-post-header-info="true"
      kind="compact"
    >
      <template #post-header>{{ item.createdAt }} </template>
      <template #post-header-info>
        <LxRow :label="$t('song.createdAt')">
          <p class="lx-data">{{ lxDateUtils.formatDateTime(item.createdDate) }}</p>
        </LxRow>
        <LxRow :label="$t('song.updatedAt')">
          <p class="lx-data">{{ lxDateUtils.formatDateTime(item.updatedDate) }}</p>
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
      </template>
      <LxSection v-show="hasAbc && showAbc" id="bodyAbc">
        <div id="paper"></div>
        <div id="audio"></div>
      </LxSection>
      <LxSection v-show="hasChords && showChords" id="chords">
        <LxRow>
          <div style="display: flex; flex-wrap: wrap">
            <ChordSvg
              :chord="chord"
              :instrument="instrument"
              v-for="chord in chords"
              :key="chord"
            ></ChordSvg>
          </div>
        </LxRow>
      </LxSection>
      <LxSection id="body">
        <LxRow>
          <p class="pre" v-html="item.bodyWithMarkup" :style="{ fontSize: fontSize + 'em' }"></p>
        </LxRow>
      </LxSection>
    </LxForm>
  </LxLoaderView>
</template>
