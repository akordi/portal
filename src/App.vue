<script setup>
import useAppConfig from '@/hooks/useAppConfig';
import useAppStore from '@/stores/useAppStore';
import Error404 from '@/views/Error404.vue';
import { useHead } from '@vueuse/head';
import htmlLang from '@/utils/htmlLang';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

const { t: $t } = useI18n();
const route = useRoute();
const appStore = useAppStore();
const appConfig = useAppConfig();
const pageTitle = computed(() => $t('title.prefix') + $t(route.meta.title || 'title.default'));
const pageDescription = computed(() => $t(route.meta.description || 'title.description'));
useHead({
  // Same value server.mjs substitutes into the template's {{HTML_LANG}} —
  // set here too so the client keeps document.documentElement.lang in sync.
  htmlAttrs: { lang: htmlLang(appConfig.defaultLanguage) },
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
