import { createApp, createSSRApp } from 'vue';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import { createHead } from '@vueuse/head';
import { createLx } from '@akordi/lx-ui';
import { createGtag } from 'vue-gtag';
import App from '@/App.vue';
import createAppRouter from '@/router';
import events from '@/router/events';
import lv from '@/locales/lv.json';
import lt from '@/locales/lt.json';
import ee from '@/locales/ee.json';
import es from '@/locales/es.json';
import configBool from '@/utils/configBool';

/**
 * Builds one full app instance (app, router, i18n, head), parameterized by
 * config instead of reading window.config directly — the same factory is
 * used by the browser entry (main.js) and, with ssr: true, by a Node SSR
 * entry, where window/document don't exist.
 */
export default function createAppInstance(config, { ssr = false } = {}) {
  const app = ssr ? createSSRApp(App) : createApp(App);
  app.use(createPinia());
  // SSR-safe access to config (window.config isn't available on the server) —
  // see e.g. SongView.vue's canonical URL / API base URL resolution.
  app.provide('appConfig', config);

  const base =
    config.publicUrl.indexOf('://') !== -1 ? new URL(config.publicUrl).pathname : config.publicUrl;
  const router = createAppRouter({ base, ssr });
  events(router);
  app.use(router);

  const i18n = createI18n({
    legacy: false,
    locale: config.defaultLanguage || 'lv',
    messages: { lv, lt, ee, es },
  });
  app.use(i18n);

  app.use(createLx, {
    systemId: 'akordi',
    authUrl: config.authUrl,
    publicUrl: config.publicUrl,
    environment: config.environment,
  });

  if (!ssr && configBool(config.gtagEnabled) && config.gtagId) {
    const $t = i18n.global.t;
    const gtag = createGtag({
      initMode: 'manual',
      tagId: config.gtagId,
      pageTracker: {
        router,
        exclude: (route) => route.meta.customPageTracker,
        template: (route) => ({
          page_path: route.path,
          page_title: $t(route.meta.title),
          page_location: window.location.href,
        }),
      },
    });
    app.use(gtag);
  }

  const head = createHead();
  app.use(head);

  return { app, router, i18n, head };
}
