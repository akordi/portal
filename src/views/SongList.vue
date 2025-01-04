<script setup>
import akordiService from "@/services/akordiService";
import { LxList, LxLoader } from "@wntr/lx-ui";
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

function titleOrHighlight(song) {
  return song['@search.highlights'].title?.length ? song['@search.highlights'].title[0] : song.title
}

async function search(q) {
  if (!q) {
    return;
  }
  try {
    loading.value = true;
    let resp = await akordiService.search(q);
    if (resp.data.value.length === 0) {
      resp = await akordiService.search(`${q}*`);
    }
    if (resp.data.value.length === 0) {
      return;
    }
    items.value = resp.data.value.map((song) => ({
      ...song,
      id: song.id,
      name: song.title,
      title: `${song.mainArtistTitle} - ${titleOrHighlight(song)}`,
      description: song['@search.highlights'].bodyLyrics?.length ? song['@search.highlights'].bodyLyrics[0] : '',
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
    const item = items.value.find((i) => i.id === id);
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

.pre {
  white-space: pre;
}

em {
  font-style: normal;
  font-weight: bold;
  color: var(--color-data)
}
</style>
<template>
  <div class="lx-loader-wrapper">
    <LxLoader :loading="loading" variant="bar" />
  </div>
  <LxList id-attribute="id" list-type="1" v-model:items="items" :has-search="true" searchSide="server"
    @action-click="actionClicked" @update:search-string="search" icon="next">
    <template #customItem="{
      title,
      description
    }">
      <p class="lx-primary" v-html="title"></p>
      <p class="lx-secondary pre" v-html="description"></p>
    </template>
  </LxList>
</template>
