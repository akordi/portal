<script setup>
import { LxButton, LxList, LxLoader } from "@wntr/lx-ui";
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";

import { useRoute, useRouter } from "vue-router";

import akordiService from "@/services/akordiService";
import useNotifyStore from "@/stores/useNotifyStore";
import useViewStore from "@/stores/useViewStore";

const router = useRouter();
const route = useRoute();
const translate = useI18n();
const artistUrlParam = computed(() => route.params.url);
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const items = ref([]);
const loading = ref(true);
onMounted(async () => {
  viewStore.goBack = true;
  await loadArtist();
});

const loadArtist = async () => {
  loading.value = true;
  try {
    var artistUrl = "/band/" + artistUrlParam.value;
    var artistId = akordiService.parseUrl(artistUrl);
    const artistResp = await akordiService.getArtist(artistId);
    viewStore.title = artistResp.data.title;

    const resp = await akordiService.getSongs({
      "artist.id": artistId,
      size: 5000,
      offset: 0,
      sort: "title,asc",
    });
    items.value = resp.data.content.map((song) => ({
      ...song,
      description: song.mainArtist.title,
      clickable: true,
    }));
  } catch (err) {
    console.log(err);
    notificationStore.pushError("Failed to load songs");
    throw err;
  } finally {
    loading.value = false;
  }
};
function actionClicked(action, id) {
  if (action === "click") {
    var url = id;
    router.push({ name: "akordiSongView", params: { url: url } });
  }
}
</script>
<template>
  <LxLoader :loading="loading" />
  <LxList v-if="!loading" id="id" list-type="2" v-model:items="items" primary-attribute="title"
    secondary-attribute="description" @action-click="actionClicked">
  </LxList>
</template>
