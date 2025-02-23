<script setup>
import { lxDateUtils, LxForm, LxLoader, LxRow, LxSection } from '@wntr/lx-ui';
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import ChordSvg from '@/components/ChordSvg.vue';
import akordiService from '@/services/akordiService';
import chordsService from '@/services/chordsService';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
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
    if (resp.data.url.indexOf(songUrlParam.value) === -1) {
      // songUrl = resp.data.url.replace(/^\/song\//, '');
      // router.replace({
      //   name: 'akordiSongView',
      //   params: { url: songUrl },
      // });
    }
    item.value = resp.data;
    item.value.createdAt = lxDateUtils.formatDate(item.value.createdDate);
    item.value.bodyWithMarkup = chordsService.transpose(item.value.body, 0);
    hasChords.value = item.value.bodyWithMarkup?.indexOf('<b>') !== -1;
    if (hasChords.value) {
      chords.value = chordsService.extractChords(item.value.bodyWithMarkup);
    }
    const canonicalUrl = `${window.location.origin}/song/${songUrlParam.value}`;
    const pageTitle = `${item.value.mainArtist.title} - ${item.value.title}`;
    pageview({
      page_path: canonicalUrl,
      page_title: pageTitle,
    });
    setCanonicalUrl(canonicalUrl);

    viewStore.title = item.value.title;
    viewStore.description = item.value.performers.map((artist) => artist.title).join(', ');
    viewStore.goBack = true;
  } catch (err) {
    console.log(err);
    notificationStore.pushError('Failed to load song');
    throw err;
  } finally {
    loading.value = false;
  }
};
const formActions = computed(() => [
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
    kind: 'tertiary',
  },
  {
    id: 'transposeDown',
    icon: 'move-down',
    name: $t('pages.akordiSongView.transposeDown.label'),
    title: hasChords.value
      ? $t('pages.akordiSongView.transposeDown.description')
      : $t('pages.akordiSongView.transposeDisabled'),
    disabled: !hasChords.value,
    kind: 'tertiary',
  },
]);
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
}

onMounted(async () => {
  await loadSong();
});
onUnmounted(() => {
  viewStore.$reset();
});
</script>
<template>
  <LxLoader :loading="loading" />
  <LxForm
    v-if="!loading"
    :sticky-footer="false"
    :sticky-header="false"
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
    <LxSection v-if="showChords">
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
    <LxSection>
      <LxRow>
        <p class="pre" v-html="item.bodyWithMarkup"></p>
      </LxRow>
    </LxSection>
  </LxForm>
</template>
