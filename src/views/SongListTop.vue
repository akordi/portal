<script setup>
import akordiService from '@/services/akordiService';
import { LxContentSwitcher, LxList } from '@dativa-lv/lx-ui';
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useRouter } from 'vue-router';

import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import { listTexts } from '@/utils/texts';

const router = useRouter();
const translate = useI18n();
const $t = translate.t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const items = ref([]);
const loading = ref(true);
const hasMore = ref(false);
const page = ref(0);

async function loadSongs() {
  try {
    loading.value = true;
    const resp = await akordiService.getSongs({
      size: 40,
      page: page.value,
      sort: 'songTop.visitsWeekly,desc',
    });

    if (page.value === 0) {
      items.value = [];
    }
    items.value.push(
      ...resp.data.content.map((song) => ({
        ...song,
        description: song.mainArtist.title,
        clickable: true,
      }))
    );
    hasMore.value = items.value.length < resp.data.totalElements;
  } catch (err) {
    notificationStore.pushError($t('pages.songListNew.list.error'));
    throw err;
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  page.value += 1;
  loadSongs();
}

onMounted(async () => {
  viewStore.goBack = true;
  loadSongs();
});

function actionClicked(action, id) {
  if (action === 'click') {
    const item = items.value.find((i) => i.id === +id);
    item.url = item.url.replace(/^\/song\//, '');
    router.push({ name: 'songListTopSongView', params: { url: item.url } });
  }
}
const currentSection = ref('songListTop');
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
</script>
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
  <LxList
    id="id"
    list-type="2"
    :loading="loading"
    v-model:items="items"
    name-attribute="title"
    description-attribute="description"
    @action-click="actionClicked"
    :show-load-more="hasMore"
    @load-more="loadMore"
    :texts="listTexts()"
  >
  </LxList>
</template>
