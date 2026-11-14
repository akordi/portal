<script setup>
import { LxList, LxLoader } from '@akordi/lx-ui';
import { computed, inject, onMounted, ref, watch } from 'vue';

import { useRoute, useRouter } from 'vue-router';

import akordiService from '@/services/akordiService';
import useArtistStore from '@/stores/useArtistStore';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import siteOrigin from '@/utils/siteOrigin';
import songLink from '@/utils/songLink';
import { useHead } from '@vueuse/head';
import { useI18n } from 'vue-i18n';
import { listTexts } from '@/utils/texts';

const router = useRouter();
const route = useRoute();
const origin = siteOrigin(inject('appConfig', null));
const artistUrlParam = computed(() => route.params.url);
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const artistStore = useArtistStore();
// Set when the server prefetched this artist; otherwise loaded on mount.
const artist = computed(() => artistStore.artistFor(artistUrlParam.value));
const loading = ref(!artist.value);
const items = computed(() =>
  artistStore.songs.map((song) => ({
    id: String(song.id),
    title: song.title,
    description: song.artist,
    href: songLink(song),
  }))
);
const translate = useI18n();
const $t = translate.t;

// Registered synchronously in setup so the head stays per-request under SSR.
const pagePath = computed(() => `/band/${artistUrlParam.value}`);
const canonicalUrl = computed(() => `${origin}${pagePath.value}`);
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

async function loadArtist() {
  loading.value = true;
  try {
    const loaded = await artistStore.load(artistUrlParam.value);
    // Server-side a mismatched slug is a 301; this covers in-app navigation.
    if (loaded.url !== pagePath.value) {
      router.replace({
        name: 'akordiArtistView',
        params: { url: loaded.url.replace(/^\/band\//, '') },
      });
    }
    viewStore.title = loaded.title;
  } catch {
    notificationStore.pushError('Failed to load songs');
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  viewStore.goBack = true;
  if (artist.value) {
    viewStore.title = artist.value.title;
  } else {
    await loadArtist();
  }
});

// Same view, different artist (e.g. picked from the header search).
watch(
  () => akordiService.parseUrl(artistUrlParam.value),
  async (id, previousId) => {
    if (id !== previousId) await loadArtist();
  },
  { flush: 'post' }
);
</script>
<template>
  <LxLoader :loading="loading" />
  <LxList
    v-if="artist"
    id="artistSongs"
    icon="next"
    list-type="2"
    :items="items"
    name-attribute="title"
    description-attribute="description"
    :texts="listTexts()"
  />
</template>
