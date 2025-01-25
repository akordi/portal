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
      sort: 'songTop.visitsWeekly,desc',
    });
    items.value = resp.data.content.map((song) => ({
      ...song,
      description: song.mainArtist.title,
      clickable: true,
    }));
  } catch (err) {
    console.log(err);
    notificationStore.pushError($t('pages.akordiSongListNew.list.error'));
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
    router.push({ name: 'akordiSongView', params: { url: item.url } });
  }
}
const currentSection = ref('akordiSongListTop');
watch(currentSection, (newVal) => {
  if (newVal === 'akordiSongSearch') {
    router.push({ name: 'akordiSongSearch' });
    return;
  }
  if (newVal === 'akordiSongListNew') {
    router.push({ name: 'akordiSongListNew' });
    return;
  }
  if (newVal === 'akordiSongListTop') {
    router.push({ name: 'akordiSongListTop' });
  }
});
</script>
<template>
  <LxContentSwitcher
    v-model="currentSection"
    :items="[
      { id: 'akordiSongSearch', name: $t('pages.akordiSongList.title') },
      { id: 'akordiSongListNew', name: $t('pages.akordiSongListNew.title') },
      { id: 'akordiSongListTop', name: $t('pages.akordiSongListTop.title') },
    ]"
  />
  <div class="lx-divider"></div>
  <LxList
    id="id"
    list-type="2"
    :loading="loading"
    v-model:items="items"
    primary-attribute="title"
    secondary-attribute="description"
    @action-click="actionClicked"
  >
  </LxList>
</template>
