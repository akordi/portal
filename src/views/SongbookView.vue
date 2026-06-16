<script setup>
import { LxButton, LxList, LxModal, LxRow, LxTextInput, LxToggle } from '@dativa-lv/lx-ui';
import { computed, onMounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute, useRouter } from 'vue-router';

import songbookService from '@/services/songbookService';

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
const isPublic = ref(false);
const shareModal = ref();
const item = ref({
  name: '',
  songs: [],
});

const shareUrl = computed(() => `${window.location.origin}/songbooks/${listId.value}`);

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
        isPublic.value = !!resp.data.isPublic;
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
    isPublic.value = !!pubResp.data.isPublic;
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
      item.value.songs = item.value.songs.filter((song) => song.id !== itemId);
      notificationStore.pushSuccess($t('pages.songbook.removeSong.success'));
    } catch (err) {
      notificationStore.pushError($t('pages.songbook.removeSong.error'));
    }
  }
}

const toolbarActions = computed(() => {
  if (!isOwner.value) {
    return [];
  }
  return [
    { id: 'share', icon: 'share', name: $t('pages.songbook.share.button'), kind: 'ghost' },
    { id: 'edit', icon: 'edit', name: $t('edit'), kind: 'primary' },
  ];
});

async function onShareToggle(value) {
  try {
    await songbookService.save({ id: item.value.id, isPublic: value });
    isPublic.value = value;
  } catch (err) {
    isPublic.value = !value;
    notificationStore.pushError($t('pages.songbook.share.error'));
  }
}

async function copyShareLink() {
  try {
    await navigator.clipboard.writeText(shareUrl.value);
    notificationStore.pushSuccess($t('pages.songbook.share.copied'));
  } catch (err) {
    notificationStore.pushError($t('pages.songbook.share.error'));
  }
}

function toolbarActionClicked(actionName) {
  if (actionName === 'edit') {
    router.push({ name: 'songbookEdit', params: { id: listId.value } });
    return;
  }
  if (actionName === 'share') {
    shareModal.value?.open();
  }
}

function shareModalAction(actionName) {
  if (actionName === 'close') {
    shareModal.value?.close();
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
    @toolbar-action-click="toolbarActionClicked"
    @action-click="itemActionClicked"
  >
    <template #empty>
      {{ $t('lx.list.noItems') }}
    </template>
  </LxList>

  <LxModal
    ref="shareModal"
    :label="$t('pages.songbook.share.title')"
    size="m"
    :action-definitions="[{ id: 'close', name: $t('cancel'), kind: 'secondary' }]"
    @action-click="shareModalAction"
  >
    <LxRow
      :label="$t('pages.songbook.share.toggle')"
      :description="$t('pages.songbook.share.toggleHint')"
    >
      <LxToggle :model-value="isPublic" @update:model-value="onShareToggle" />
    </LxRow>
    <LxRow v-if="isPublic" :label="$t('pages.songbook.share.linkLabel')">
      <LxTextInput :model-value="shareUrl" read-only />
    </LxRow>
    <LxRow v-if="isPublic">
      <LxButton
        :label="$t('pages.songbook.share.copy')"
        icon="copy"
        kind="primary"
        @click="copyShareLink"
      />
    </LxRow>
    <LxRow v-else>
      <p class="lx-secondary">{{ $t('pages.songbook.share.notPublicHint') }}</p>
    </LxRow>
  </LxModal>
</template>
