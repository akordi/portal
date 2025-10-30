<script setup>
import akordiService from '@/services/akordiService';
import { LxContentSwitcher, LxList, LxLoader } from '@wntr/lx-ui';
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useRoute, useRouter } from 'vue-router';

import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import axios from 'axios';

const router = useRouter();
const route = useRoute();
const translate = useI18n();
const $t = translate.t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const items = ref([]);
const loading = ref(false);
const pageSize = 10;
const searchString = ref('');
const totalCount = ref(0);

function titleOrHighlight(song) {
  return song['@search.highlights'].title?.length
    ? song['@search.highlights'].title[0]
    : song.title;
}

function mainArtistTitleOrHighlight(song) {
  return song['@search.highlights'].mainArtistTitle?.length
    ? song['@search.highlights'].mainArtistTitle[0]
    : song.mainArtistTitle;
}

async function search(q, more = false) {
  searchString.value = q;
  if (!more) {
    totalCount.value = 0;
  }
  if (!q) {
    items.value = [];
    return;
  }
  try {
    loading.value = true;
    let resp = await akordiService.search(q, {
      size: pageSize,
      skip: more ? items.value.length : 0,
    });
    if (resp.data.value.length === 0) {
      resp = await akordiService.search(`${q}*`, {
        size: pageSize,
        skip: more ? items.value.length : 0,
      });
    }
    if (resp.data.value.length === 0) {
      return;
    }
    totalCount.value = resp.data['@odata.count'];
    const results = resp.data.value.map((song) => ({
      ...song,
      id: song.id,
      name: song.title,
      title: `${mainArtistTitleOrHighlight(song)} - ${titleOrHighlight(song)}`,
      description: song['@search.highlights'].bodyLyrics?.length
        ? song['@search.highlights'].bodyLyrics[0]
        : '',
      clickable: true,
    }));
    if (more) {
      items.value = items.value.concat(results);
    } else {
      items.value = results;
    }
  } catch (err) {
    if (axios.isCancel(err)) {
      return;
    }
    notificationStore.pushError($t('pages.songSearch.search.error'));
    throw err;
  } finally {
    loading.value = false;
  }
}

async function actionClicked(action, id) {
  if (action === 'click') {
    const item = items.value.find((i) => i.id === id);
    item.url = item.url.replace(/^\/song\//, '');
    router.push({
      name: 'songSearchSongView',
      params: { url: item.url },
      query: { q: searchString.value },
    });
  }
}

function hasMore() {
  return items.value.length < totalCount.value;
}
function loadMore() {
  search(searchString.value, true);
}
const currentSection = ref('songSearch');
watch(currentSection, (newVal) => {
  if (newVal === 'songSearch') {
    router.push({ name: 'songSearch' });
    return;
  }
  if (newVal === 'songListNew') {
    router.push({ name: 'songListNew' });
    return;
  }
  if (newVal === 'songListTop') {
    router.push({ name: 'songListTop' });
  }
});
onMounted(async () => {
  if (route.query.q) {
    searchString.value = route.query.q;
    search(route.query.q);
  }
  viewStore.goBack = true;
});
</script>
<style>
.lx-loader-bar-header {
  display: none;
}

/* To fix CLS */
.lx-loader-wrapper {
  display: block;
  min-height: 25px;
}

.pre {
  white-space: pre;
}

em {
  font-weight: bold;
  color: var(--color-data);
}
</style>
<template>
  <LxContentSwitcher
    v-model="currentSection"
    :items="[
      { id: 'songSearch', name: $t('pages.songSearch.title') },
      { id: 'songListNew', name: $t('pages.songListNew.title') },
      { id: 'songListTop', name: $t('pages.songListTop.title') },
    ]"
  />
  <div class="lx-divider"></div>
  <div class="lx-loader-wrapper">
    <LxLoader :loading="loading" variant="bar" />
  </div>
  <LxList
    id-attribute="id"
    list-type="1"
    v-model:items="items"
    :has-search="true"
    searchSide="server"
    @action-click="actionClicked"
    @update:search-string="search"
    :search-string="searchString"
    icon="next"
    :show-load-more="hasMore()"
    @load-more="loadMore"
  >
    <template #customItem="{ title, description }">
      <p class="lx-primary" v-html="title"></p>
      <p class="lx-secondary pre" v-html="description"></p>
    </template>
  </LxList>
</template>
