<script setup>
import { LxList, LxLoader } from '@akordi/lx-ui';
import { computed, inject, onMounted, onServerPrefetch, ref } from 'vue';

import { useRoute, useRouter } from 'vue-router';

import akordiService from '@/services/akordiService';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import { useHead } from '@vueuse/head';
import { useI18n } from 'vue-i18n';
import { listTexts } from '@/utils/texts';

const router = useRouter();
const route = useRoute();
const appConfig = inject('appConfig', null);
const artistUrlParam = computed(() => route.params.url);
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const artist = ref(null);
const items = ref([]);
const loading = ref(true);
const translate = useI18n();
const $t = translate.t;

// Head tags are registered synchronously here, in setup, with reactive
// values that the loader fills in below. A useHead() call made after an
// `await` runs outside the component's setup context: @vueuse/head then
// can't scope the entry to this component instance and writes it into the
// shared head — harmless-looking in the browser, but under SSR every
// concurrent request shares that head, so one artist page could be rendered
// with another's <title>. Computed refs keep the entry per-instance and let
// renderHeadToString() see the loaded values once onServerPrefetch resolves.
const pagePath = computed(() => `/band/${artistUrlParam.value}`);
const canonicalUrl = computed(() => {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : (appConfig?.publicUrl || '').replace(/\/$/, '');
  return `${origin}${pagePath.value}`;
});
const pageTitle = computed(() =>
  artist.value ? $t('pages.artistView.pageTitle', { artist: artist.value.title }) : undefined
);
const metaDescription = computed(() => {
  if (!artist.value) return '';
  const songTitles = items.value
    .slice(0, 10)
    .map((song) => song.title)
    .join(', ');
  return $t('pages.artistView.metaDescription', { songTitles });
});
// Until the artist has loaded (or if it failed to), leave every value
// undefined/empty — unhead skips undefined inputs, so App.vue's generic route
// title/description stay in effect instead of a missing or blank <title>.
useHead({
  title: pageTitle,
  link: computed(() => (artist.value ? [{ rel: 'canonical', href: canonicalUrl.value }] : [])),
  meta: computed(() =>
    artist.value
      ? [
          { name: 'description', content: metaDescription.value },
          { property: 'og:title', content: pageTitle.value },
          { property: 'og:description', content: metaDescription.value },
          { property: 'og:url', content: canonicalUrl.value },
        ]
      : []
  ),
});

const loadArtist = async () => {
  loading.value = true;
  try {
    const artistUrl = pagePath.value;
    const artistId = akordiService.parseUrl(artistUrl);
    const artistResp = await akordiService.getArtist(artistId);

    // TODO(SSR): a mismatched slug should become a real HTTP redirect when
    // rendered server-side (see the same note in SongView.vue).
    if (typeof window !== 'undefined' && artistUrl !== artistResp.data.url) {
      const correctUrl = artistResp.data.url.replace(/^\/band\//, '');
      router.replace({
        name: 'akordiArtistView',
        params: { url: correctUrl },
      });
    }

    // One request for the whole catalogue (no paging on this page), so the
    // server-rendered list is complete, not a first page.
    const resp = await akordiService.getSongs({
      'artist.id': artistId,
      size: 5000,
      offset: 0,
      sort: 'title,asc',
    });
    items.value = resp.data.content.map((song) => ({
      ...song,
      description: song.mainArtist.title,
      clickable: true,
    }));

    artist.value = artistResp.data;
    viewStore.title = artistResp.data.title;
  } catch (err) {
    notificationStore.pushError('Failed to load songs');
    throw err;
  } finally {
    loading.value = false;
  }
};
function actionClicked(action, id) {
  if (action === 'click') {
    const item = items.value.find((i) => String(i.id) === id);
    item.url = item.url.replace(/^\/song\//, '');
    router.push({ name: 'akordiSongView', params: { url: item.url } });
  }
}
onMounted(async () => {
  viewStore.goBack = true;
  await loadArtist();
});

// Runs only during SSR (renderToString awaits it; the client never calls
// this hook, so onMounted above still does the client-side fetch as
// before). Swallow failures so the page still renders its shell/loading
// state if the API is briefly unreachable during SSR, rather than failing
// the whole page render.
onServerPrefetch(async () => {
  try {
    await loadArtist();
  } catch (err) {
    // already reported via notificationStore inside loadArtist()
  }
});
</script>
<template>
  <LxLoader :loading="loading" />
  <LxList
    v-if="!loading"
    id="id"
    list-type="2"
    v-model:items="items"
    name-attribute="title"
    description-attribute="description"
    @action-click="actionClicked"
    :texts="listTexts()"
  >
  </LxList>
</template>
