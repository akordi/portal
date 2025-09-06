<script setup>
import { LxList, LxLoader } from '@wntr/lx-ui';
import { computed, onMounted, ref, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { useRoute, useRouter } from 'vue-router';

import akordiService from '@/services/akordiService';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import { useHead } from '@vueuse/head';

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

const loadSongs = async () => {
  loading.value = true;
  try {
    const tagUrl = `/tag/${tagUrlParam.value}`;
    const tagId = akordiService.parseUrl(tagUrl);
    const tagResp = await akordiService.getTag(tagId);
    tag.value = tagResp.data;
    viewStore.title = $t('pages.tagView.title', { title: tag.value.title });
    if (tag.value.url !== tagUrl) {
      const correctUrl = tag.value.url.replace(/^\/tag\//, '');
      router.push({ name: 'tagView', params: { url: correctUrl } });
    }

    const resp = await akordiService.getSongs({
      'tag.id': tagId,
      size: 100,
      sort: 'title,asc',
      page: page.value,
    });

    if (page.value === 0) {
      items.value = [];
    }

    items.value.push(
      ...resp.data.content.map((song) => ({
        ...song,
        description: song.mainArtist.title,
        clickable: true,
      }))
    );

    const pageTitle = `Tematiskās dziesmas ${tag.value.title}`;
    const songTitles = items.value
      .slice(0, 10)
      .map((song) => song.title)
      .join(', ');
    const metaDescription = `Dziesmas ar akordiem un tabulatūrām ${songTitles}`;

    useHead({
      title: pageTitle,
      meta: [
        { name: 'description', content: metaDescription },
        { property: 'og:title', content: pageTitle },
        { property: 'og:description', content: metaDescription },
      ],
    });

    hasMore.value = resp.data.totalElements > items.value.length;
  } catch (err) {
    console.log(err);
    notificationStore.pushError('Failed to load songs');
    throw err;
  } finally {
    loading.value = false;
  }
};
function actionClicked(action, id) {
  if (action === 'click') {
    const item = items.value.find((i) => String(i.id) === id);
    item.url = item.url.replace(/^\/song\//, '');
    router.push({ name: 'akordiSongView', params: { url: item.url } });
  }
}
function loadMore() {
  page.value += 1;
  loadSongs();
}

onMounted(async () => {
  viewStore.goBack = true;
  await loadSongs();
});
onUnmounted(() => {
  viewStore.$reset();
});
</script>
<template>
  <LxLoader :loading="loading" />
  <LxList
    id="id"
    list-type="2"
    v-model:items="items"
    primary-attribute="title"
    secondary-attribute="description"
    @action-click="actionClicked"
    :show-load-more="hasMore"
    @load-more="loadMore"
    :loading="loading"
  >
  </LxList>
</template>
