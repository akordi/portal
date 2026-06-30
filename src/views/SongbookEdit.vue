<script setup>
import { LxForm, LxList, LxLoaderView, LxRow, LxSection, LxTextInput, LxToggle } from '@dativa-lv/lx-ui';
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import songbookService from '@/services/songbookService';

import useConfirmStore from '@/stores/useConfirmStore';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';

const router = useRouter();
const route = useRoute();
const $t = useI18n().t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const confirmStore = useConfirmStore();

const loading = shallowRef(true);
const savingName = ref(false);
const listId = computed(() => route.params.id);
const item = ref({ id: null, name: '', isPublic: false, songs: [] });
const nameInvalid = ref(false);

const shareUrl = computed(() =>
  item.value.id ? `${globalThis.location.origin}/songbooks/${item.value.id}` : ''
);

function decorateSong(song) {
  return {
    ...song,
    name: song.title,
    description: song.mainArtist?.title,
    clickable: false,
  };
}

function goBackToSongbook() {
  router.push({ name: 'songbookView', params: { id: String(listId.value) } });
}

async function load() {
  loading.value = true;
  try {
    const resp = await songbookService.findOne(listId.value);
    item.value = {
      id: resp.data.id,
      name: resp.data.name,
      isPublic: !!resp.data.isPublic,
      songs: [],
    };
    const songsResp = await songbookService.getSongs(listId.value);
    item.value.songs = songsResp.data.content.map(decorateSong);
    viewStore.title = item.value.name;
  } catch (err) {
    notificationStore.pushError($t('errors.loadFailed'));
    goBackToSongbook();
  } finally {
    loading.value = false;
  }
}

async function saveName() {
  nameInvalid.value = !item.value.name.trim();
  if (nameInvalid.value) {
    notificationStore.pushError($t('error.validation'));
    return;
  }
  savingName.value = true;
  try {
    await songbookService.save({ id: item.value.id, name: item.value.name });
    viewStore.title = item.value.name;
    notificationStore.pushSuccess($t('pages.songbook.save.success'));
  } catch (err) {
    notificationStore.pushError($t('pages.songbook.save.error'));
  } finally {
    savingName.value = false;
  }
}

async function onShareToggle(value) {
  const previous = item.value.isPublic;
  item.value.isPublic = value;
  try {
    await songbookService.save({ id: item.value.id, isPublic: value });
  } catch {
    item.value.isPublic = previous;
    notificationStore.pushError($t('pages.songbook.share.error'));
  }
}

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    notificationStore.pushSuccess($t('pages.songbook.share.copied'));
  } catch {
    notificationStore.pushError($t('pages.songbook.share.error'));
  }
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

async function removeSong(itemId) {
  try {
    await songbookService.removeSong(item.value.id, itemId);
    item.value.songs = item.value.songs.filter((song) => String(song.id) !== String(itemId));
    notificationStore.pushSuccess($t('pages.songbook.removeSong.success'));
  } catch (err) {
    notificationStore.pushError($t('pages.songbook.removeSong.error'));
  }
}

function itemActionClicked(actionName, itemId) {
  if (actionName === 'moveUp') {
    moveSong(itemId, -1);
  } else if (actionName === 'moveDown') {
    moveSong(itemId, 1);
  } else if (actionName === 'delete') {
    removeSong(itemId);
  }
}

async function removeSongbook() {
  confirmStore.$state.isOpen = false;
  try {
    await songbookService.delete(item.value.id);
    notificationStore.pushSuccess($t('pages.songbook.delete.success'));
    router.push({ name: 'songbook' });
  } catch (err) {
    notificationStore.pushError($t('pages.songbook.delete.error'));
  }
}

function confirmDelete() {
  confirmStore.push(
    $t('pages.songbook.delete.title'),
    $t('pages.songbook.delete.message', { name: item.value.name }),
    $t('delete'),
    $t('cancel'),
    removeSongbook,
    () => {
      confirmStore.$state.isOpen = false;
    }
  );
}

const formActions = computed(() => [
  { id: 'save', name: $t('save'), icon: 'save', kind: 'primary', busy: savingName.value },
]);

const settingsActions = computed(() => [
  {
    id: 'delete',
    name: $t('pages.songbook.delete.title'),
    icon: 'delete',
    kind: 'ghost',
    destructive: true,
  },
]);

const shareRowActions = computed(() => [
  { id: 'copy', name: $t('pages.songbook.share.copy'), icon: 'copy' },
]);

function formActionClicked(actionName) {
  if (actionName === 'save') {
    saveName();
  }
}

function settingsActionClicked(actionName) {
  if (actionName === 'delete') {
    confirmDelete();
  }
}

function shareRowActionClicked(actionName) {
  if (actionName === 'copy') {
    copyShareLink();
  }
}

const songActions = [
  { id: 'moveUp', icon: 'move-up', name: $t('pages.songbook.moveUp') },
  { id: 'moveDown', icon: 'move-down', name: $t('pages.songbook.moveDown') },
  { id: 'delete', icon: 'delete', name: $t('delete'), destructive: true },
];

const songToolbarActions = [
  { id: 'add', icon: 'add', name: $t('pages.songbook.addSong.action'), kind: 'ghost' },
];

function songToolbarActionClicked(actionName) {
  if (actionName === 'add') {
    router.push({ name: 'songbookAddSongs', params: { id: String(item.value.id) } });
  }
}

onMounted(async () => {
  viewStore.goBack = true;
  await load();
});
</script>
<template>
  <LxLoaderView :loading="loading">
    <LxForm
      kind="compact"
      :column-count="1"
      :show-header="false"
      :action-definitions="formActions"
      @action-click="formActionClicked"
    >
      <LxSection
        id="songbook-settings"
        :label="$t('pages.songbook.settings.action')"
        :action-definitions="settingsActions"
        @action-click="settingsActionClicked"
      >
        <LxRow :label="$t('pages.songbook.name')">
          <LxTextInput
            id="songbookNameInput"
            v-model="item.name"
            :invalid="nameInvalid"
            @keyup.enter="saveName"
          />
        </LxRow>
        <LxRow
          :label="$t('pages.songbook.share.toggle')"
          :description="$t('pages.songbook.share.toggleHint')"
        >
          <LxToggle :model-value="item.isPublic" @update:model-value="onShareToggle" />
        </LxRow>
        <LxRow
          v-if="item.isPublic"
          :label="$t('pages.songbook.share.linkLabel')"
          :action-definitions="shareRowActions"
          @action-click="shareRowActionClicked"
        >
          <LxTextInput :model-value="shareUrl" :read-only="true" />
        </LxRow>
      </LxSection>

      <LxSection id="songbook-songs" :label="$t('pages.songbook.songs')">
        <LxList
          id="edit-songs-list"
          list-type="1"
          v-model:items="item.songs"
          :toolbar-action-definitions="songToolbarActions"
          :action-definitions="songActions"
          @toolbar-action-click="songToolbarActionClicked"
          @action-click="itemActionClicked"
        >
          <template #empty>
            {{ $t('lx.list.noItems') }}
          </template>
        </LxList>
      </LxSection>
    </LxForm>
  </LxLoaderView>
</template>
