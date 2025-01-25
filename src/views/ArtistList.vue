<script setup>
import akordiService from '@/services/akordiService';
import { LxList, LxValuePicker } from '@wntr/lx-ui';
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
const letters = ref([
  {
    id: '0',
    name: '0',
    clickable: true,
  },
  {
    id: 'a',
    name: 'A',
    clickable: true,
  },
  {
    id: 'ā',
    name: 'Ā',
  },
  {
    id: 'b',
    name: 'B',
  },
  {
    id: 'c',
    name: 'C',
  },
  {
    id: 'č',
    name: 'Č',
  },
  {
    id: 'd',
    name: 'D',
  },
  {
    id: 'e',
    name: 'E',
  },
  {
    id: 'ē',
    name: 'Ē',
  },
  {
    id: 'f',
    name: 'F',
  },
  {
    id: 'g',
    name: 'G',
  },
  {
    id: 'h',
    name: 'H',
  },
  {
    id: 'i',
    name: 'I',
  },
  {
    id: 'j',
    name: 'J',
  },
  {
    id: 'k',
    name: 'K',
  },
  {
    id: 'l',
    name: 'L',
  },
  {
    id: 'm',
    name: 'M',
  },
  {
    id: 'n',
    name: 'N',
  },
  {
    id: 'o',
    name: 'O',
  },
  {
    id: 'p',
    name: 'P',
  },
  {
    id: 'r',
    name: 'R',
  },
  {
    id: 's',
    name: 'S',
  },
  // {
  //   id: "š",
  //   name: "Š",
  // },
  {
    id: 't',
    name: 'T',
  },
  {
    id: 'u',
    name: 'U',
  },
  {
    id: 'v',
    name: 'V',
  },
  {
    id: 'z',
    name: 'Z',
  },
  {
    id: 'ž',
    name: 'Ž',
  },
  {
    id: '#',
    name: '#',
  },
]);

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
    notificationStore.pushError($t('pages.akordiSongList.search.error'));
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
  <LxValuePicker
    variant="tags"
    @update:modelValue="changeLetter"
    :items="letters"
    v-model="letter"
  />
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
