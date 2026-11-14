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
    <router-link
      v-for="tag in dashboardStore.featuredTags"
      :key="tag.id"
      class="featured-tag"
      :to="{ name: 'tagView', params: { url: tagUrlParam(tag) } }"
    >
      <strong class="featured-tag-heading">{{ featuredHeading(tag) }}</strong>
      <span v-if="tag.featuredText">{{ tag.featuredText }}</span>
      <span class="featured-tag-link">{{ $t('pages.dashboard.featuredLink') }} →</span>
    </router-link>
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
  gap: 0.25rem;
  margin-bottom: 1rem;
  padding: 1rem 1.25rem;
  border-left: 4px solid var(--color-brand, currentColor);
  background: var(--color-region, transparent);
  color: inherit;
  text-decoration: none;
}
.featured-tag:hover {
  background: var(--color-region-hover, var(--color-region, transparent));
}
.featured-tag:hover .featured-tag-link,
.featured-tag:focus-visible .featured-tag-link {
  text-decoration: underline;
}
.featured-tag-heading {
  font-size: 1.125rem;
}
.featured-tag-link {
  color: var(--color-interactive-background, inherit);
  font-weight: 600;
}
</style>
