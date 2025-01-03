<script setup>
import { onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { LxForm, LxRow } from "@wntr/lx-ui";
import { useRoute, useRouter } from "vue-router";

import useNotifyStore from "@/stores/useNotifyStore";
import useViewStore from "@/stores/useViewStore";
import { computed } from "vue";
import akordiService from "@/services/akordiService";
import chordsService from "@/services/chordsService";
import { LxLoader, LxSection } from "@wntr/lx-ui";
import ChordSvg from "@/components/ChordSvg.vue";
import { onUnmounted } from "vue";

const translate = useI18n();
const $t = translate.t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const router = useRouter();
const route = useRoute();
const songUrlParam = computed(() => route.params.url);
const bodyTransposedIndex = ref(0);
const item = ref({});
const loading = ref(true);
const hasChords = ref(false);
const chords = ref([]);
const showChords = ref(true);
const instrument = ref("guitar");

onMounted(async () => {
  viewStore.goBack = true;
  await loadSong();
});

const loadSong = async () => {
  try {
    var songUrl = "/song/" + songUrlParam.value;
    var songId = akordiService.parseUrl(songUrl);
    const resp = await akordiService.getSong(songId);
    if (songUrl !== resp.data.url) {
      songUrl = resp.data.url.replace(/^\/song\//, "");
      router.replace({
        name: "akordiSongView",
        params: { url: songUrl },
      });
    }
    item.value = resp.data;
    item.value.bodyWithMarkup = chordsService.transpose(item.value.body, 0);
    hasChords.value = item.value.bodyWithMarkup?.indexOf("<b>") !== -1;
    if (hasChords.value) {
      chords.value = chordsService.extractChords(item.value.bodyWithMarkup);
    }
    viewStore.title = item.value.title;
    viewStore.description = item.value.mainArtist?.title;
  } catch (err) {
    console.log(err);
    notificationStore.pushError("Failed to load song");
    throw err;
  } finally {
    loading.value = false;
  }
};
const formActions = computed(() => [
  {
    id: "cancel",
    icon: "cancel",
    name: $t("cancel"),
    kind: "secondary",
  },
  {
    id: "hideChords",
    icon: "config", //TODO: find better icon
    name: $t("pages.akordiSongView.hideChords.label"),
    title: $t("pages.akordiSongView.hideChords.description"),
    kind: "additional",
  },
  {
    id: "showGuitarChords",
    icon: "config", //TODO: find better icon
    name: $t("pages.akordiSongView.showGuitarChords.label"),
    title: $t("pages.akordiSongView.showGuitarChords.description"),
    kind: "additional",
  },
  {
    id: "showUkuleleChords",
    icon: "config", //TODO: find better icon
    name: $t("pages.akordiSongView.showUkuleleChords.label"),
    title: $t("pages.akordiSongView.showUkuleleChords.description"),
    kind: "additional",
  },
  {
    id: "transposeUp",
    icon: "move-up",
    name: $t("pages.akordiSongView.transposeUp.label"),
    title: hasChords.value
      ? $t("pages.akordiSongView.transposeUp.description")
      : $t("pages.akordiSongView.transposeDisabled"),
    disabled: !hasChords.value,
    kind: "tertiary",
  },
  {
    id: "transposeDown",
    icon: "move-down",
    name: $t("pages.akordiSongView.transposeDown.label"),
    title: hasChords.value
      ? $t("pages.akordiSongView.transposeDown.description")
      : $t("pages.akordiSongView.transposeDisabled"),
    disabled: !hasChords.value,
    kind: "tertiary",
  },
]);
async function actionClicked(actionName) {
  if (actionName === "cancel") {
    router.back();
  }
  if (actionName === "copy") {
    router.push({ name: "mySongNew", query: { copyFrom: item.value.id } });
  }
  if (actionName === "hideChords") {
    showChords.value = !showChords.value;
  }
  if (actionName === "showGuitarChords") {
    showChords.value = true;
    instrument.value = "guitar";
  }
  if (actionName === "showUkuleleChords") {
    showChords.value = true;
    instrument.value = "ukulele";
  }

  if (actionName === "transposeUp") {
    bodyTransposedIndex.value = bodyTransposedIndex.value + 1;
    item.value.bodyWithMarkup = chordsService.transpose(
      item.value.body,
      bodyTransposedIndex.value
    );
    hasChords.value = item.value.bodyWithMarkup?.indexOf("<b>") !== -1;
    if (hasChords.value) {
      chords.value = chordsService.extractChords(item.value.bodyWithMarkup);
      chords.value = [...chords.value];
    }
  }
  if (actionName === "transposeDown") {
    bodyTransposedIndex.value = bodyTransposedIndex.value - 1;
    item.value.bodyWithMarkup = chordsService.transpose(
      item.value.body,
      bodyTransposedIndex.value
    );
    hasChords.value = item.value.bodyWithMarkup?.indexOf("<b>") !== -1;
    if (hasChords.value) {
      chords.value = chordsService.extractChords(item.value.bodyWithMarkup);
      chords.value = [...chords.value];
    }
  }
}
onUnmounted(() => {
  viewStore.$reset();
});
</script>
<template>
  <LxLoader :loading="loading" />
  <LxForm v-if="!loading" :sticky-footer="false" :sticky-header="false" :action-definitions="formActions"
    @button-click="actionClicked">
    <LxSection v-if="showChords">
      <div style="display: flex; flex-wrap: wrap">
        <ChordSvg :chord="chord" :instrument="instrument" v-for="chord in chords" :key="chord"></ChordSvg>
      </div>
    </LxSection>
    <LxSection>
      <LxRow>
        <p class="pre" v-html="item.bodyWithMarkup"></p>
      </LxRow>
    </LxSection>
  </LxForm>
</template>
