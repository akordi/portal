<script setup>
import { LxList, LxLoader } from '@akordi/lx-ui';
import { computed, inject, onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useHead } from '@vueuse/head';
import { useRoute, useRouter } from 'vue-router';

import SongBadges from '@/components/SongBadges.vue';
import akordiService from '@/services/akordiService';
import useNotifyStore from '@/stores/useNotifyStore';
import useTagStore from '@/stores/useTagStore';
import useViewStore from '@/stores/useViewStore';
import { serializeState as inlineJson } from '@/ssr/serializeState';
import popularSections, { TOP_CARDS } from '@/utils/popularSongs';
import siteOrigin from '@/utils/siteOrigin';
import songBadges from '@/utils/songBadges';
import songLink from '@/utils/songLink';
import { tagUrlParam } from '@/utils/tagUrl';
import {
  introParagraphs,
  tagDocumentTitle,
  tagHeading,
  tagJsonLd,
  tagMetaDescription,
} from '@/utils/tagPage';
import { listTexts } from '@/utils/texts';

const router = useRouter();
const route = useRoute();
const $t = useI18n().t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const tagStore = useTagStore();
const origin = siteOrigin(inject('appConfig', null));

const urlParam = computed(() => route.params.url);
// Set when the server prefetched this tag; otherwise loaded on mount.
const tag = computed(() => tagStore.tagFor(urlParam.value));
const loading = ref(!tag.value);
const loadingMore = ref(false);
const hasMore = computed(() => tagStore.songs.length < tagStore.total);
const intro = computed(() => introParagraphs(tag.value?.intro));

// Registered synchronously in setup so the head stays per-request under SSR.
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
            // Song titles are user content; escaped for an inline <script>.
            innerHTML: inlineJson(
              tagJsonLd(tag.value, tagStore.songs, tagStore.total, origin, documentTitle.value)
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
      router.replace({ name: 'tagView', params: { url: tagUrlParam(loaded) } });
    }
    showHeader();
  } catch {
    notificationStore.pushError($t('pages.tagView.list.error'));
  } finally {
    loading.value = false;
  }
}

async function loadMore() {
  loadingMore.value = true;
  try {
    await tagStore.loadMore();
  } catch {
    notificationStore.pushError($t('pages.tagView.list.error'));
  } finally {
    loadingMore.value = false;
  }
}

function youtubeThumb(song) {
  return /^[\w-]{11}$/.test(song.youtubeLink)
    ? `https://i.ytimg.com/vi/${song.youtubeLink}/mqdefault.jpg`
    : null;
}

// A deleted video's thumbnail still loads, as YouTube's 120x90 grey image.
const brokenThumbs = ref(new Set());
function markBroken(songId) {
  brokenThumbs.value = new Set(brokenThumbs.value).add(songId);
}
function checkThumb(img, songId) {
  if (img.complete && img.naturalWidth > 0 && img.naturalWidth < 320) markBroken(songId);
}
// The image may have loaded before hydration attached @load.
function thumbRef(songId) {
  return (img) => img && checkThumb(img, songId);
}

const sections = computed(() => popularSections(tagStore.popular, tagStore.total));
const topCards = computed(() =>
  sections.value.cards.map((song, i) => ({
    song,
    rank: i + 1,
    thumb: brokenThumbs.value.has(song.id) ? null : youtubeThumb(song),
    badges: songBadges(song, i + 1),
  }))
);

function listItem(song, rank = null) {
  return {
    id: String(song.id),
    title: song.title,
    description: song.artist,
    href: songLink(song),
    rank,
    badges: songBadges(song, rank),
  };
}
const rankedItems = computed(() =>
  sections.value.ranked.map((song, i) => listItem(song, TOP_CARDS + i + 1))
);
const songItems = computed(() => tagStore.songs.map((song) => listItem(song)));

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
</script>

<template>
  <LxLoader :loading="loading" />
  <div v-if="tag" class="tag-page">
    <div v-if="intro.length" class="tag-intro">
      <p v-for="(paragraph, i) in intro" :key="i">{{ paragraph }}</p>
    </div>

    <section v-if="topCards.length" class="tag-section">
      <h2>{{ $t('pages.tagView.popular') }}</h2>
      <ol class="tag-top">
        <li v-for="card in topCards" :key="card.song.id">
          <router-link :to="songLink(card.song)" class="tag-top-card">
            <img
              v-if="card.thumb"
              :ref="thumbRef(card.song.id)"
              class="tag-top-thumb"
              :src="card.thumb"
              alt=""
              width="320"
              height="180"
              :loading="card.rank === 1 ? 'eager' : 'lazy'"
              decoding="async"
              @load="checkThumb($event.target, card.song.id)"
              @error="markBroken(card.song.id)"
            />
            <span v-else class="tag-top-thumb tag-top-placeholder" aria-hidden="true">♪</span>
            <span class="tag-top-body">
              <span class="tag-top-title">
                <span class="tag-rank" aria-hidden="true">{{ card.rank }}</span>
                <span class="visually-hidden">
                  {{ $t('pages.tagView.rank', { rank: card.rank }) }}
                </span>
                <span class="lx-primary">{{ card.song.title }}</span>
              </span>
              <span class="lx-secondary">{{ card.song.artist }}</span>
              <SongBadges :badges="card.badges" />
            </span>
          </router-link>
        </li>
      </ol>
      <LxList
        v-if="rankedItems.length"
        id="tagRankedSongs"
        class="tag-ranked"
        list-type="2"
        icon="next"
        :items="rankedItems"
        name-attribute="title"
        description-attribute="description"
        :texts="listTexts()"
      >
        <template #customItem="item">
          <p class="lx-primary">
            <span class="tag-rank" aria-hidden="true">{{ item.rank }}</span>
            <span class="visually-hidden">{{ $t('pages.tagView.rank', { rank: item.rank }) }}</span>
            {{ item.title }}
          </p>
          <p class="lx-secondary">{{ item.description }}</p>
          <SongBadges :badges="item.badges" />
        </template>
      </LxList>
    </section>

    <section class="tag-section">
      <h2 v-if="topCards.length">
        {{ $t('pages.tagView.all', { count: tagStore.total }) }}
      </h2>
      <LxList
        id="tagSongs"
        list-type="2"
        icon="next"
        :items="songItems"
        name-attribute="title"
        description-attribute="description"
        :show-load-more="hasMore"
        :loading="loadingMore"
        :texts="listTexts()"
        @load-more="loadMore"
      >
        <template #customItem="item">
          <p class="lx-primary">{{ item.title }}</p>
          <p class="lx-secondary">{{ item.description }}</p>
          <SongBadges :badges="item.badges" />
        </template>
      </LxList>
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
.tag-ranked {
  margin-top: 1rem;
}
.tag-top {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(15rem, 1fr));
  gap: 1rem;
  margin: 0;
  padding: 0;
  list-style: none;
}
.tag-top-card {
  display: flex;
  flex-direction: column;
  height: 100%;
  color: inherit;
  text-decoration: none;
  background: var(--color-region, transparent);
}
.tag-top-card:hover,
.tag-top-card:focus-visible {
  background: var(--color-region-hover, var(--color-region, transparent));
}
.tag-top-card:hover .lx-primary,
.tag-top-card:focus-visible .lx-primary {
  text-decoration: underline;
}
.tag-top-thumb {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}
.tag-top-placeholder {
  display: grid;
  place-items: center;
  font-size: 3rem;
  color: var(--color-label, inherit);
  background: var(--color-layout-background, transparent);
}
.tag-top-body {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.75rem 1rem 1rem;
}
.tag-top-title {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}
.tag-top-title .lx-primary {
  font-weight: 600;
}
.tag-rank {
  display: inline-grid;
  place-items: center;
  min-width: 1.5rem;
  height: 1.5rem;
  margin-right: 0.25rem;
  border-radius: 999px;
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--color-region, #fff);
  background: var(--color-brand, currentColor);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
/* Compact rows on phones, so the cards don't push the song list off screen. */
@media (max-width: 600px) {
  .tag-top {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  .tag-top-card {
    flex-direction: row;
  }
  .tag-top-thumb {
    flex: 0 0 7.5rem;
    width: 7.5rem;
  }
  .tag-top-placeholder {
    font-size: 2rem;
  }
  .tag-top-body {
    padding: 0.5rem 0.75rem;
  }
}
</style>
