<script setup>
import { LxList, LxModal } from '@dativa-lv/lx-ui';
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import axios from 'axios';

import songbookService from '@/services/songbookService';
import akordiService from '@/services/akordiService';
import SongbookFormModal from '@/components/SongbookFormModal.vue';

import useAuthStore from '@/stores/useAuthStore';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';

const router = useRouter();
const route = useRoute();
const $t = useI18n().t;
const authStore = useAuthStore();
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const loading = shallowRef(false);
const listId = computed(() => route.params.id);
const isOwner = ref(false);
const addSongModal = ref();
const formModal = ref();
const searchItems = ref([]);
const searchString = ref('');
const item = ref({
  name: '',
  songs: [],
});

async function loadList() {
  loading.value = true;
  isOwner.value = false;
  try {
    const authed = await authStore.isAuthenticated();
    if (authed) {
      try {
        const resp = await songbookService.findOne(listId.value);
        item.value = resp.data;
        isOwner.value = true;
        const songsResp = await songbookService.getSongs(listId.value);
        item.value.songs = songsResp.data.content.map((song) => ({
          ...song,
          name: song.title,
          description: song.mainArtist?.title,
          clickable: true,
        }));
        viewStore.title = item.value.name;
        return;
      } catch (err) {
        if (err?.response?.status !== 404) {
          notificationStore.pushError($t('errors.loadFailed'));
          return;
        }
      }
    }

    const pubResp = await songbookService.findPublic(listId.value);
    item.value = pubResp.data;
    const pubSongs = await songbookService.getPublicSongs(listId.value);
    item.value.songs = pubSongs.data.content.map((song) => ({
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
}

async function itemActionClicked(actionName, itemId) {
  if (actionName === 'click') {
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
  }
}

const songActions = computed(() => {
  if (!isOwner.value) {
    return [];
  }
  return [{ id: 'delete', icon: 'delete', name: $t('delete'), destructive: true }];
});

const toolbarActions = computed(() => {
  if (!isOwner.value) {
    return [];
  }
  return [
    { id: 'add', icon: 'add', name: $t('add'), kind: 'ghost' },
    { id: 'edit', icon: 'edit', name: $t('edit'), kind: 'primary' },
  ];
});

function toolbarActionClicked(actionName) {
  if (actionName === 'edit') {
    formModal.value?.open({
      id: item.value.id,
      name: item.value.name,
      isPublic: item.value.isPublic,
    });
    return;
  }
  if (actionName === 'add') {
    searchString.value = '';
    searchItems.value = [];
    addSongModal.value?.open();
  }
}

function onSongbookUpdated(songbook) {
  item.value.name = songbook.name;
  item.value.isPublic = songbook.isPublic;
  viewStore.title = songbook.name;
}

function onSongbookDeleted() {
  router.push({ name: 'songbook' });
}

const HIGHLIGHTS_KEY = '@search.highlights';

function firstHighlight(song, field) {
  const highlights = song[HIGHLIGHTS_KEY]?.[field];
  return highlights?.length ? highlights[0] : null;
}

function titleOrHighlight(song) {
  return firstHighlight(song, 'title') ?? song.title;
}

function mainArtistTitleOrHighlight(song) {
  return firstHighlight(song, 'mainArtistTitle') ?? song.mainArtistTitle;
}

async function searchSongs(query) {
  searchString.value = query;
  if (!query) {
    searchItems.value = [];
    return;
  }
  try {
    loading.value = true;
    const resp = await akordiService.search(query, { size: 10 });
    searchItems.value = resp.data.value.map((song) => ({
      ...song,
      name: song.title,
      title: `${mainArtistTitleOrHighlight(song)} - ${titleOrHighlight(song)}`,
      description: firstHighlight(song, 'bodyLyrics') ?? '',
      icon: 'add',
      clickable: true,
    }));
  } catch (err) {
    if (axios.isCancel(err)) {
      return;
    }
    notificationStore.pushError($t('pages.songSearch.search.error'));
  } finally {
    loading.value = false;
  }
}

async function searchActionClicked(actionName, itemId) {
  if (actionName === 'click') {
    try {
      await songbookService.addSong(item.value.id, itemId);
      searchItems.value = searchItems.value.filter((song) => song.id !== itemId);
      await loadList();
      notificationStore.pushSuccess($t('pages.songbook.addSong.success'));
    } catch (err) {
      notificationStore.pushError($t('pages.songbook.addSong.error'));
    }
  }
}

function addSongModalAction(actionName) {
  if (actionName === 'cancel') {
    addSongModal.value?.close();
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

  <SongbookFormModal ref="formModal" @updated="onSongbookUpdated" @deleted="onSongbookDeleted" />

  <LxModal
    ref="addSongModal"
    :label="$t('add')"
    size="m"
    :action-definitions="[{ id: 'cancel', name: $t('cancel'), kind: 'secondary' }]"
    @action-click="addSongModalAction"
  >
    <LxList
      id="search-songs-list"
      list-type="1"
      v-model:items="searchItems"
      :has-search="true"
      search-side="server"
      @action-click="searchActionClicked"
      @update:search-string="searchSongs"
      v-model:search-string="searchString"
    >
      <template #empty>
        {{ $t('lx.list.noItems') }}
      </template>
      <template #customItem="{ title, description }">
        <p class="lx-primary" v-html="title"></p>
        <p class="lx-secondary pre" v-html="description"></p>
      </template>
    </LxList>
  </LxModal>
</template>
