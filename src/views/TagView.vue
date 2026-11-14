<script setup>
import { LxButton, LxLoader } from '@akordi/lx-ui';
import { computed, inject, onMounted, onUnmounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHead } from '@vueuse/head';
import { useRoute, useRouter } from 'vue-router';

import akordiService from '@/services/akordiService';
import useNotifyStore from '@/stores/useNotifyStore';
import useTagStore from '@/stores/useTagStore';
import useViewStore from '@/stores/useViewStore';
import { serializeState as inlineJson } from '@/ssr/serializeState';
import { tagUrlParam as tagRouteParam } from '@/utils/tagUrl';
import {
  introParagraphs,
  tagDocumentTitle,
  tagHeading,
  tagJsonLd,
  tagMetaDescription,
} from '@/utils/tagPage';

const router = useRouter();
const route = useRoute();
const $t = useI18n().t;
const appConfig = inject('appConfig', null);
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const tagStore = useTagStore();

const urlParam = computed(() => route.params.url);
// Filled by the SSR prefetch (and transferred to the browser) when this is
// the landing page; otherwise loaded on mount.
const tag = computed(() => tagStore.tagFor(urlParam.value));
const loading = ref(!tag.value);
const loadingMore = ref(false);
const hasMore = computed(() => tagStore.songs.length < tagStore.total);
const intro = computed(() => introParagraphs(tag.value?.intro));

const origin =
  typeof window !== 'undefined'
    ? window.location.origin
    : (appConfig?.publicUrl || '').replace(/\/$/, '');

// Registered synchronously in setup so the head stays per-request under SSR.
// Undefined values are skipped, leaving App.vue's generic head in place.
const documentTitle = computed(() => (tag.value ? tagDocumentTitle(tag.value, $t) : undefined));
const description = computed(() =>
  tag.value ? tagMetaDescription(tag.value, tagStore.songs, $t) : undefined
);
useHead({
  title: documentTitle,
  link: computed(() =>
    tag.value?.url ? [{ rel: 'canonical', href: `${origin}${tag.value.url}` }] : []
  ),
  meta: computed(() =>
    tag.value
      ? [
          { name: 'description', content: description.value },
          { property: 'og:title', content: documentTitle.value },
          { property: 'og:description', content: description.value },
        ]
      : []
  ),
  script: computed(() =>
    tag.value
      ? [
          {
            type: 'application/ld+json',
            key: 'tag-jsonld',
            // Escaped for an inline <script>: song titles are user content.
            innerHTML: inlineJson(
              tagJsonLd(tag.value, tagStore.songs, origin, documentTitle.value)
            ),
          },
        ]
      : []
  ),
});

function showHeader() {
  viewStore.title = tagHeading(tag.value, $t);
  viewStore.goBack = true;
}

async function loadTag() {
  loading.value = true;
  try {
    const loaded = await tagStore.load(urlParam.value);
    if (loaded.url && loaded.url !== `/tag/${urlParam.value}`) {
      router.replace({ name: 'tagView', params: { url: tagRouteParam(loaded) } });
    }
    showHeader();
  } catch (err) {
    notificationStore.pushError($t('pages.tagView.list.error'));
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  loadingMore.value = true;
  try {
    await tagStore.loadMore();
  } catch (err) {
    notificationStore.pushError($t('pages.tagView.list.error'));
  } finally {
    loadingMore.value = false;
  }
}

function songLink(song) {
  return { name: 'akordiSongView', params: { url: song.url.replace(/^\/song\//, '') } };
}

onMounted(() => {
  if (tag.value) {
    showHeader();
  } else {
    loadTag();
  }
});

// The view stays mounted when navigating from one tag straight to another.
watch(
  () => akordiService.parseUrl(urlParam.value),
  (id, previousId) => {
    if (id !== previousId && id !== null) loadTag();
  },
  { flush: 'post' }
);

onUnmounted(() => {
  viewStore.$reset();
});
</script>

<template>
  <LxLoader :loading="loading" />
  <div v-if="tag" class="tag-page">
    <div v-if="intro.length" class="tag-intro">
      <p v-for="(paragraph, i) in intro" :key="i">{{ paragraph }}</p>
    </div>

    <section v-if="tagStore.popular.length" class="tag-section">
      <h2>{{ $t('pages.tagView.popular') }}</h2>
      <ol class="tag-songs">
        <li v-for="song in tagStore.popular" :key="song.id">
          <router-link :to="songLink(song)">{{ song.title }}</router-link>
          <span class="tag-song-artist">{{ song.mainArtist?.title }}</span>
        </li>
      </ol>
    </section>

    <section class="tag-section">
      <h2 v-if="tagStore.popular.length">
        {{ $t('pages.tagView.all', { count: tagStore.total }) }}
      </h2>
      <ul class="tag-songs">
        <li v-for="song in tagStore.songs" :key="song.id">
          <router-link :to="songLink(song)">{{ song.title }}</router-link>
          <span class="tag-song-artist">{{ song.mainArtist?.title }}</span>
        </li>
      </ul>
      <LxButton
        v-if="hasMore"
        kind="secondary"
        icon="next"
        :label="$t('pages.tagView.loadMore')"
        :busy="loadingMore"
        @click="loadMore"
      />
    </section>
  </div>
</template>

<style scoped>
.tag-intro {
  max-width: 48rem;
}
.tag-intro p + p {
  margin-top: 0.75rem;
}
.tag-section {
  margin-top: 1.5rem;
}
.tag-section h2 {
  margin-bottom: 0.5rem;
}
.tag-songs {
  margin: 0 0 1rem;
  padding-left: 1.5rem;
}
ul.tag-songs {
  list-style: none;
  padding-left: 0;
}
.tag-songs li {
  padding: 0.35rem 0;
  border-bottom: 1px solid var(--color-chrome, rgba(0, 0, 0, 0.08));
}
.tag-song-artist {
  display: block;
  font-size: 0.875em;
  color: var(--color-label, inherit);
}
</style>
