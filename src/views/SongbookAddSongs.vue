<script setup>
import { LxList } from '@akordi/lx-ui';
import { computed, onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

import axios from 'axios';

import songbookService from '@/services/songbookService';
import akordiService from '@/services/akordiService';

import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import { listTexts } from '@/utils/texts';
import { searchResultDescriptionHtml, searchResultTitleHtml } from '@/utils/html';

const route = useRoute();
const $t = useI18n().t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const listId = computed(() => route.params.id);
const searchItems = ref([]);
const searchString = ref('');

async function searchSongs(query) {
  searchString.value = query;
  if (!query) {
    searchItems.value = [];
    return;
  }
  try {
    // ponytail: no loading state while typing — LxList disables (and thus
    // defocuses) its search input whenever `loading` is set
    const resp = await akordiService.search(query, { size: 10 });
    searchItems.value = resp.data.value.map((song) => ({
      ...song,
      id: String(song.id),
      name: song.title,
      title: `${song.mainArtistTitle} - ${song.title}`,
      titleHtml: searchResultTitleHtml(song),
      descriptionHtml: searchResultDescriptionHtml(song),
      icon: 'add',
      clickable: true,
    }));
  } catch (err) {
    if (axios.isCancel(err)) {
      return;
    }
    notificationStore.pushError($t('pages.songSearch.search.error'));
  }
}

async function searchActionClicked(actionName, itemId) {
  if (actionName === 'click') {
    try {
      await songbookService.addSong(listId.value, itemId);
      searchItems.value = searchItems.value.filter((song) => song.id !== itemId);
      notificationStore.pushSuccess($t('pages.songbook.addSong.success'));
    } catch (err) {
      notificationStore.pushError($t('pages.songbook.addSong.error'));
    }
  }
}

onMounted(() => {
  viewStore.title = $t('pages.songbook.addSong.title');
  viewStore.goBack = true;
});
</script>
<style>
.pre {
  white-space: pre;
}

em {
  font-weight: bold;
  color: var(--color-data);
}
</style>
<template>
  <LxList
    id="add-songs-list"
    list-type="1"
    v-model:items="searchItems"
    :has-search="true"
    search-side="server"
    @action-click="searchActionClicked"
    @update:search-string="searchSongs"
    v-model:search-string="searchString"
    :texts="listTexts()"
  >
    <template #customItem="{ titleHtml, descriptionHtml }">
      <p class="lx-primary" v-html="titleHtml"></p>
      <p class="lx-secondary pre" v-html="descriptionHtml"></p>
    </template>
  </LxList>
</template>
