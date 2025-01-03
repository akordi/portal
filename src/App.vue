<script setup>
import { watch } from 'vue';
import { useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import Error404 from '@/views/Error404.vue';
import useAppStore from '@/stores/useAppStore';

const i18n = useI18n();
const route = useRoute();
const appStore = useAppStore();

watch(
  route,
  () => {
    document.title = i18n.t('title.prefix') + i18n.t(route.meta.title || 'title.default');
  },
  { immediate: true }
);
</script>
<template>
  <Error404 v-if="appStore.showError" />
  <router-view v-else />
</template>
