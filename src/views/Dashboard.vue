<script setup>
import { LxTile } from '@wntr/lx-ui';
import { onMounted, ref } from 'vue';

import akordiService from '@/services/akordiService';
import { useI18n } from 'vue-i18n';

const songCount = ref(1);
const songCountTotal = ref(1000);
const loadingSongsTotal = ref(true);
const $t = useI18n().t;

async function loadTotalSongCount() {
  try {
    const resp = await akordiService.getSongsCount();
    songCountTotal.value = resp.data.totalElements;
  } finally {
    loadingSongsTotal.value = false;
  }
}
function incrementToCount() {
  if (songCount.value < songCountTotal.value) {
    songCount.value += 1;
  }
}

async function startCounter() {
  setInterval(incrementToCount, 1);
  setInterval(incrementToCount, 1);
  setInterval(incrementToCount, 1);
  setInterval(incrementToCount, 1);
  setInterval(incrementToCount, 1);
  setInterval(incrementToCount, 1);
  setInterval(incrementToCount, 1);
}

onMounted(async () => {
  startCounter();
  await loadTotalSongCount();
});
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
