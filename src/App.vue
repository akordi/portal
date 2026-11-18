<script setup>
import useAppConfig from '@/hooks/useAppConfig';
import useAppStore from '@/stores/useAppStore';
import Error404 from '@/views/Error404.vue';
import { useHead } from '@vueuse/head';
import htmlLang from '@/utils/htmlLang';
import { computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRoute } from 'vue-router';

// The four sites are separate catalogues, not translations of each other —
// so hreflang only makes honest sense at the site level ("the other country
// editions of this product"), not per song/artist. Hardcoded: these URLs
// essentially never change, and nothing in the runtime config exposes
// sibling-site hostnames today. Points at "/", the one route that's SSR'd
// with real <head> tags (see server.mjs's SSR_ROUTE_PATTERNS) — "/dashboard",
// what "/" redirects to client-side, would render the plain SPA shell.
const SITE_ALTERNATES = [
  { hreflang: 'lv', href: 'https://www.akordi.lv/' },
  { hreflang: 'et', href: 'https://www.akordi.ee/' }, // BCP47 for Estonian, not "ee"
  { hreflang: 'lt', href: 'https://www.akordi.lt/' },
  { hreflang: 'es', href: 'https://www.akordi.es/' },
  { hreflang: 'x-default', href: 'https://www.akordi.lv/' },
];

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
  link: SITE_ALTERNATES.map((alt) => ({
    rel: 'alternate',
    hreflang: alt.hreflang,
    href: alt.href,
  })),
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
