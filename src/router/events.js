import useAppStore from '@/stores/useAppStore';
import useAuthStore from '@/stores/useAuthStore';
import useViewStore from '@/stores/useViewStore';

import { lxFlowUtils } from '@wntr/lx-ui';

export default (router) => {
  router.beforeEach(async (to, from, next) => {
    const authStore = useAuthStore();
    const appStore = useAppStore();

    try {
      if (authStore.session.st === null) {
        // await authStore.fetchSession();
      }
    } catch (err) {
      // proceed as unauthorized
    }

    if (!to.meta.anonymous && !authStore.isAuthorized) {
      const returnPath = to.fullPath;
      next({ name: 'notAuthorized', query: { returnPath } });
      return;
    }

    appStore.$reset();
    appStore.startNavigating();

    await lxFlowUtils.beforeEach(to, from, next, appStore, authStore);
  });
  router.afterEach(async (to, from) => {
    const appStore = useAppStore();
    const viewStore = useViewStore();

    viewStore.$reset();
    await lxFlowUtils.afterEach(to, from, appStore);
    lxFlowUtils.removeFocus();
  });
};
