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
const $t = translate.t;
const tagUrlParam = computed(() => route.params.url);
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const items = ref([]);
const loading = ref(true);
const page = ref(0);
const hasMore = ref(false);
const tag = ref({});

onMounted(async () => {
  viewStore.goBack = true;
  await loadSongs();
});

const loadSongs = async () => {
  loading.value = true;
  try {
    var tagUrl = "/tag/" + tagUrlParam.value;
    var tagId = akordiService.parseUrl(tagUrl);
    const tagResp = await akordiService.getTag(tagId);
    tag.value = tagResp.data;
    viewStore.title = $t('pages.tagView.title', { title: tag.value.title });
    if (tag.value.url !== tagUrl) {
      const correctUrl = tag.value.url.replace(/^\/tag\//, "");
      router.push({ name: "tagView", params: { url: correctUrl } });
    }

    const resp = await akordiService.getSongs({
      "tag.id": tagId,
      size: 100,
      sort: "title,asc",
      page: page.value,
    });


    if (page.value === 0) {
      items.value = resp.data.content.map((song) => ({
        ...song,
        description: song.mainArtist.title,
        clickable: true,
      }));
    } else {
      items.value.push(
        ...resp.data.content.map((artist) => ({
          ...artist,
          clickable: true,
          title: `${artist.title} (${artist.songCount})`,
        }))
      );
    }
    hasMore.value = resp.data.totalElements > items.value.length;

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
function loadMore() {
  loadSongs(++page.value);
}
</script>
<template>
  <LxLoader :loading="loading" />
  <LxList id="id" list-type="2" v-model:items="items" primary-attribute="title" secondary-attribute="description"
    @action-click="actionClicked" :show-load-more="hasMore" @load-more="loadMore" :loading="loading">
  </LxList>
</template>
