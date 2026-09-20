<script setup>
import { LxButton } from '@akordi/lx-ui';

defineProps({
  tags: {
    type: Array,
    default: () => [],
  },
});

function tagLink(tag) {
  return {
    name: 'tagView',
    params: { url: tag.url.replace(/^\/tag\//, '') },
  };
}
</script>
<style scoped>
.song-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-0500, 0.5rem);
  margin-bottom: var(--space-1000, 1rem);
}
</style>
<template>
  <div class="song-tags">
    <LxButton
      v-for="tag in tags"
      :key="tag.id"
      kind="tertiary"
      icon="tag"
      :label="tag.title"
      :href="tagLink(tag)"
    />
  </div>
</template>
