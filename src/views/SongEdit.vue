<script setup>
import {
  LxAutoComplete,
  LxForm,
  LxRow,
  LxTextArea,
  LxTextInput,
  LxValuePicker,
} from '@dativa-lv/lx-ui';
import { computed, onMounted, onUnmounted, ref, shallowRef } from 'vue';
import { useI18n } from 'vue-i18n';

import { useRoute, useRouter } from 'vue-router';

import akordiService from '@/services/akordiService';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import useVuelidate from '@vuelidate/core';
import * as validations from '@vuelidate/validators';

const router = useRouter();
const translate = useI18n();
const $t = translate.t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const route = useRoute();
const idParam = computed(() => route.query.id);
const loading = shallowRef(false);
const notify = useNotifyStore();
const preloadedArtists = ref([]);
const preloadedTags = ref([]);
const withI18nMessage = validations.createI18nMessage({ t: translate.t });
const item = ref({
  title: '',
  performersIds: [],
  tagsIds: [],
  composersIds: [],
  poetsIds: [],
});
const props = defineProps({
  isNew: {
    type: Boolean,
    default: false,
  },
});
const submitting = ref(false);
const tags = ref([]);
const loadCopyFrom = async () => {
  if (!idParam.value) {
    return;
  }
  loading.value = true;
  try {
    const resp = await akordiService.getSong(idParam.value);
    item.value.body = resp.data.body;
    item.value.title = resp.data.title;
    item.value.id = resp.data.id;
    item.value.mainArtistId = String(resp.data.mainArtist.id);
    item.value.composersIds = resp.data.composers.map((i) => String(i.id));
    item.value.poetsIds = resp.data.poets.map((i) => String(i.id));
    item.value.performersIds = resp.data.performers.map((i) => String(i.id));
    item.value.tagsIds = resp.data.tags.map((i) => String(i.id));

    const allArtists = [
      {
        id: String(resp.data.mainArtist.id),
        title: resp.data.mainArtist.title,
      },
      ...resp.data.composers.map((i) => ({
        id: String(i.id),
        title: i.title,
      })),
      ...resp.data.poets.map((i) => ({
        id: String(i.id),
        title: i.title,
      })),
      ...resp.data.performers.map((i) => ({
        id: String(i.id),
        title: i.title,
      })),
    ];

    preloadedArtists.value = [...new Map(allArtists.map((i) => [i.id, i])).values()];

    preloadedTags.value = resp.data.tags.map((i) => ({
      id: String(i.id),
      title: i.title,
    }));
  } catch (err) {
    notificationStore.pushError($t('errors.loadSongFailed'));
    throw err;
  } finally {
    loading.value = false;
  }
};

const required = withI18nMessage(validations.required);
const rules = {
  title: { required },
  body: { required },
  mainArtistId: { required },
  composers: {},
  poets: {},
};

const v = useVuelidate(rules, item);
const formActions = computed(() => [
  { id: 'save', icon: 'save', name: $t('save'), kind: 'primary', busy: submitting.value },
  { id: 'cancel', icon: 'cancel', name: $t('cancel'), kind: 'secondary' },
]);

/* This method is need because new artists are
returned in search and we need to store title in the id
*/
function mapArtistFromId(id) {
  const parts = id.split('title:');
  if (parts.length > 1) {
    return {
      title: parts[1],
    };
  }
  const found = preloadedArtists.value.find((artist) => artist.id === id);
  if (found) {
    return {
      id: Number(found.id),
      title: found.title,
    };
  }
  return {
    id: Number.isNaN(id) ? id : Number(id),
  };
}

function mapTag(id) {
  return tags.value.find((tag) => tag.id === +id);
}

async function actionClicked(actionName) {
  if (actionName === 'save') {
    const isFormCorrect = await v.value.$validate();
    if (!isFormCorrect) {
      notify.pushError($t('error.validation'));
      return;
    }
    try {
      submitting.value = true;
      const edit = {
        id: item.value.id,
        title: item.value.title,
        body: item.value.body,
        mainArtist: mapArtistFromId(item.value.mainArtistId),
        performers: item.value.performersIds.map((i) => mapArtistFromId(i)),
        poets: item.value.poetsIds.map((i) => mapArtistFromId(i)),
        composers: item.value.composersIds.map((i) => mapArtistFromId(i)),
        tags: item.value.tagsIds.map((i) => mapTag(i)),
      };

      await akordiService.saveEdit(edit);
      v.value.$reset();
      item.value = {};
      notify.pushSuccess($t('songs.save.success'));
      submitting.value = false;
    } catch (err) {
      submitting.value = false;
      notify.pushError($t('songs.save.error'));
    }
  }
  if (actionName === 'cancel') {
    router.back();
  }
}
async function searchArtist(query) {
  if (!query) {
    return [];
  }
  const resp = await akordiService.searchArtist(query);
  if (!resp.data.content.length) {
    return [
      {
        id: `title:${query}`,
        title: query,
      },
    ];
  }

  const newArtists = resp.data.content.filter(
    (artist) => !preloadedArtists.value.some((p) => p.id === String(artist.id))
  );
  preloadedArtists.value.push(
    ...newArtists.map((artist) => ({
      id: String(artist.id),
      title: artist.title,
    }))
  );
  return resp.data.content.map((artist) => ({
    id: String(artist.id),
    title: artist.title,
  }));
}

async function loadTags() {
  try {
    loading.value = true;
    const resp = await akordiService.getTags({
      size: 100000,
      sort: 'title,asc',
    });

    tags.value = resp.data.content.map((i) => ({
      ...i,
      clickable: true,
      name: `${i.title} (${i.songCount})`,
    }));
  } catch (err) {
    notificationStore.pushError($t('pages.tagList.list.error'));
    throw err;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  viewStore.$reset();
  viewStore.goBack = true;
  if (props.isNew) {
    viewStore.title = translate.t('pages.songNew.title');
    viewStore.description = translate.t('pages.songNew.description');
  } else {
    await loadCopyFrom();
    viewStore.title = translate.t('pages.songEdit.title');
    viewStore.description = translate.t('pages.songEdit.description');
  }
  loadTags();
});
onUnmounted(() => {
  viewStore.$reset();
});
</script>
<style>
#bodyInput {
  white-space: pre;
  font-family: monospace;
}
</style>
<template>
  <LxForm
    :action-definitions="formActions"
    @action-click="actionClicked"
    :show-header="false"
    :sticky-footer="false"
    required-mode="required-asterisk"
  >
    <LxRow :label="$t('song.artist')" :required="true">
      <LxAutoComplete
        v-model="item.mainArtistId"
        :invalid="v.mainArtistId.$error"
        :invalidation-message="v.mainArtistId.$error ? v.mainArtistId.$errors[0].$message : ''"
        id-attribute="id"
        name-attribute="title"
        :items="searchArtist"
        kind="preloaded-func"
        :preloaded-items="preloadedArtists"
      />
    </LxRow>
    <LxRow :label="$t('song.title')" :required="true">
      <LxTextInput
        id="titleInput"
        v-model="item.title"
        :invalid="v.title.$error"
        :invalidation-message="v.title.$error ? v.title.$errors[0].$message : ''"
      />
    </LxRow>
    <LxRow :label="$t('song.composer')">
      <LxAutoComplete
        id="composerInput"
        v-model="item.composersIds"
        id-attribute="id"
        name-attribute="title"
        selecting-kind="multiple"
        :items="searchArtist"
        kind="preloaded-func"
        :preloaded-items="preloadedArtists"
      />
    </LxRow>
    <LxRow :label="$t('song.poet')">
      <LxAutoComplete
        id="poetInput"
        v-model="item.poetsIds"
        id-attribute="id"
        name-attribute="title"
        selecting-kind="multiple"
        :items="searchArtist"
        kind="preloaded-func"
        :preloaded-items="preloadedArtists"
      />
    </LxRow>
    <LxRow :label="$t('song.tags')">
      <LxValuePicker
        id="tagInput"
        v-model="item.tagsIds"
        :items="tags"
        id-attribute="id"
        name-attribute="title"
        kind="multiple"
        variant="dropdown"
        :preloaded-items="preloadedTags"
      />
    </LxRow>
    <LxRow :label="$t('song.body')" :required="true" inputId="bodyInput">
      <template #info>{{ $t('song.bodyTooltip') }}</template>
      <LxTextArea
        :rows="15"
        id="bodyInput"
        v-model="item.body"
        :invalid="v.body.$error"
        :invalidation-message="v.body.$error ? v.body.$errors[0].$message : ''"
      />
    </LxRow>
  </LxForm>
</template>
