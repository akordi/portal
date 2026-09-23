import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { reactive } from 'vue';

// Uses the real LxModal from @akordi/lx-ui on purpose: the bug was IdleModal
// passing props/events the installed LxModal doesn't support, so a stub would
// hide it.

const { authStore, notify, routerPush } = vi.hoisted(() => ({
  authStore: {
    session: null,
    keepAlive: vi.fn(),
    logout: vi.fn(),
    fetchSession: vi.fn(),
    showSessionEndCountdown: false,
  },
  notify: { pushSuccess: vi.fn(), pushError: vi.fn(), pushWarning: vi.fn() },
  routerPush: vi.fn(),
}));

vi.mock('@/stores/useAuthStore', () => ({ default: () => authStore }));
vi.mock('@/stores/useNotifyStore', () => ({ default: () => notify }));
vi.mock('@/hooks/useErrors', () => ({
  default: () => ({ get: (err) => err?.response ?? {} }),
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-router', () => ({ useRouter: () => ({ push: routerPush }) }));

import { LxModal } from '@akordi/lx-ui';
import IdleModal from '@/components/IdleModal.vue';

let wrapper;

async function mountAndOpen() {
  wrapper = mount(IdleModal, { attachTo: document.body });
  // secondsToLive < secondsToCountdown -> the next tick opens the modal.
  await vi.advanceTimersByTimeAsync(1000);
  await flushPromises();
}

const actionButton = (id) => document.querySelector(`[id$="-action-${id}"]`);

// jsdom has no layout: give LxModal's focus trap (tabbable checks
// getClientRects) visible nodes, and add the missing Element.scrollTo.
const originalGetClientRects = Element.prototype.getClientRects;
const originalScrollTo = Element.prototype.scrollTo;

beforeEach(() => {
  vi.clearAllMocks();
  Element.prototype.getClientRects = () => [{ width: 1, height: 1 }];
  Element.prototype.scrollTo = () => {};
  vi.useFakeTimers();
  const modals = document.createElement('div');
  modals.id = 'modals';
  document.body.appendChild(modals);
  authStore.session = reactive({ active: true, secondsToLive: 50, secondsToCountdown: 60 });
  authStore.keepAlive.mockResolvedValue({});
  authStore.logout.mockResolvedValue({ status: 200, data: '' });
  routerPush.mockResolvedValue();
});

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  vi.useRealTimers();
  document.body.innerHTML = '';
  Element.prototype.getClientRects = originalGetClientRects;
  Element.prototype.scrollTo = originalScrollTo;
});

describe('IdleModal', () => {
  it('renders Continue and Logout buttons when the session is about to expire', async () => {
    await mountAndOpen();

    expect(actionButton('continue')?.textContent).toContain('shell.sessionExpiring.primaryLabel');
    expect(actionButton('logout')?.textContent).toContain('shell.sessionExpiring.secondaryLabel');
    // Closing is disabled: no header close button.
    expect(document.querySelector('[id$="-close-button"]')).toBeNull();
  });

  it('Continue keeps the session alive and closes the modal', async () => {
    await mountAndOpen();
    authStore.keepAlive.mockClear();

    actionButton('continue').click();
    await flushPromises();

    expect(authStore.keepAlive).toHaveBeenCalledTimes(1);
    expect(notify.pushSuccess).toHaveBeenCalledWith('shell.notifications.sessionContinued');
    expect(actionButton('continue')).toBeNull();
    expect(authStore.logout).not.toHaveBeenCalled();
  });

  it('Logout logs out, routes to sessionEnded and closes the modal', async () => {
    await mountAndOpen();

    actionButton('logout').click();
    await flushPromises();

    expect(authStore.logout).toHaveBeenCalledTimes(1);
    expect(routerPush).toHaveBeenCalledWith({ name: 'sessionEnded' });
    expect(actionButton('logout')).toBeNull();
  });

  it('treats an unexpected close as "continue" so the idle state resets', async () => {
    await mountAndOpen();
    authStore.keepAlive.mockClear();

    wrapper.findComponent(LxModal).vm.$emit('close');
    await flushPromises();

    expect(authStore.keepAlive).toHaveBeenCalledTimes(1);
    expect(actionButton('continue')).toBeNull();
  });
});
