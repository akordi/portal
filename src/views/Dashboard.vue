<script setup>
import { LxTile } from '@akordi/lx-ui';
import { onMounted, onUnmounted, ref } from 'vue';

import useAuthStore from '@/stores/useAuthStore';
import useDashboardStore from '@/stores/useDashboardStore';
import { useI18n } from 'vue-i18n';

const authStore = useAuthStore();
const dashboardStore = useDashboardStore();
const songCount = ref(1);
const songCountTotal = ref(dashboardStore.songCountTotal ?? 1000);
const $t = useI18n().t;

async function loadTotalSongCount() {
  if (dashboardStore.songCountTotal === null) {
    await dashboardStore.load();
  }
  songCountTotal.value = dashboardStore.songCountTotal;
}
let frame = 0;
function animateCount() {
  frame = 0;
  const remaining = songCountTotal.value - songCount.value;
  if (remaining <= 0) return;
  songCount.value += Math.max(1, Math.ceil(remaining / 12));
  frame = requestAnimationFrame(animateCount);
}
let tileReady = false;
function startCounter() {
  if (tileReady && !frame) animateCount();
}
// Hydration must see the same count the server rendered; animate once the tile is live
function onTileMounted() {
  tileReady = true;
  startCounter();
}

onMounted(async () => {
  await loadTotalSongCount();
  startCounter();
});
onUnmounted(() => cancelAnimationFrame(frame));
</script>

<template>
  <div>
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
        @vue:mounted="onTileMounted"
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
