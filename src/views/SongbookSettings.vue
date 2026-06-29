<script setup>
import { LxButton, LxForm, LxLoaderView, LxRow, LxTextInput, LxToggle } from '@dativa-lv/lx-ui';
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
const saving = ref(false);
const deleting = ref(false);
const listId = computed(() => route.params.id);
const item = ref({ id: null, name: '', isPublic: false });
const nameInvalid = ref(false);

const shareUrl = computed(() =>
  item.value.id ? `${globalThis.location.origin}/songbooks/${item.value.id}` : ''
);

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
    };
    viewStore.title = item.value.name;
  } catch (err) {
    notificationStore.pushError($t('errors.loadFailed'));
    goBackToSongbook();
  } finally {
    loading.value = false;
  }
}

async function save() {
  nameInvalid.value = !item.value.name.trim();
  if (nameInvalid.value) {
    notificationStore.pushError($t('error.validation'));
    return;
  }
  saving.value = true;
  try {
    await songbookService.save({ id: item.value.id, name: item.value.name });
    notificationStore.pushSuccess($t('pages.songbook.save.success'));
    goBackToSongbook();
  } catch (err) {
    notificationStore.pushError($t('pages.songbook.save.error'));
  } finally {
    saving.value = false;
  }
}

async function remove() {
  deleting.value = true;
  try {
    await songbookService.delete(item.value.id);
    notificationStore.pushSuccess($t('pages.songbook.delete.success'));
    router.push({ name: 'songbook' });
  } catch (err) {
    notificationStore.pushError($t('pages.songbook.delete.error'));
  } finally {
    deleting.value = false;
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

const formActions = computed(() => [
  { id: 'save', name: $t('save'), icon: 'save', kind: 'primary', busy: saving.value },
  {
    id: 'delete',
    name: $t('delete'),
    icon: 'delete',
    kind: 'tertiary',
    destructive: true,
    busy: deleting.value,
  },
]);

function actionClicked(actionName) {
  if (actionName === 'save') {
    save();
  } else if (actionName === 'delete') {
    remove();
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
      :action-definitions="formActions"
      :show-header="false"
      kind="compact"
      @action-click="actionClicked"
    >
      <LxRow :label="$t('pages.songbook.name')">
        <LxTextInput
          id="songbookNameInput"
          v-model="item.name"
          :invalid="nameInvalid"
          @keyup.enter="save"
        />
      </LxRow>

      <LxRow
        :label="$t('pages.songbook.share.toggle')"
        :description="$t('pages.songbook.share.toggleHint')"
      >
        <LxToggle :model-value="item.isPublic" @update:model-value="onShareToggle" />
      </LxRow>
      <LxRow v-if="item.isPublic" :label="$t('pages.songbook.share.linkLabel')">
        <LxTextInput :model-value="shareUrl" read-only />
      </LxRow>
      <LxRow v-if="item.isPublic">
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
    </LxForm>
  </LxLoaderView>
</template>
