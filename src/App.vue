<script setup>
import useAppStore from '@/stores/useAppStore';
import Error404 from '@/views/Error404.vue';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';
import { useHead } from '@vueuse/head';
import useViewStore from './stores/useViewStore';

const { t: $t } = useI18n();
const route = useRoute();
const appStore = useAppStore();
const viewStore = useViewStore();
const pageTitle = computed(() => $t('title.prefix') + $t(route.meta.title || 'title.default'));
const pageDescription = computed(() => $t(route.meta.description || 'title.description'));
useHead({
  title: pageTitle,
  meta: [
    { name: 'description', content: pageDescription },
    { property: 'og:title', content: pageTitle },
    { property: 'og:description', content: pageDescription },
  ],
});
</script>
<template>
  <Error404 v-if="appStore.showError" />
  <router-view v-else />
</template>
