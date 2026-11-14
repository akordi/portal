<script setup>
import { LxTile } from '@akordi/lx-ui';
import { onMounted, ref } from 'vue';

import useAuthStore from '@/stores/useAuthStore';
import useDashboardStore from '@/stores/useDashboardStore';
import { tagUrlParam } from '@/utils/tagUrl';
import { useI18n } from 'vue-i18n';

const authStore = useAuthStore();
const dashboardStore = useDashboardStore();
// The server already knows the real total (see ssr/prefetch.js) and renders it directly, so the
// client only needs to fetch it itself as a fallback for the rare case prefetch didn't run.
const songCount = ref(dashboardStore.songCountTotal ?? 0);
const $t = useI18n().t;

function songLink(song) {
  return { name: 'akordiSongView', params: { url: song.url.replace(/^\/song\//, '') } };
}

function featuredHeading(tag) {
  return tag.pageTitle || tag.title.charAt(0).toUpperCase() + tag.title.slice(1);
}

onMounted(async () => {
  if (dashboardStore.songCountTotal === null) {
    await dashboardStore.load();
  }
  songCount.value = dashboardStore.songCountTotal;
});
</script>

<template>
  <div>
    <section
      v-for="tag in dashboardStore.featuredTags"
      :key="tag.id"
      class="featured-tag"
      :aria-labelledby="`featured-tag-${tag.id}`"
    >
      <router-link
        :id="`featured-tag-${tag.id}`"
        class="featured-tag-heading"
        :to="{ name: 'tagView', params: { url: tagUrlParam(tag) } }"
      >
        {{ featuredHeading(tag) }}
      </router-link>
      <span v-if="tag.featuredText">{{ tag.featuredText }}</span>
      <p v-if="tag.topSongs?.length" class="featured-tag-songs">
        <span class="lx-secondary">{{ $t('pages.dashboard.featuredSongs') }}</span>
        <template v-for="(song, i) in tag.topSongs" :key="song.id">
          <router-link :to="songLink(song)">{{ song.title }}</router-link><template
            v-if="i < tag.topSongs.length - 1"
            >,
          </template>
        </template>
      </p>
      <router-link
        class="featured-tag-link"
        :to="{ name: 'tagView', params: { url: tagUrlParam(tag) } }"
      >
        {{ $t('pages.dashboard.featuredLink') }} →
      </router-link>
    </section>
    <p>
      {{ $t('pages.dashboard.disclaimer') }}
    </p>
    <div class="lx-divider"></div>
    <div class="lx-dashboard">
      <LxTile
        icon="search-details"
        :label="$t('pages.songSearch.title')"
        :description="$t('pages.songSearch.description', { songCount: songCount })"
        :to="{ name: 'songSearch' }"
      />
      <LxTile
        icon="time"
        :label="$t('pages.songListNew.title')"
        :description="$t('pages.songListNew.description')"
        :to="{ name: 'songListNew' }"
      />
      <LxTile
        icon="star"
        :label="$t('pages.songListTop.title')"
        :description="$t('pages.songListTop.description')"
        :to="{ name: 'songListTop' }"
      />
      <LxTile
        icon="users"
        :label="$t('pages.akordiArtistLetter.title')"
        :description="$t('pages.akordiArtistLetter.description')"
        :to="{ name: 'akordiArtistLetter', params: { letter: '0' } }"
      />
      <LxTile
        v-if="authStore.isAuthorized"
        icon="list-bulleted"
        :label="$t('pages.songbook.title')"
        :description="$t('pages.songbook.description')"
        :to="{ name: 'songbook' }"
      />
      <LxTile
        icon="tag"
        :label="$t('pages.tagList.title')"
        :description="$t('pages.tagList.description')"
        :to="{ name: 'tagList' }"
      />
      <LxTile
        icon="add-item"
        :label="$t('pages.songNew.title')"
        :description="$t('pages.songNew.description')"
        :to="{ name: 'songNew' }"
      />
    </div>
  </div>
</template>

<style scoped>
.featured-tag {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.375rem;
  margin-bottom: 1rem;
  padding: 1rem 1.25rem;
  border-left: 4px solid var(--color-brand, currentColor);
  background: var(--color-region, transparent);
}
.featured-tag-heading {
  font-size: 1.125rem;
  font-weight: 600;
  color: inherit;
  text-decoration: none;
}
.featured-tag-heading:hover,
.featured-tag-heading:focus-visible {
  text-decoration: underline;
}
.featured-tag-songs {
  margin: 0;
}
.featured-tag-songs .lx-secondary {
  margin-right: 0.25rem;
}
.featured-tag-link {
  color: var(--color-interactive-background, inherit);
  font-weight: 600;
}
</style>
