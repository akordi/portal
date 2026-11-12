import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { enableAutoUnmount, mount } from '@vue/test-utils';
import { defineComponent } from 'vue';
import lv from '@/locales/lv.json';
import lt from '@/locales/lt.json';
import ee from '@/locales/ee.json';
import es from '@/locales/es.json';

const { isAppVersionChanged, restoreRouteAndNotify, trackNavigationState, notify, router } =
  vi.hoisted(() => ({
    isAppVersionChanged: vi.fn(),
    restoreRouteAndNotify: vi.fn(),
    trackNavigationState: vi.fn(),
    notify: { pushWarning: vi.fn() },
    router: { name: 'router' },
  }));

vi.mock('@akordi/lx-ui', () => ({
  lxVersionCheckUtils: { isAppVersionChanged, restoreRouteAndNotify },
  lxNavigationStateUtils: { trackNavigationState },
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => `t:${key}` }) }));
vi.mock('vue-router', () => ({ useRouter: () => router }));
vi.mock('@/stores/useNotifyStore', () => ({ default: () => notify }));

import useVersionCheck, {
  VERSION_CHECK_INTERVAL,
  isReloadingForNewVersion,
} from '@/hooks/useVersionCheck';

const INTERVAL = 60_000;

// Each mount adds a document listener - never let one leak into the next test
enableAutoUnmount(afterEach);

const mountWithCheck = () =>
  mount(
    defineComponent({
      setup() {
        useVersionCheck(INTERVAL);
        return () => null;
      },
    })
  );

let visibility = 'visible';
function setVisibility(value) {
  visibility = value;
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  visibility = 'visible';
  vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('useVersionCheck', () => {
  it('restores the route on mount with a translated text, without checking yet', () => {
    mountWithCheck();

    expect(restoreRouteAndNotify).toHaveBeenCalledTimes(1);
    const [routerArg, notifyArg, text] = restoreRouteAndNotify.mock.calls[0];
    expect(routerArg).toBe(router);
    expect(notifyArg).toBe(notify);
    expect(text()).toBe('t:versionCheck.reloaded');
    expect(isAppVersionChanged).not.toHaveBeenCalled();
  });

  it('checks every interval with the translated notification text', () => {
    mountWithCheck();

    vi.advanceTimersByTime(INTERVAL);
    expect(isAppVersionChanged).toHaveBeenCalledTimes(1);
    const [notifyArg, text] = isAppVersionChanged.mock.calls[0];
    expect(notifyArg).toBe(notify);
    expect(text()).toBe('t:versionCheck.updated');

    vi.advanceTimersByTime(INTERVAL);
    expect(isAppVersionChanged).toHaveBeenCalledTimes(2);
  });

  it('skips checks while the tab is hidden and catches up once it is shown', () => {
    mountWithCheck();
    setVisibility('hidden');

    vi.advanceTimersByTime(3 * INTERVAL);
    expect(isAppVersionChanged).not.toHaveBeenCalled();

    setVisibility('visible');
    expect(isAppVersionChanged).toHaveBeenCalledTimes(1);
  });

  it('does not check on showing the tab when the last check is recent', () => {
    mountWithCheck();

    vi.advanceTimersByTime(INTERVAL / 2);
    setVisibility('hidden');
    setVisibility('visible');
    expect(isAppVersionChanged).not.toHaveBeenCalled();
  });

  it('stops polling once unmounted', () => {
    const wrapper = mountWithCheck();
    wrapper.unmount();

    vi.advanceTimersByTime(3 * INTERVAL);
    setVisibility('visible');
    expect(isAppVersionChanged).not.toHaveBeenCalled();
  });

  it('polls every few minutes by default', () => {
    expect(VERSION_CHECK_INTERVAL).toBe(5 * 60 * 1000);
  });
});

describe('isReloadingForNewVersion', () => {
  const to = { name: 'songSearch', params: {}, query: { q: 'a' } };

  it('tracks the navigation and reports the reload lx-ui started', async () => {
    isAppVersionChanged.mockResolvedValue(true);

    await expect(isReloadingForNewVersion(to, { name: 'dashboard' })).resolves.toBe(true);
    expect(trackNavigationState).toHaveBeenCalledWith(to);
    expect(isAppVersionChanged).toHaveBeenCalledWith(undefined);
  });

  it('lets the navigation continue when the version is current', async () => {
    isAppVersionChanged.mockResolvedValue(false);

    await expect(isReloadingForNewVersion(to, { name: 'dashboard' })).resolves.toBe(false);
  });

  it('does not check on the initial navigation', async () => {
    await expect(isReloadingForNewVersion(to, { name: undefined })).resolves.toBe(false);
    expect(trackNavigationState).toHaveBeenCalledWith(to);
    expect(isAppVersionChanged).not.toHaveBeenCalled();
  });
});

describe('version check texts', () => {
  it.each(Object.entries({ lv, lt, ee, es }))('are translated for %s', (_locale, messages) => {
    expect(messages.versionCheck.updated).toMatch(/\S/);
    expect(messages.versionCheck.reloaded).toMatch(/\S/);
  });

  it('differ per locale', () => {
    const updated = new Set([lv, lt, ee, es].map((m) => m.versionCheck.updated));
    const reloaded = new Set([lv, lt, ee, es].map((m) => m.versionCheck.reloaded));
    expect(updated.size).toBe(4);
    expect(reloaded.size).toBe(4);
  });
});
