import {
  hasScope,
  hasScopeDelete,
  hasScopeExport,
  hasScopeRead,
  hasScopeWrite,
} from '@/utils/permissionUtils';
import { useStorage } from '@vueuse/core';
import { computed, ref } from 'vue';

export default (authService, authUrl, publicUrl, clientId, scope, authSessionKey) => () => {
  const service = authService(authUrl, publicUrl, clientId, scope, authSessionKey);
  const initState = {
    active: false,
    family_name: null,
    given_name: null,
    code: null,
    org_id: null,
    org_name: null,
    sid: null,
    /** @type {SessionState} */
    st: null,
    scope: [],
    institution: null,
    secondsToLive: null,
    secondsToCountdown: null,
    isSessionExtendable: false,
  };
  const returnPath = useStorage('returnPath', null, sessionStorage);
  const session = ref({ ...initState });

  const isAuthorized = computed(() => Boolean(session.value.st !== 'none' && session.value.st));

  /** Fill session from api response.
   * Do this for each value individually in order to trigger reactivity correctly
   * @param {typeof initState} resp
   */
  function fillSession(resp) {
    session.value.active = resp.active;
    session.value.family_name = resp.identity.traits.family_name;
    session.value.given_name = resp.identity.traits.given_name;
    session.value.email = resp.identity.traits.email;
    session.value.sid = resp.id;
    session.value.st = 'authorized';
    session.value.scope = resp.scope;
    const expiresAt = new Date(resp.expires_at);
    const now = new Date();
    const secondsToLive = Math.floor((expiresAt - now) / 1000);
    session.value.secondsToLive = secondsToLive;
    session.value.secondsToCountdown = 300;
    session.value.isSessionExtendable = true;
  }

  async function clearReturnPath() {
    returnPath.value = null;
  }
  async function getReturnPath() {
    return returnPath.value;
  }
  function $reset() {
    session.value = { ...initState };
    session.value.st = 'none'; // don't call fetchSession() after reset
  }
  async function login(retPath = null) {
    if (retPath) {
      returnPath.value = retPath;
    }
    return service.authorize();
  }
  async function fetchSession() {
    try {
      const resp = await service.session();
      if (resp.status === 200) {
        fillSession(resp.data);
      }
    } catch (err) {
      $reset();
      throw err;
    }
    return session.value;
  }
  async function extendSession() {
    try {
      const resp = await service.extendSession();
      if (resp.status === 200) {
        await fetchSession();
      }
    } catch (err) {
      $reset();
      throw err;
    }
  }
  async function logout(redirectPath) {
    const resp = await service.logout(redirectPath);
    $reset();
    await clearReturnPath();
    return resp;
  }

  function hasPermission(name) {
    return hasScope(session.value?.scope, name);
  }
  function hasPermissionRead(name) {
    return hasScopeRead(session.value?.scope, name);
  }
  function hasPermissionWrite(name) {
    return hasScopeWrite(session.value?.scope, name);
  }
  function hasPermissionExport(name) {
    return hasScopeExport(session.value?.scope, name);
  }
  function hasPermissionDelete(name) {
    return hasScopeDelete(session.value?.scope, name);
  }

  // Returning reactive properties with unwrapped types in order to to support correct types definition in rollup declaration file
  return {
    /** @type {typeof initState} */
    // @ts-ignore
    session,
    /** @type {typeof Boolean} */
    // @ts-ignore
    showSessionEndCountdown: computed(
      () =>
        isAuthorized.value &&
        !session.value.isSessionExtendable &&
        session.value.secondsToLive &&
        session.value.secondsToLive < 60 * 5
    ),
    /** @type {typeof String} */
    // @ts-ignore
    fullName: computed(() => `${session.value.given_name} ${session.value.family_name}`),
    /** @type {typeof Boolean} */
    // @ts-ignore
    isAuthorized,
    fetchSession,
    login,
    extendSession,
    logout,
    $reset,
    hasPermission,
    hasPermissionRead,
    hasPermissionWrite,
    hasPermissionExport,
    hasPermissionDelete,
    clearReturnPath,
    getReturnPath,
  };
};
