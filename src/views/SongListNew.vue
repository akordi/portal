<script setup>
import akordiService from "@/services/akordiService";
import { LxButton, LxList } from "@wntr/lx-ui";
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
const loading = ref(true);

onMounted(async () => {
  viewStore.goBack = true;
  load();
});

async function load() {
  try {
    loading.value = true;
    const resp = await akordiService.getSongs({
      size: 20,
      page: 0,
      sort: "createdDate,desc",
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

function actionClicked(action, id) {
  if (action === "click") {
    var item = items.value.find((item) => item.id == id);
    console.log({ item, action, id, items });
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
  <LxList id="id" list-type="2" v-model:items="items" :loading="loading" primary-attribute="title"
    secondary-attribute="description" @action-click="actionClicked">
  </LxList>
</template>
