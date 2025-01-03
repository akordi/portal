import { createRouter, createWebHistory } from 'vue-router';
import routes from '@/router/routes';

const router = createRouter({
  history: createWebHistory(
    window.config.publicUrl.indexOf('://') !== -1
      ? new URL(window.config.publicUrl).pathname
      : window.config.publicUrl
  ),
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    }
    // document.getElementById('app').scrollIntoView();
    // TODO: somehow does not seem to work :/
    return { left: 0, top: 0 };
  },
  routes,
});

export default router;
