import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { createI18n } from 'vue-i18n';
import App from '@/App.vue';
import router from '@/router';
import lv from '@/locales/lv.json';
import lt from '@/locales/lt.json';
import ee from '@/locales/ee.json';
import es from '@/locales/es.json';
import events from '@/router/events';
import { createLx } from '@dativa-lv/lx-ui';
import { createGtag } from 'vue-gtag';
import { createHead } from '@vueuse/head';

import '@dativa-lv/lx-ui/dist/styles/lx-reset.css';
import '@dativa-lv/lx-ui/dist/styles/lx-fonts-carbon.css';
import '@dativa-lv/lx-ui/dist/styles/lx-pt-carbon.css';
import '@dativa-lv/lx-ui/dist/styles/lx-ut-carbon-light.css';
import '@dativa-lv/lx-ui/dist/styles/lx-ut-carbon-dark.css';
import '@dativa-lv/lx-ui/dist/styles/lx-ut-carbon-contrast.css';

import '@dativa-lv/lx-ui/dist/styles/lx-buttons.css';
import '@dativa-lv/lx-ui/dist/styles/lx-data-grid.css';
import '@dativa-lv/lx-ui/dist/styles/lx-inputs.css';
import '@dativa-lv/lx-ui/dist/styles/lx-steps.css';
import '@dativa-lv/lx-ui/dist/styles/lx-forms.css';
import '@dativa-lv/lx-ui/dist/styles/lx-notifications.css';
import '@dativa-lv/lx-ui/dist/styles/lx-modal.css';
import '@dativa-lv/lx-ui/dist/styles/lx-loaders.css';
import '@dativa-lv/lx-ui/dist/styles/lx-lists.css';
import '@dativa-lv/lx-ui/dist/styles/lx-expanders.css';
import '@dativa-lv/lx-ui/dist/styles/lx-tabs.css';
import '@dativa-lv/lx-ui/dist/styles/lx-date-pickers.css';
import '@dativa-lv/lx-ui/dist/styles/lx-animations.css';
import '@dativa-lv/lx-ui/dist/styles/lx-master-detail.css';
import '@dativa-lv/lx-ui/dist/styles/lx-ratings.css';
import '@dativa-lv/lx-ui/dist/styles/lx-day-input.css';

// Need only to hide console errors when running lx-ui locally
// import '@dativa-lv/lx-ui/dist/lx-fonts/IBMPlexMono-SemiBold.woff';
// import '@dativa-lv/lx-ui/dist/lx-fonts/IBMPlexSans-Light.woff';
// import '@dativa-lv/lx-ui/dist/lx-fonts/IBMPlexSans-Regular.woff';
// import '@dativa-lv/lx-ui/dist/lx-fonts/IBMPlexSans-SemiBold.woff';
// import '@dativa-lv/lx-ui/dist/lx-fonts/IBMPlexMono-Regular.woff';
// import '@dativa-lv/lx-ui/dist/lx-fonts/IBMPlexSans-Italic.woff';
//

import '@dativa-lv/lx-ui/dist/styles/lx-map.css';
import '@dativa-lv/lx-ui/dist/styles/lx-shell-grid.css';
import '@dativa-lv/lx-ui/dist/styles/lx-shell-grid-public.css';
import '@dativa-lv/lx-ui/dist/styles/lx-forms-grid.css';
import '@dativa-lv/lx-ui/dist/styles/lx-treelist.css';
import '@dativa-lv/lx-ui/dist/styles/lx-stack.css';

import '@/assets/styles.css';
import '@/assets/lx-pt-akordi.css';

const myApp = createApp(App);
myApp.use(createPinia());
events(router);
myApp.use(router);
const i18n = createI18n({
  legacy: false,
  locale: window.config?.defaultLanguage || 'lv',
  messages: {
    lv,
    lt,
    ee,
    es,
  },
});
const $t = i18n.global.t;

myApp.use(i18n);
myApp.use(createLx, {
  systemId: 'akordi',
  authUrl: window.config.authUrl,
  publicUrl: window.config.publicUrl,
  environment: window.config.environment,
});

if (window.config.gtagEnabled && window.config.gtagId) {
  const gtag = createGtag({
    initMode: 'manual',
    tagId: window.config.gtagId,
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
  myApp.use(gtag);
}
const head = createHead();
myApp.use(head);

myApp.mount('#app');
