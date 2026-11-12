<script setup>
import { LxSearchableText } from '@akordi/lx-ui';
import { computed } from 'vue';
import { parseHighlight } from '@/utils/searchHighlight';

const props = defineProps({
  // Server highlight fragment (escaped text with <mark> around matches)
  highlight: { type: String, default: null },
  // Raw field value, shown when the server returned no fragment for it
  value: { type: String, default: '' },
  searchString: { type: String, default: '' },
});

const segments = computed(() => parseHighlight(props.highlight));
</script>
<style scoped>
/* LxSearchableText marks its match with .lx-highlight; draw it like the
   server's <mark> so both sources of highlighting look the same */
.search-highlight :deep(.lx-highlight) {
  background-color: Mark;
  color: MarkText;
}
</style>
<template>
  <span class="search-highlight">
    <template v-if="segments">
      <template v-for="(segment, index) in segments" :key="index">
        <mark v-if="segment.marked">{{ segment.text }}</mark>
        <template v-else>{{ segment.text }}</template>
      </template>
    </template>
    <LxSearchableText v-else :value="value" :search-string="searchString" />
  </span>
</template>
