import { createRouter, createWebHistory, createMemoryHistory } from 'vue-router';
import routes from '@/router/routes';

// A fresh router instance per app instance — required for SSR, where each
// request needs its own history/route state instead of a shared singleton.
export default function createAppRouter({ base = '/', ssr = false } = {}) {
  return createRouter({
    history: ssr ? createMemoryHistory(base) : createWebHistory(base),
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
}
