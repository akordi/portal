<script setup>
import akordiService from '@/services/akordiService';
import { LxContentSwitcher, LxList } from '@wntr/lx-ui';
import { onMounted, ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useRouter } from 'vue-router';

import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';

const router = useRouter();
const translate = useI18n();
const $t = translate.t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const items = ref([]);
const loading = ref(true);

async function load() {
  try {
    loading.value = true;
    const resp = await akordiService.getSongs({
      size: 20,
      page: 0,
      sort: 'createdDate,desc',
    });
    items.value = resp.data.content.map((song) => ({
      ...song,
      description: song.mainArtist.title,
      clickable: true,
    }));
  } catch (err) {
    console.log(err);
    notificationStore.pushError($t('pages.songListNew.list.error'));
    throw err;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  viewStore.goBack = true;
  load();
});

function actionClicked(action, id) {
  if (action === 'click') {
    const item = items.value.find((i) => i.id === +id);
    item.url = item.url.replace(/^\/song\//, '');
    router.push({ name: 'songListNewSongView', params: { url: item.url } });
  }
}
const currentSection = ref('songListNew');
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
    v-model:items="items"
    :loading="loading"
    primary-attribute="title"
    secondary-attribute="description"
    @action-click="actionClicked"
  >
  </LxList>
</template>
