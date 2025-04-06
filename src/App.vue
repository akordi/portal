<script setup>
import useAppStore from '@/stores/useAppStore';
import Error404 from '@/views/Error404.vue';
import { watch } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

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
