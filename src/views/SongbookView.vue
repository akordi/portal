<script setup>
import { LxList } from '@dativa-lv/lx-ui';
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import akordiAdminListService from '@/services/songbookService';

import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';

const router = useRouter();
const route = useRoute();
const $t = useI18n().t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const loading = shallowRef(false);
const listId = computed(() => route.params.id);
const item = ref({
  name: '',
  songs: [],
});

async function itemActionClicked(actionName, itemId) {
  if (actionName === 'click') {
    // Assuming itemId is the song id, we need to find the song's url to navigate
    const song = item.value.songs.find((s) => String(s.id) === String(itemId));
    if (song && song.url) {
      const songUrl = song.url.replace(/^\/song\//, '');
      router.push({ name: 'akordiSongView', params: { url: songUrl } });
    }
    return;
  }
  if (actionName === 'delete') {
    try {
      await akordiAdminListService.removeSong(item.value.id, itemId);
      item.value.songs = item.value.songs.filter((song) => song.id !== itemId);
      notificationStore.pushSuccess($t('pages.songbook.removeSong.success'));
    } catch (err) {
      notificationStore.pushError($t('pages.songbook.removeSong.error'));
    }
  }
}

const loadList = async () => {
  loading.value = true;
  try {
    const resp = await akordiAdminListService.findOne(listId.value);
    item.value = resp.data;

    const songsResp = await akordiAdminListService.getSongs(listId.value);
    item.value.songs = songsResp.data.content.map((song) => ({
      ...song,
      name: song.title,
      description: song.mainArtist?.title,
      clickable: true,
    }));
    viewStore.title = item.value.name;
  } catch (err) {
    notificationStore.pushError($t('errors.loadFailed'));
  } finally {
    loading.value = false;
  }
};

function toolbarActionClicked(actionName) {
  if (actionName === 'edit') {
    router.push({ name: 'songbookEdit', params: { id: listId.value } });
  }
}

onMounted(async () => {
  viewStore.goBack = true;
  await loadList();
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
  <LxList
    id="songs-list"
    list-type="2"
    v-model:items="item.songs"
    :toolbar-action-definitions="[
      {
        id: 'edit',
        icon: 'edit',
        name: $t('edit'),
        kind: 'primary',
      },
    ]"
    @toolbar-action-click="toolbarActionClicked"
    @action-click="itemActionClicked"
  >
    <template #empty>
      {{ $t('lx.list.noItems') }}
    </template>
  </LxList>
</template>
