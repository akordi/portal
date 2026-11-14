<script setup>
import { LxBadge, LxList, LxLoader } from '@akordi/lx-ui';
import { listTexts } from '@/utils/texts';
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
import songBadges from '@/utils/songBadges';
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

// The three most visited songs open the page as cards; a tag with more than
// ten songs also lists the next ones, up to nine in all, in an even number
// so the two-column list has no empty slot.
const TOP_CARDS = 3;
const POPULAR_TOTAL = 9;
const POPULAR_LIST_MIN_SONGS = 10;
const noChordsTag = computed(() => $t('pages.tagView.noChordsTag'));
const BADGE_ICONS = { popular: 'star-filled', playAlong: 'play', noChords: 'text' };

function badgesOf(song, rank = null) {
  return songBadges(song, { rank, noChordsTag: noChordsTag.value }).map((key) => ({
    key,
    icon: BADGE_ICONS[key],
    label: $t(`pages.tagView.badges.${key}`),
    tooltip: $t(`pages.tagView.badges.${key}Tooltip`),
  }));
}

function youtubeThumb(song) {
  const id = (song.youtubeLink || '').trim();
  return /^[\w-]{11}$/.test(id) ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
}

// A deleted video's thumbnail is a 404 that still loads as YouTube's 120x90
// grey placeholder; show our own placeholder instead.
const brokenThumbs = ref(new Set());
function checkThumb(event, songId) {
  if (event.target.naturalWidth < 320) {
    brokenThumbs.value = new Set(brokenThumbs.value).add(songId);
  }
}

const topCards = computed(() =>
  tagStore.total > TOP_CARDS
    ? tagStore.popular.slice(0, TOP_CARDS).map((song, i) => ({
        song,
        rank: i + 1,
        link: songLink(song),
        thumb: brokenThumbs.value.has(song.id) ? null : youtubeThumb(song),
        badges: badgesOf(song, i + 1),
      }))
    : []
);

// LxList renders items with an href as router-links, also under SSR, so the
// songs are real, crawlable links.
function listItem(song, rank = null) {
  return {
    id: String(song.id),
    title: song.title,
    description: song.mainArtist?.title,
    href: songLink(song),
    rank,
    badges: badgesOf(song, rank),
  };
}
const popularItems = computed(() => {
  if (tagStore.total <= POPULAR_LIST_MIN_SONGS) return [];
  const rest = tagStore.popular.slice(TOP_CARDS, POPULAR_TOTAL);
  return rest
    .slice(0, rest.length - (rest.length % 2))
    .map((song, i) => listItem(song, TOP_CARDS + i + 1));
});
const songItems = computed(() => tagStore.songs.map((song) => listItem(song)));

// Thumbnails can finish loading before hydration attaches @load.
function checkLoadedThumbs() {
  document.querySelectorAll('img.tag-top-thumb[data-song-id]').forEach((img) => {
    if (img.complete) checkThumb({ target: img }, Number(img.dataset.songId));
  });
}

onMounted(() => {
  checkLoadedThumbs();
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

    <!-- The top three cards and the ranks after them are one "most popular" section. -->
    <section v-if="topCards.length" class="tag-section">
      <h2>{{ $t('pages.tagView.popular') }}</h2>
      <ol class="tag-top">
        <li v-for="card in topCards" :key="card.song.id">
          <router-link :to="card.link" class="tag-top-card lx-region-component">
            <img
              v-if="card.thumb"
              class="tag-top-thumb"
              :src="card.thumb"
              alt=""
              width="320"
              height="180"
              :loading="card.rank === 1 ? 'eager' : 'lazy'"
              decoding="async"
              :data-song-id="card.song.id"
              @load="checkThumb($event, card.song.id)"
            />
            <span v-else class="tag-top-thumb tag-top-placeholder" aria-hidden="true">♪</span>
            <span class="tag-top-body">
              <span class="tag-top-title">
                <span class="tag-rank" :aria-label="$t('pages.tagView.rank', { rank: card.rank })">
                  {{ card.rank }}
                </span>
                <span class="lx-primary">{{ card.song.title }}</span>
              </span>
              <span class="lx-secondary">{{ card.song.mainArtist?.title }}</span>
              <span v-if="card.badges.length" class="tag-badges">
                <LxBadge
                  v-for="badge in card.badges"
                  :key="badge.key"
                  :icon="badge.icon"
                  :value="badge.label"
                  :tooltip="badge.tooltip"
                />
              </span>
            </span>
          </router-link>
        </li>
      </ol>
      <LxList
        v-if="popularItems.length"
        id="tagPopularSongs"
        class="tag-popular-rest"
        list-type="2"
        icon="next"
        :items="popularItems"
        name-attribute="title"
        description-attribute="description"
        :texts="listTexts()"
      >
        <template #customItem="item">
          <p class="lx-primary">
            <span class="tag-rank" :aria-label="$t('pages.tagView.rank', { rank: item.rank })">
              {{ item.rank }}
            </span>
            {{ item.title }}
          </p>
          <p class="lx-secondary">{{ item.description }}</p>
          <span v-if="item.badges.length" class="tag-badges">
            <LxBadge
              v-for="badge in item.badges"
              :key="badge.key"
              :icon="badge.icon"
              :value="badge.label"
              :tooltip="badge.tooltip"
            />
          </span>
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
          <span v-if="item.badges.length" class="tag-badges">
            <LxBadge
              v-for="badge in item.badges"
              :key="badge.key"
              :icon="badge.icon"
              :value="badge.label"
              :tooltip="badge.tooltip"
            />
          </span>
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
.tag-popular-rest {
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
/* Phones: compact rows, so the cards don't push the song list off screen. */
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
.tag-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.375rem;
}
</style>
