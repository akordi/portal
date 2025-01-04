<script setup>
import {
  LxAutoComplete,
  LxForm,
  LxRow,
  LxTextArea,
  LxTextInput
} from "@wntr/lx-ui";
import { computed, onMounted, ref, shallowRef } from "vue";
import { useI18n } from "vue-i18n";

import { useRoute, useRouter } from "vue-router";

import akordiService from "@/services/akordiService";
import useNotifyStore from "@/stores/useNotifyStore";
import useViewStore from "@/stores/useViewStore";
import useVuelidate from "@vuelidate/core";
import * as validations from "@vuelidate/validators";

const router = useRouter();
const translate = useI18n();
const $t = translate.t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const route = useRoute();
const copyFrom = computed(() => route.query.copyFrom);
const loading = shallowRef(false);
const notify = useNotifyStore();
const withI18nMessage = validations.createI18nMessage({ t: translate.t });
const item = ref({
  title: "",
  composers: [],
  poets: [],
});
const props = defineProps({
  isNew: {
    type: Boolean,
    default: false,
  },
});
const submitting = ref(false);
const loadCopyFrom = async () => {
  if (!copyFrom.value) {
    return;
  }
  loading.value = true;
  try {
    const resp = await akordiService.getSong(copyFrom.value);
    item.value.body = resp.data.body;
  } catch (err) {
    console.log(err);
    notificationStore.pushError("Failed to load song");
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
  poets: {}
};

const v = useVuelidate(rules, item);
const formActions = computed(() => [
  { id: "save", icon: "save", name: $t("save"), kind: "primary", busy: submitting.value },
  { id: "cancel", icon: "cancel", name: $t("cancel"), kind: "secondary" },
]);

/* This method is need because new artists are
returned in search and we need to store title in the id
*/
function mapFromId(id) {
  const parts = id.split('title:');
  if (parts.length > 1) {
    return {
      title: parts[1]
    }
  }
  return {
    id: Number.isNaN(id) ? id : Number(id)
  }
}

async function actionClicked(actionName) {
  if (actionName === "save") {
    const isFormCorrect = await v.value.$validate();
    if (!isFormCorrect) {
      notify.pushError($t("error.validation"));
      return;
    }
    try {
      submitting.value = true;
      const edit = {
        title: item.value.title,
        body: item.value.body,
        mainArtist: mapFromId(item.value.mainArtistId),
        poets: item.value.poets.map((i) => mapFromId(i)),
        composers: item.value.composers.map((i) => mapFromId(i))
      }

      await akordiService.saveEdit(edit);
      v.value.$reset();
      item.value = {};
      notify.pushSuccess($t("songs.save.success"));
      submitting.value = false;
    } catch (err) {
      submitting.value = false;
      console.error({ err });
      notify.pushError($t("songs.save.error"));
    }
  }
  if (actionName === "cancel") {
    router.back();
  }
}
async function searchArtist(query) {
  if (!query) {
    return [];
  }
  const resp = await akordiService.searchArtist(query);
  if (!resp.data.content.length) {
    return [{
      id: `title:${query}`,
      title: query
    }]
  }
  return resp.data.content.map((artist) => ({
    id: String(artist.id),
    title: artist.title
  }));

}


onMounted(async () => {
  viewStore.$reset();
  viewStore.goBack = true;
  if (props.isNew) {
    viewStore.title = translate.t("pages.songNew.title");
    viewStore.description = translate.t("pages.songNew.description");
  } else {
    await loadCopyFrom();
    viewStore.title = translate.t("pages.songEdit.title");
    viewStore.description = translate.t("pages.songEdit.description");
  }
});

</script>
<style>
#bodyInput {
  white-space: pre;
  font-family: monospace;
}
</style>
<template>
  <LxForm :action-definitions="formActions" @button-click="actionClicked" :show-header="false" :sticky-footer="false"
    required-mode="required-asterisk">
    <LxRow :label="$t('song.artist')" :required="true">
      <LxAutoComplete v-model="item.mainArtistId" :invalid="v.mainArtistId.$error"
        :invalidation-message="v.mainArtistId.$error ? v.mainArtistId.$errors[0].$message : ''" id-attribute="id"
        name-attribute="title" :items="searchArtist" kind="preloaded-func" />
    </LxRow>
    <LxRow :label="$t('song.composer')">
      <LxAutoComplete id="composerInput" v-model="item.composers" id-attribute="id" name-attribute="title"
        selecting-kind="multiple" :items="searchArtist" kind="preloaded-func" />
    </LxRow>
    <LxRow :label="$t('song.poet')">
      <LxAutoComplete id="poetInput" v-model="item.poets" id-attribute="id" name-attribute="title"
        selecting-kind="multiple" :items="searchArtist" kind="preloaded-func" />
    </LxRow>
    <LxRow :label="$t('song.title')" :required="true">
      <LxTextInput class="pre" id="titleInput" v-model="item.title" :invalid="v.title.$error"
        :invalidation-message="v.title.$error ? v.title.$errors[0].$message : ''" />
    </LxRow>
    <LxRow :label="$t('song.body')" :required="true" inputId="bodyInput">
      <template #info>{{ $t('song.bodyTooltip') }}</template>
      <LxTextArea :rows="15" id="bodyInput" v-model="item.body" :invalid="v.body.$error"
        :invalidation-message="v.body.$error ? v.body.$errors[0].$message : ''" />
    </LxRow>
  </LxForm>
</template>
