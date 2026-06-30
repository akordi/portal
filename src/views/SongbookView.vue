<script setup>
import { LxList } from '@dativa-lv/lx-ui';
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import songbookService from '@/services/songbookService';

import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';

const router = useRouter();
const route = useRoute();
const $t = useI18n().t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const loading = shallowRef(false);
const listId = computed(() => route.params.id);
const isOwner = ref(false);
const item = ref({
  name: '',
  songs: [],
});

function decorateSong(song) {
  return {
    ...song,
    name: song.title,
    description: song.mainArtist?.title,
    clickable: true,
  };
}

async function loadList() {
  loading.value = true;
  isOwner.value = false;
  try {
    // Try the owner endpoint first: a valid session cookie returns the user's
    // own songbook even when the auth store isn't hydrated yet. Only fall back
    // to the public endpoint when the caller clearly isn't the owner.
    try {
      const resp = await songbookService.findOne(listId.value);
      item.value = resp.data;
      isOwner.value = true;
      const songsResp = await songbookService.getSongs(listId.value);
      item.value.songs = songsResp.data.content.map(decorateSong);
      viewStore.title = item.value.name;
      return;
    } catch (err) {
      const status = err?.response?.status;
      if (status !== 401 && status !== 403 && status !== 404) {
        notificationStore.pushError($t('errors.loadFailed'));
        return;
      }
    }

    const pubResp = await songbookService.findPublic(listId.value);
    item.value = pubResp.data;
    const pubSongs = await songbookService.getPublicSongs(listId.value);
    item.value.songs = pubSongs.data.content.map(decorateSong);
    viewStore.title = item.value.name;
  } catch (err) {
    notificationStore.pushError($t('errors.loadFailed'));
  } finally {
    loading.value = false;
  }
}

function itemActionClicked(actionName, itemId) {
  if (actionName === 'click') {
    const song = item.value.songs.find((s) => String(s.id) === String(itemId));
    if (song && song.url) {
      const songUrl = song.url.replace(/^\/song\//, '');
      router.push({ name: 'akordiSongView', params: { url: songUrl } });
    }
  }
}

const toolbarActions = computed(() => {
  if (!isOwner.value) {
    return [];
  }
  return [{ id: 'edit', icon: 'edit', name: $t('edit'), kind: 'primary' }];
});

function toolbarActionClicked(actionName) {
  if (actionName === 'edit') {
    router.push({ name: 'songbookEdit', params: { id: String(item.value.id) } });
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
    list-type="1"
    v-model:items="item.songs"
    :toolbar-action-definitions="toolbarActions"
    @toolbar-action-click="toolbarActionClicked"
    @action-click="itemActionClicked"
  >
    <template #empty>
      {{ $t('lx.list.noItems') }}
    </template>
  </LxList>
</template>
