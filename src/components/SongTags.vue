<script setup>
import { LxButton } from '@dativa-lv/lx-ui';
import { computed } from 'vue';

// Clickable tag chips for a song. Each tag is an LxButton rendered as a
// router-link (href) so it is a real <a> for SEO and keyboard users, styled
// as a tertiary button so it reads as a chip rather than a primary action.
const props = defineProps({
  tags: {
    type: Array,
    default: () => [],
  },
});

// The song API can repeat a tag (one row per join), so dedupe by id.
const uniqueTags = computed(() => [...new Map(props.tags.map((tag) => [tag.id, tag])).values()]);

function tagLink(tag) {
  return {
    name: 'tagView',
    params: { url: (tag.url || String(tag.id)).replace(/^\/tag\//, '') },
  };
}
</script>
<style scoped>
.song-tags {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-0500, 0.5rem);
}
</style>
<template>
  <div class="song-tags">
    <LxButton
      v-for="tag in uniqueTags"
      :key="tag.id"
      kind="tertiary"
      icon="tag"
      :label="tag.title"
      :href="tagLink(tag)"
    />
  </div>
</template>
