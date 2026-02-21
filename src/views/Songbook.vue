<script setup>
import akordiAdminListService from '@/services/songbookService';
import { LxButton, LxList } from '@dativa-lv/lx-ui';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';

const router = useRouter();
const $t = useI18n().t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const items = ref([]);
const loading = ref(true);

async function loadLists() {
  try {
    loading.value = true;
    const resp = await akordiAdminListService.findAll();
    items.value = resp.data.map((list) => ({
      ...list,
      title: list.name,
      clickable: true,
      icon: 'next',
    }));
  } catch (err) {
    notificationStore.pushError($t('errors.loadFailed'));
  } finally {
    loading.value = false;
  }
}

function actionClicked(action, id) {
  if (action === 'click') {
    router.push({ name: 'songbookView', params: { id: String(id) } });
  }
}

onMounted(async () => {
  viewStore.title = $t('pages.songbook.title');
  viewStore.goBack = true;
  await loadLists();
});
</script>

<template>
  <LxList
    id="id"
    list-type="2"
    v-model:items="items"
    id-attribute="id"
    primary-attribute="title"
    :loading="loading"
    @action-click="actionClicked"
  >
    <template #toolbar>
      <LxButton icon="add" :label="$t('add')" @click="router.push({ name: 'songbookNewForm' })" />
    </template>
    <template #empty>
      {{ $t('pages.songbook.empty') }}
    </template>
  </LxList>
</template>
