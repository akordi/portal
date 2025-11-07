<script setup>
import { LxList, LxLoader } from '@wntr/lx-ui';
import { computed, onMounted, ref } from 'vue';

import { useRoute, useRouter } from 'vue-router';

import akordiService from '@/services/akordiService';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';
import { useHead } from '@vueuse/head';

const router = useRouter();
const route = useRoute();
const artistUrlParam = computed(() => route.params.url);
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const items = ref([]);
const loading = ref(true);

const loadArtist = async () => {
  loading.value = true;
  try {
    const artistUrl = `/band/${artistUrlParam.value}`;
    const artistId = akordiService.parseUrl(artistUrl);
    const artistResp = await akordiService.getArtist(artistId);
    
    if (artistUrl !== artistResp.data.url) {
      const correctUrl = artistResp.data.url.replace(/^\/band\//, '');
      router.replace({
        name: 'akordiArtistView',
        params: { url: correctUrl },
      });
    }
    
    
    const resp = await akordiService.getSongs({
      'artist.id': artistId,
      size: 5000,
      offset: 0,
      sort: 'title,asc',
    });
    items.value = resp.data.content.map((song) => ({
      ...song,
      description: song.mainArtist.title,
      clickable: true,
    }));
    
    viewStore.title = artistResp.data.title;
    const pageTitle = $t('pages.artistView.pageTitle', { artist: artistResp.data.title });
    const songTitles = items.value
      .slice(0, 10)
      .map((song) => song.title)
      .join(', ');
    const metaDescription = $t('pages.artistView.metaDescription', { songTitles });

    useHead({
      title: pageTitle,
      meta: [
        { name: 'description', content: metaDescription },
        { property: 'og:title', content: pageTitle },
        { property: 'og:description', content: metaDescription },
      ],
    });
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
onMounted(async () => {
  viewStore.goBack = true;
  await loadArtist();
});
</script>
<template>
  <LxLoader :loading="loading" />
  <LxList v-if="!loading" id="id" list-type="2" v-model:items="items" primary-attribute="title"
    secondary-attribute="description" @action-click="actionClicked">
  </LxList>
</template>
