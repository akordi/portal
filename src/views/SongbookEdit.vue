<script setup>
import {
  LxButton,
  LxList,
  LxLoaderView,
  LxModal,
  LxRow,
  LxSection,
  LxTextInput,
  LxToggle,
} from '@dativa-lv/lx-ui';
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

const loading = shallowRef(true);
const savingName = ref(false);
const listId = computed(() => route.params.id);
const item = ref({ id: null, name: '', isPublic: false, songs: [] });
const nameInvalid = ref(false);
const confirmDeleteModal = ref();

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

async function itemActionClicked(actionName, itemId) {
  if (actionName === 'moveUp') {
    await moveSong(itemId, -1);
    return;
  }
  if (actionName === 'moveDown') {
    await moveSong(itemId, 1);
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

async function removeSongbook() {
  try {
    await songbookService.delete(item.value.id);
    notificationStore.pushSuccess($t('pages.songbook.delete.success'));
    router.push({ name: 'songbook' });
  } catch (err) {
    notificationStore.pushError($t('pages.songbook.delete.error'));
  }
}

onMounted(async () => {
  viewStore.goBack = true;
  await load();
});
</script>
<style>
.songbook-edit-section {
  margin-bottom: 1.5rem;
}

.songbook-delete {
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-chrome);
}

.songbook-name-save {
  margin-top: 0.5rem;
}
</style>
<template>
  <LxLoaderView :loading="loading">
    <section class="songbook-edit-section">
      <LxRow :label="$t('pages.songbook.name')">
        <LxTextInput
          id="songbookNameInput"
          v-model="item.name"
          :invalid="nameInvalid"
          @keyup.enter="saveName"
        />
        <div class="songbook-name-save">
          <LxButton
            :label="$t('save')"
            icon="save"
            kind="primary"
            :busy="savingName"
            @click="saveName"
          />
        </div>
      </LxRow>

      <LxRow
        :label="$t('pages.songbook.share.toggle')"
        :description="$t('pages.songbook.share.toggleHint')"
      >
        <LxToggle :model-value="item.isPublic" @update:model-value="onShareToggle" />
      </LxRow>
      <LxRow v-if="item.isPublic" :label="$t('pages.songbook.share.linkLabel')">
        <LxTextInput :model-value="shareUrl" read-only />
        <div class="songbook-name-save">
          <LxButton
            :label="$t('pages.songbook.share.copy')"
            icon="copy"
            kind="secondary"
            @click="copyShareLink"
          />
        </div>
      </LxRow>
    </section>

    <LxSection :label="$t('pages.songbook.songs')">
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

    <div class="songbook-delete">
      <LxButton
        :label="$t('pages.songbook.delete.title')"
        icon="delete"
        kind="tertiary"
        :destructive="true"
        @click="confirmDeleteModal.open()"
      />
    </div>
  </LxLoaderView>

  <LxModal
    ref="confirmDeleteModal"
    :label="$t('pages.songbook.delete.title')"
    size="s"
    :action-definitions="[
      { id: 'delete', name: $t('delete'), icon: 'delete', destructive: true },
      { id: 'cancel', name: $t('cancel'), kind: 'secondary' },
    ]"
    @action-click="
      (action) => {
        if (action === 'delete') {
          removeSongbook();
        } else {
          confirmDeleteModal.close();
        }
      }
    "
  >
    <p class="lx-data">{{ $t('pages.songbook.delete.message', { name: item.name }) }}</p>
  </LxModal>
</template>
