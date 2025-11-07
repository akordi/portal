<script setup>
import akordiService from '@/services/akordiService';
import { LxList, LxLoaderView, LxValuePicker } from '@wntr/lx-ui';
import { onMounted, ref, computed, watch } from 'vue';
import { useI18n } from 'vue-i18n';

import { useRoute, useRouter } from 'vue-router';

import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';

const router = useRouter();
const route = useRoute();
const translate = useI18n();
const $t = translate.t;
const viewStore = useViewStore();
const letterParam = computed(() => route.params.letter);
const letter = ref();
const notificationStore = useNotifyStore();
const items = ref([]);
const loading = ref(true);
const page = ref(0);
const hasMore = ref(false);
const letters = ref([]);
const loadingLetters = ref(true);

async function loadLetters() {
  try {
    const resp = await akordiService.getArtistLetters();
    letters.value = [
      {
        id: '0',
        name: '0',
        clickable: true,
      },
      ...resp.data.map((l) => ({
        id: l.toLowerCase(),
        name: l.toUpperCase(),
        clickable: true,
      })),
    ];
  } catch (err) {
    console.log(err);
  } finally {
    loadingLetters.value = false;
  }
}

async function loadArtists() {
  if (!letter.value) {
    letter.value = '0';
    router.push({ name: 'akordiArtistLetter', params: { letter: '0' } });
  }
  try {
    loading.value = true;
    const resp = await akordiService.getArtists({
      size: 200,
      page: page.value,
      letter: letter.value,
      sort: 'title,asc',
    });

    if (page.value === 0) {
      items.value = resp.data.content.map((artist) => ({
        ...artist,
        clickable: true,
        title: `${artist.title} (${artist.songCount})`,
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
    notificationStore.pushError($t('pages.songSearch.search.error'));
    throw err;
  } finally {
    loading.value = false;
  }
}

function actionClicked(action, id) {
  if (action === 'click') {
    const item = items.value.find((i) => i.id === +id);
    item.url = item.url.replace(/^\/band\//, '');
    router.push({ name: 'akordiArtistView', params: { url: item.url } });
  }
}

function loadMore() {
  page.value += 1;
  loadArtists(page.value);
}
function changeLetter(id) {
  letterParam.value = id;
  letter.value = id;
  page.value = 0;
  router.push({ name: 'akordiArtistLetter', params: { letter: id } });
}
watch(route, () => {
  loadArtists();
});

onMounted(async () => {
  letter.value = letterParam.value;
  await loadLetters();
  loadArtists();
  viewStore.goBack = true;
});
</script>
<style>
/* Letter context switchers on /find/0 dissapears on small screens */
.lx-content-switcher .lx-content-switcher-item {
  min-width: 44px;
}
</style>
<template>
  <LxLoaderView :loading="loadingLetters">
    <LxValuePicker
      variant="tags"
      @update:modelValue="changeLetter"
      :items="letters"
      v-model="letter"
    />
  </LxLoaderView>
  <br />
  <LxList
    id="id"
    :loading="loading"
    list-type="2"
    :show-load-more="hasMore"
    @load-more="loadMore"
    v-model:items="items"
    primary-attribute="title"
    @action-click="actionClicked"
  >
  </LxList>
</template>
