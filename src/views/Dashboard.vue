<script setup>
import { LxTile } from "@wntr/lx-ui";
import { onMounted, ref } from "vue";

import akordiService from "@/services/akordiService";
import { useI18n } from "vue-i18n";

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
    <div class="lx-dashboard">
      <LxTile icon="search-details" :label="$t('pages.akordiSongList.title')"
        :description="$t('pages.akordiSongList.description', { songCount: songCount })"
        :to="{ name: 'akordiSongSearch' }" />
      <LxTile icon="users" :label="$t('pages.akordiArtistLetter.title')"
        :description="$t('pages.akordiArtistLetter.description')"
        :to="{ name: 'akordiArtistLetter', params: { letter: '0' } }" />
      <LxTile icon="star-filled" :label="$t('pages.akordiSongListTop.title')"
        :description="$t('pages.akordiSongListTop.description')" :to="{ name: 'akordiSongListTop' }" />
      <LxTile icon="tag" :label="$t('pages.tagList.title')" :description="$t('pages.tagList.description')"
        :to="{ name: 'tagList' }" />
    </div>
  </div>
</template>
