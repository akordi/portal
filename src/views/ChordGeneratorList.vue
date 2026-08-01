<script setup>
import chordgenSongService from '@/services/chordgenSongService';
import { LxButton, LxList, LxRating } from '@dativa-lv/lx-ui';
import { onMounted, ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import useNotifyStore from '@/stores/useNotifyStore';
import useViewStore from '@/stores/useViewStore';

const router = useRouter();
const $t = useI18n().t;
const viewStore = useViewStore();
const notificationStore = useNotifyStore();
const items = ref([]);
const loading = ref(true);
const hasMore = ref(false);
const page = ref(0);
const PAGE_SIZE = 20;

function mapSong(song) {
  return {
    ...song,
    id: String(song.id),
    title: `${song.artist} — ${song.title}`,
    averageRating: song.averageRating ?? 0,
    ratingsCount: song.ratingsCount ?? 0,
    clickable: true,
  };
}

// Always newest-first, exactly as returned by the API — never re-sorted
// client-side, even though rating is displayed alongside each entry.
async function loadItems() {
  try {
    loading.value = true;
    const resp = await chordgenSongService.findAll({ size: PAGE_SIZE, page: page.value });
    const mapped = resp.data.content.map(mapSong);
    if (page.value === 0) {
      items.value = mapped;
    } else {
      items.value.push(...mapped);
    }
    hasMore.value = items.value.length < resp.data.totalElements;
  } catch (err) {
    notificationStore.pushError($t('pages.chordGenerator.errors.loadFailed'));
  } finally {
    loading.value = false;
  }
}

function loadMore() {
  page.value += 1;
  loadItems();
}

function actionClicked(action, id) {
  if (action === 'click') {
    router.push({ name: 'chordGeneratorView', params: { id } });
  }
}

onMounted(async () => {
  viewStore.title = $t('pages.chordGenerator.title');
  viewStore.description = $t('pages.chordGenerator.description');
  viewStore.goBack = true;
  await loadItems();
});
</script>

<template>
  <LxList
    id="chordGeneratorList"
    list-type="2"
    v-model:items="items"
    id-attribute="id"
    :loading="loading"
    :show-load-more="hasMore"
    @load-more="loadMore"
    @action-click="actionClicked"
  >
    <template #toolbar>
      <LxButton
        icon="add"
        :label="$t('pages.chordGenerator.add')"
        @click="router.push({ name: 'chordGeneratorSubmit' })"
      />
    </template>
    <template #customItem="{ title, averageRating, ratingsCount }">
      <p class="lx-primary">{{ title }}</p>
      <div class="lx-secondary" style="display: flex; align-items: center; gap: 0.35rem">
        <LxRating :model-value="averageRating" read-only kind="5stars" :focusable="false" />
        <span>{{
          ratingsCount > 0
            ? `${averageRating.toFixed(1)} (${ratingsCount})`
            : $t('pages.chordGenerator.rating.none')
        }}</span>
      </div>
    </template>
    <template #empty>
      {{ $t('pages.chordGenerator.empty') }}
    </template>
  </LxList>
</template>
