<script setup>
import akordiService from '@/services/akordiService';
import { LxList } from '@dativa-lv/lx-ui';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';

import { useRouter } from 'vue-router';

import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';

const router = useRouter();
const translate = useI18n();
const $t = translate.t;
const viewStore = useViewStore();
const tag = ref({});
const notificationStore = useNotifyStore();
const tags = ref([]);
const loading = ref(true);

async function loadTags() {
  try {
    loading.value = true;
    const resp = await akordiService.getTags({
      size: 100000,
      sort: 'title,asc',
    });

    tags.value = resp.data.content.map((item) => ({
      ...item,
      clickable: true,
      name: `${item.title} (${item.songCount})`,
    }));
  } catch (err) {
    notificationStore.pushError($t('pages.tagList.list.error'));
    throw err;
  } finally {
    loading.value = false;
  }
}
function actionClicked(action, id) {
  if (action === 'click') {
    const item = tags.value.find((i) => i.id === +id);
    item.url = item.url.replace(/^\/tag\//, '');
    router.push({ name: 'tagView', params: { url: item.url } });
  }
}

onMounted(async () => {
  loadTags();
  viewStore.goBack = true;
});
</script>
<template>
  <LxList
    :items="tags"
    v-model="tag"
    v-if="tags"
    @action-click="actionClicked"
    :loading="loading"
  />
  <br />
</template>
