<script setup>
import akordiService from "@/services/akordiService";
import { LxButton, LxList } from "@wntr/lx-ui";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { useRouter } from "vue-router";

import useNotifyStore from "@/stores/useNotifyStore";
import useViewStore from "@/stores/useViewStore";

const router = useRouter();
const translate = useI18n();
const $t = translate.t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const items = ref([]);
const loading = ref(true);

async function load() {
  try {
    loading.value = true;
    const resp = await akordiService.getSongs({
      size: 20,
      page: 0,
      sort: "songTop.visitsWeekly,desc",
    });
    items.value = resp.data.content.map((song) => ({
      ...song,
      description: song.mainArtist.title,
      clickable: true,
    }));
  } catch (err) {
    console.log(err);
    notificationStore.pushError($t("pages.akordiSongListNew.list.error"));
    throw err;
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  viewStore.goBack = true;
  load();
});

function actionClicked(action, id) {
  if (action === "click") {
    const item = items.value.find((i) => i.id === +id);
    item.url = item.url.replace(/^\/song\//, "");
    router.push({ name: "akordiSongView", params: { url: item.url } });
  }
}
</script>
<template>
  <div class="lx-list-toolbar">
    <div class="first-row">
      <div class="right-area">
        <LxButton :label="$t('search')" icon="search" @click="router.push({ name: 'akordiSongList' })"></LxButton>
      </div>
    </div>
  </div>
  <LxList id="id" list-type="2" :loading="loading" v-model:items="items" primary-attribute="title"
    secondary-attribute="description" @action-click="actionClicked">
  </LxList>
</template>
