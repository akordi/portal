import { onBeforeUnmount, onMounted } from 'vue';
import { useI18n } from 'vue-i18n';
import { useRouter } from 'vue-router';
import { lxNavigationStateUtils, lxVersionCheckUtils } from '@akordi/lx-ui';
import useNotifyStore from '@/stores/useNotifyStore';

// A public site with many open tabs: one tiny no-cache request per visible tab
// every few minutes is negligible, and still tells readers about a deploy soon.
export const VERSION_CHECK_INTERVAL = 5 * 60 * 1000;

/**
 * Router guard step: on a stale build, reload into the new version instead of
 * navigating. A deploy removes the old build's lazy route chunks, so the
 * navigation would fail to load them. Same as lxFlowUtils.beforeEach does,
 * which router/events.js doesn't use. useVersionCheck() restores the route the
 * user was heading to once the reloaded page has mounted.
 * @returns {Promise<boolean>} `true` when a reload is underway - abort the navigation
 */
export async function isReloadingForNewVersion(to, from) {
  // Browser only: the server renders a single navigation per request
  if (typeof window === 'undefined') return false;
  lxNavigationStateUtils.trackNavigationState(to);
  // The first navigation loads the page itself, which is already current
  if (!from.name) return false;
  return lxVersionCheckUtils.isAppVersionChanged(undefined);
}

/**
 * Tells the reader when a new version has been deployed (version.json, written
 * by lxVitePortalVersionPlugin, no longer matches window.config.version).
 *
 * Polls itself rather than through lx-ui's own interval, which keeps running in
 * background tabs: a hidden tab skips its checks and checks once it is shown
 * again, if the last check is older than the interval.
 *
 * Everything starts in onMounted, which never runs during SSR.
 * @param {number} [intervalMs]
 */
export default function useVersionCheck(intervalMs = VERSION_CHECK_INTERVAL) {
  const notify = useNotifyStore();
  const router = useRouter();
  const { t } = useI18n();
  // Getters, so the texts follow the active locale
  const updatedText = () => t('versionCheck.updated');
  const reloadedText = () => t('versionCheck.reloaded');

  let lastCheck = 0;
  let timer = null;

  function check() {
    lastCheck = Date.now();
    lxVersionCheckUtils.isAppVersionChanged(notify, updatedText);
  }

  function onTick() {
    if (document.visibilityState === 'visible') check();
  }

  function onVisibilityChange() {
    if (document.visibilityState === 'visible' && Date.now() - lastCheck >= intervalMs) check();
  }

  onMounted(() => {
    lxVersionCheckUtils.restoreRouteAndNotify(router, notify, reloadedText);
    // The page was just loaded, so it is current: the first check waits an interval
    lastCheck = Date.now();
    timer = setInterval(onTick, intervalMs);
    document.addEventListener('visibilitychange', onVisibilityChange);
  });

  onBeforeUnmount(() => {
    clearInterval(timer);
    document.removeEventListener('visibilitychange', onVisibilityChange);
  });
}
