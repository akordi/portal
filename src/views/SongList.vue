<script setup>
import akordiService from "@/services/akordiService";
import { LxButton, LxList, LxLoader } from "@wntr/lx-ui";
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { useRouter } from "vue-router";

import useNotifyStore from "@/stores/useNotifyStore";
import useViewStore from "@/stores/useViewStore";
import axios from "axios";

const router = useRouter();
const translate = useI18n();
const $t = translate.t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const items = ref([]);
const loading = ref(false);

onMounted(async () => {
  viewStore.goBack = true;
});

async function search(search) {
  if (!search) {
    return;
  }
  try {
    loading.value = true;
    let resp = await akordiService.search(search);
    if (resp.data.value.length === 0) {
      resp = await akordiService.search(`${search}*`);
    }
    items.value = resp.data.value.map((song) => ({
      ...song,
      description: song.mainArtistTitle,
      clickable: true,
    }));

  } catch (err) {
    if (axios.isCancel(err)) {
      return;
    }
    console.log(err);
    notificationStore.pushError($t("pages.akordiSongList.search.error"));
    throw err;
  } finally {
    loading.value = false;
  }
}

function actionClicked(action, id) {
  if (action === "click") {
    const item = items.value.find((i) => i.id === +id);
    item.url = item.url.replace(/^\/song\//, "");
    router.push({ name: "akordiSongView", params: { url: item.url } });
  }
}
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
</style>
<template>
  <div class="lx-loader-wrapper">
    <LxLoader :loading="loading" variant="bar" />
  </div>

  <LxList id="id" list-type="2" v-model:items="items" :has-search="true" searchSide="server" primary-attribute="title"
    secondary-attribute="description" @action-click="actionClicked" @update:searchString="search">
  </LxList>
</template>
