<script setup>
import { LxBadge } from '@akordi/lx-ui';
import { useI18n } from 'vue-i18n';

defineProps({ badges: { type: Array, required: true } });

const { t: $t } = useI18n();
const ICONS = { popular: 'star-filled', playAlong: 'play' };
</script>

<template>
  <span v-if="badges.length" class="song-badges">
    <LxBadge
      v-for="badge in badges"
      :key="badge"
      :icon="ICONS[badge]"
      :value="$t(`pages.tagView.badges.${badge}`)"
      :tooltip="$t(`pages.tagView.badges.${badge}Tooltip`)"
    />
  </span>
</template>

<style scoped>
.song-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
  margin-top: 0.375rem;
}
</style>
