<script setup>
import { LxForm, LxList, LxModal, LxRow, LxTextInput } from '@dativa-lv/lx-ui';
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import akordiAdminListService from '@/services/songbookService';
import akordiService from '@/services/akordiService';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import useVuelidate from '@vuelidate/core';
import * as validations from '@vuelidate/validators';

const router = useRouter();
const route = useRoute();
const $t = useI18n().t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const searchItems = ref([]);
const searchString = ref('');
const loading = shallowRef(false);
const listId = computed(() => route.params.id);
const addSongModal = ref();
const withI18nMessage = validations.createI18nMessage({ t: $t });
const item = ref({
  name: '',
  songs: [],
});
const props = defineProps({
  isNew: {
    type: Boolean,
    default: false,
  },
});

const required = withI18nMessage(validations.required);
const rules = {
  name: { required },
};

const v = useVuelidate(rules, item);

const formActions = computed(() => {
  const nav = [{ id: 'save', icon: 'save', name: $t('save'), kind: 'primary' }];
  if (props.isNew) {
    return nav;
  }
  nav.push({
    id: 'delete',
    icon: 'delete',
    name: $t('delete'),
    kind: 'tertiary',
    destructive: true,
  });
  return nav;
});

async function actionClicked(actionName) {
  if (actionName === 'save') {
    const isFormCorrect = await v.value.$validate();
    if (!isFormCorrect) {
      notificationStore.pushError($t('error.validation'));
      return;
    }
    try {
      const resp = await akordiAdminListService.save(item.value);
      notificationStore.pushSuccess($t('pages.songbook.save.success'));
      if (props.isNew) {
        router.push({ name: 'songbookEdit', params: { id: resp.data.id } });
      } else {
        viewStore.title = item.value.name;
      }
    } catch (err) {
      notificationStore.pushError($t('pages.songbook.save.error'));
    }
  }
  if (actionName === 'delete') {
    try {
      await akordiAdminListService.delete(item.value.id);
      notificationStore.pushSuccess($t('pages.songbook.delete.success'));
      router.push({ name: 'songbook' });
    } catch (err) {
      notificationStore.pushError($t('pages.songbook.delete.error'));
    }
  }
}

async function itemActionClicked(actionName, itemId) {
  if (actionName === 'click') {
    // Assuming itemId is the song id, we need to find the song's url to navigate
    const song = item.value.songs.find((s) => s.id === itemId);
    if (song && song.url) {
      const songUrl = song.url.replace(/^\/song\//, '');
      router.push({ name: 'akordiSongView', params: { url: songUrl } });
    }
    return;
  }
  if (actionName === 'delete') {
    try {
      await akordiAdminListService.removeSong(item.value.id, itemId);
      item.value.songs = item.value.songs.filter((song) => String(song.id) !== itemId);
      notificationStore.pushSuccess($t('pages.songbook.removeSong.success'));
    } catch (err) {
      notificationStore.pushError($t('pages.songbook.removeSong.error'));
    }
  }
}

function titleOrHighlight(song) {
  return song['@search.highlights']?.title?.length
    ? song['@search.highlights'].title[0]
    : song.title;
}

function mainArtistTitleOrHighlight(song) {
  return song['@search.highlights']?.mainArtistTitle?.length
    ? song['@search.highlights'].mainArtistTitle[0]
    : song.mainArtistTitle;
}

function toolbarActionClicked(actionName) {
  if (actionName === 'add') {
    addSongModal.value.open();
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
      description: song.mainArtist?.title,
      clickable: false,
    }));
    viewStore.title = item.value.name;
  } catch (err) {
    notificationStore.pushError($t('errors.loadFailed'));
  } finally {
    loading.value = false;
  }
};

async function searchActionClicked(actionName, itemId) {
  if (actionName === 'click') {
    try {
      await akordiAdminListService.addSong(item.value.id, itemId);
      searchItems.value = searchItems.value.filter((song) => song.id !== itemId);
      await loadList();
      notificationStore.pushSuccess($t('pages.songbook.addSong.success'));
    } catch (err) {
      notificationStore.pushError($t('pages.songbook.addSong.error'));
    }
  }
}

function handleAddSongModalAction(actionName) {
  if (actionName === 'cancel') {
    addSongModal.value.close();
  }
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
      description: song['@search.highlights']?.bodyLyrics?.length
        ? song['@search.highlights'].bodyLyrics[0]
        : '',
      icon: 'add',
      clickable: true,
    }));
  } catch (err) {
    notificationStore.pushError($t('pages.songSearch.search.error'));
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  viewStore.goBack = true;
  if (props.isNew) {
    viewStore.title = $t('pages.songbook.add');
    return;
  }
  await loadList();
});
</script>

<template>
  <LxForm :action-definitions="formActions" @action-click="actionClicked">
    <LxRow :label="$t('song.title')">
      <LxTextInput
        id="nameInput"
        v-model="item.name"
        @keyup.enter="actionClicked('save')"
        :invalid="v.name.$error"
        :invalidation-message="v.name.$error && v.name.$errors[0].$message"
      />
    </LxRow>
  </LxForm>
  <br />
  <LxList
    id="songs-list"
    list-type="2"
    v-model:items="item.songs"
    name-attribute="title"
    description-attribute="description"
    :toolbar-action-definitions="[
      {
        id: 'add',
        icon: 'add',
        name: $t('add'),
        kind: 'ghost',
      },
    ]"
    :action-definitions="[
      {
        id: 'delete',
        icon: 'delete',
        name: $t('delete'),
        destructive: true,
      },
    ]"
    @toolbar-action-click="toolbarActionClicked"
    @action-click="itemActionClicked"
  >
    <template #empty>
      {{ $t('lx.list.noItems') }}
    </template>
  </LxList>

  <LxModal
    ref="addSongModal"
    :title="$t('add')"
    size="m"
    :action-definitions="[{ id: 'cancel', name: $t('cancel'), kind: 'secondary' }]"
    @action-click="handleAddSongModalAction"
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

<style>
.pre {
  white-space: pre;
}

em {
  font-weight: bold;
  color: var(--color-data);
}
</style>
