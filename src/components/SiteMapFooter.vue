<script setup>
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { LxSiteMap } from '@akordi/lx-ui';
import useAuthStore from '@/stores/useAuthStore';
import buildSiteMap from '@/utils/siteMap';

const { t: $t } = useI18n();
const router = useRouter();
const authStore = useAuthStore();

const groups = computed(() => buildSiteMap(router.options.routes, authStore.isAuthorized));
</script>
<template>
  <nav class="site-map" :aria-label="$t('siteMap.label')">
    <!-- Fixed ids: LxSiteMap's default id is a random UUID, which would differ
         between the server render and hydration. -->
    <LxSiteMap
      v-for="group in groups"
      :key="group.category"
      :id="`site-map-${group.category}`"
      :routes="group.routes"
      :category="group.category"
      :label="$t(group.label)"
      :translator="$t"
    />
  </nav>
</template>
<style scoped>
.site-map {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(12rem, 1fr));
  gap: var(--space-1500) var(--space-2000);
  padding: var(--space-2000) var(--space-0);
}
</style>
