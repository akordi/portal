import useRights from '@/hooks/useRights';
import useAppStore from '@/stores/useAppStore';
import useAuthStore from '@/stores/useAuthStore';
import { lxFlowUtils } from '@dativa-lv/lx-ui';

export default (router) => {
  router.beforeEach(async (to, from, next) => {
    const appStore = useAppStore();
    const rights = useRights();

    const authStore = useAuthStore();

    appStore.showError = false;
    appStore.error = '';

    try {
      if (authStore.session.st === null) {
        await authStore.fetchSession();
      }
    } catch (err) {
      // proceed as unauthorized
    }

    const allowAnonymous = to.matched.some((record) => record.meta.anonymous);
    if (allowAnonymous || to.name === 'dashboard') {
      next();
      return;
    }

    const isAuthenticated = await authStore.isAuthenticated();
    if (!isAuthenticated) {
      const query = to.path === '/' ? {} : { returnPath: to.path };
      next({
        query,
        replace: true,
        name: 'notAuthorized',
      });
      return;
    }

    const withPermission = to.matched.filter((r) => !r.meta.access || r.meta.access(rights));
    const hasPermissionInternal =
      withPermission.length === 0 ||
      withPermission.some((record) => !record.meta.access || record.meta.access(rights));
    if (isAuthenticated && hasPermissionInternal) {
      next();
      return;
    }
    next({
      query: { returnPath: to.path },
      replace: true,
      name: 'error',
    });
    // await lxFlowUtils.beforeEach(to, from, next, appStore, authStore);
  });

  router.afterEach(async (to, from) => {
    const appStore = useAppStore();
    await lxFlowUtils.afterEach(to, from, appStore);
  });
};
