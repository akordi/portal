import useRights from '@/hooks/useRights';
import useAppStore from '@/stores/useAppStore';
import useAuthStore from '@/stores/useAuthStore';
import { lxFlowUtils } from '@akordi/lx-ui';

export default (router) => {
  // Return-based guard: since lx-ui 2.3 the flow utils no longer take or call
  // a `next` callback — the guard's return value resolves the navigation
  // (true to continue, a route location to redirect).
  router.beforeEach(async (to) => {
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
      return true;
    }

    const isAuthenticated = await authStore.isAuthenticated();
    if (!isAuthenticated) {
      const query = to.path === '/' ? {} : { returnPath: to.path };
      return {
        query,
        replace: true,
        name: 'notAuthorized',
      };
    }

    const withPermission = to.matched.filter((r) => !r.meta.access || r.meta.access(rights));
    const hasPermissionInternal =
      withPermission.length === 0 ||
      withPermission.some((record) => !record.meta.access || record.meta.access(rights));
    if (isAuthenticated && hasPermissionInternal) {
      return true;
    }
    return {
      query: { returnPath: to.path },
      replace: true,
      name: 'error',
    };
    // Not using lxFlowUtils.beforeEach — there is no scope system here. It
    // would need `from` back in the signature:
    //   return lxFlowUtils.beforeEach(to, from, appStore, authStore);
  });

  router.afterEach(async (to, from) => {
    const appStore = useAppStore();
    await lxFlowUtils.afterEach(to, from, appStore);
  });
};
