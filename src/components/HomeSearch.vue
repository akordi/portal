<script setup>
import { LxButton, LxTextInput } from '@akordi/lx-ui';
import { ref } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';

// Home-page search: the first thing on the page, because almost every visitor
// comes looking for one particular song. It hands the query to the search page
// (/search?q=…), which already runs the search and shows the results.
const props = defineProps({
  songCount: { type: Number, default: 0 },
});

const { t: $t } = useI18n();
const router = useRouter();
const query = ref('');

function submit() {
  const q = query.value.trim();
  router.push(q ? { name: 'songSearch', query: { q } } : { name: 'songSearch' });
}
</script>

<template>
  <div class="home-search" role="search" @keydown.enter.prevent="submit">
    <span id="homeSearchLabel" class="visually-hidden">{{
      $t('pages.dashboard.search.label')
    }}</span>
    <div class="home-search-input">
      <LxTextInput
        id="homeSearchInput"
        v-model="query"
        kind="search"
        label-id="homeSearchLabel"
        :placeholder="
          props.songCount
            ? $t('pages.dashboard.search.placeholderCount', { songCount: props.songCount })
            : $t('pages.dashboard.search.placeholder')
        "
      />
    </div>
    <LxButton
      id="homeSearchButton"
      kind="primary"
      :label="$t('pages.dashboard.search.button')"
      @click="submit"
    />
  </div>
</template>

<style scoped>
.home-search {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}
.home-search-input {
  flex: 1 1 auto;
  min-width: 0;
}
/* The search field is --input-height tall and buttons default to --row-size;
   match them so the field and its button line up as one control. The field
   already shows a magnifier, so the button is text-only. */
.home-search :deep(.lx-button) {
  height: var(--input-height);
}
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}
</style>
