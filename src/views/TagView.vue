<script setup>
import { LxList, LxLoader } from '@akordi/lx-ui';
import { computed, onMounted, ref, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';

import { useRoute, useRouter } from 'vue-router';

import akordiService from '@/services/akordiService';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import { useHead } from '@vueuse/head';
import { listTexts } from '@/utils/texts';
import { tagUrlParam as tagRouteParam } from '@/utils/tagUrl';

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

// Registered synchronously in setup() so useHead() can inject() the
// per-request head (calling it after an await inside loadSongs() would fall
// back to the process-global shared head and lose tags under concurrent SSR).
const pageTitle = ref('');
const metaDescription = ref('');
useHead(
  computed(() =>
    pageTitle.value
      ? {
          title: pageTitle.value,
          meta: [
            { name: 'description', content: metaDescription.value },
            { property: 'og:title', content: pageTitle.value },
            { property: 'og:description', content: metaDescription.value },
          ],
        }
      : {}
  )
);

const loadSongs = async () => {
  loading.value = true;
  try {
    const tagUrl = `/tag/${tagUrlParam.value}`;
    const tagId = akordiService.parseUrl(tagUrl);
    const tagResp = await akordiService.getTag(tagId);
    tag.value = tagResp.data;
    if (tag.value.url && tag.value.url !== tagUrl) {
      router.push({ name: 'tagView', params: { url: tagRouteParam(tag.value) } });
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

    viewStore.title = $t('pages.tagView.title', { title: tag.value.title });
    const songTitles = items.value
      .slice(0, 10)
      .map((song) => song.title)
      .join(', ');
    metaDescription.value = $t('pages.tagView.metaDescription', { songTitles });
    pageTitle.value = `Tematiskās dziesmas ${tag.value.title}`;

    hasMore.value = resp.data.totalElements > items.value.length;
  } catch (err) {
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
    name-attribute="title"
    description-attribute="description"
    @action-click="actionClicked"
    :show-load-more="hasMore"
    @load-more="loadMore"
    :loading="loading"
    :texts="listTexts()"
  >
  </LxList>
</template>
