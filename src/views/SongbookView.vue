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
const editMode = ref(false);
const item = ref({
  name: '',
  songs: [],
});

function decorateSong(song) {
  return {
    ...song,
    name: song.title,
    description: song.mainArtist?.title,
    clickable: !editMode.value,
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

function setEditMode(value) {
  editMode.value = value;
  // Songs are only clickable (navigate to the song) outside edit mode.
  item.value.songs = item.value.songs.map((song) => ({ ...song, clickable: !value }));
}

async function moveSong(itemId, direction) {
  const { songs } = item.value;
  const index = songs.findIndex((song) => String(song.id) === String(itemId));
  const target = index + direction;
  if (index < 0 || target < 0 || target >= songs.length) {
    return;
  }
  const previous = [...songs];
  const reordered = [...songs];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
  item.value.songs = reordered;
  try {
    await songbookService.reorderSongs(
      item.value.id,
      reordered.map((song) => song.id)
    );
  } catch (err) {
    item.value.songs = previous;
    notificationStore.pushError($t('pages.songbook.reorderSong.error'));
  }
}

async function itemActionClicked(actionName, itemId) {
  if (actionName === 'click') {
    if (editMode.value) {
      return;
    }
    const song = item.value.songs.find((s) => String(s.id) === String(itemId));
    if (song && song.url) {
      const songUrl = song.url.replace(/^\/song\//, '');
      router.push({ name: 'akordiSongView', params: { url: songUrl } });
    }
    return;
  }
  if (actionName === 'delete') {
    try {
      await songbookService.removeSong(item.value.id, itemId);
      item.value.songs = item.value.songs.filter((song) => String(song.id) !== String(itemId));
      notificationStore.pushSuccess($t('pages.songbook.removeSong.success'));
    } catch (err) {
      notificationStore.pushError($t('pages.songbook.removeSong.error'));
    }
    return;
  }
  if (actionName === 'moveUp') {
    await moveSong(itemId, -1);
    return;
  }
  if (actionName === 'moveDown') {
    await moveSong(itemId, 1);
  }
}

const songActions = computed(() => {
  if (!isOwner.value || !editMode.value) {
    return [];
  }
  return [
    { id: 'moveUp', icon: 'move-up', name: $t('pages.songbook.moveUp') },
    { id: 'moveDown', icon: 'move-down', name: $t('pages.songbook.moveDown') },
    { id: 'delete', icon: 'delete', name: $t('delete'), destructive: true },
  ];
});

const toolbarActions = computed(() => {
  if (!isOwner.value) {
    return [];
  }
  if (!editMode.value) {
    return [{ id: 'edit', icon: 'edit', name: $t('edit'), kind: 'primary' }];
  }
  return [
    { id: 'add', icon: 'add', name: $t('pages.songbook.addSong.action'), kind: 'ghost' },
    { id: 'settings', icon: 'config', name: $t('pages.songbook.settings.action'), kind: 'ghost' },
    { id: 'done', name: $t('done'), kind: 'primary' },
  ];
});

function toolbarActionClicked(actionName) {
  if (actionName === 'edit') {
    setEditMode(true);
    return;
  }
  if (actionName === 'done') {
    setEditMode(false);
    return;
  }
  if (actionName === 'add') {
    router.push({ name: 'songbookAddSongs', params: { id: String(item.value.id) } });
    return;
  }
  if (actionName === 'settings') {
    router.push({ name: 'songbookSettings', params: { id: String(item.value.id) } });
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
    :toolbar-action-definitions="toolbarActions"
    :action-definitions="songActions"
    @toolbar-action-click="toolbarActionClicked"
    @action-click="itemActionClicked"
  >
    <template #empty>
      {{ $t('lx.list.noItems') }}
    </template>
  </LxList>
</template>
