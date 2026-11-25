import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';
import CookiesConsent from '@/components/CookiesConsent.vue';

const { hasConsent, addGtag, consentGrantedAll } = vi.hoisted(() => ({
  hasConsent: { value: false },
  addGtag: vi.fn(),
  consentGrantedAll: vi.fn(),
}));

vi.mock('@akordi/lx-ui', () => ({
  LxButton: {
    name: 'LxButton',
    props: ['label', 'kind', 'icon', 'title'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')">{{ label }}</button>',
  },
}));
vi.mock('vue-gtag', () => ({
  addGtag,
  consentGrantedAll,
  useConsent: () => ({ hasConsent: ref(hasConsent.value) }),
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('@/utils/asyncComponent', () => ({ default: () => Promise.resolve() }));

const VAR = '--cookie-banner-height';
const heightVar = () => document.documentElement.style.getPropertyValue(VAR);
const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');

beforeEach(() => {
  vi.clearAllMocks();
  hasConsent.value = false;
  // jsdom does no layout, so give the banner a height to report.
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
    configurable: true,
    get: () => 190,
  });
});

afterEach(() => {
  Object.defineProperty(HTMLElement.prototype, 'offsetHeight', offsetHeight);
  document.documentElement.style.removeProperty(VAR);
});

describe('CookiesConsent banner height', () => {
  it('publishes its height while open so sticky toolbars can sit above it', async () => {
    const wrapper = mount(CookiesConsent, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.find('.cookies-wrapper').exists()).toBe(true);
    expect(heightVar()).toBe('190px');
    wrapper.unmount();
  });

  it('clears the height once the visitor accepts', async () => {
    const wrapper = mount(CookiesConsent, { attachTo: document.body });
    await flushPromises();

    await wrapper.findAll('button')[0].trigger('click');
    await flushPromises();

    expect(wrapper.find('.cookies-wrapper').exists()).toBe(false);
    expect(heightVar()).toBe('');
    expect(addGtag).toHaveBeenCalled();
    wrapper.unmount();
  });

  it('clears the height once the visitor closes it', async () => {
    const wrapper = mount(CookiesConsent, { attachTo: document.body });
    await flushPromises();

    await wrapper.findAll('button')[1].trigger('click');
    await flushPromises();

    expect(heightVar()).toBe('');
    expect(addGtag).not.toHaveBeenCalled();
    wrapper.unmount();
  });

  it('never sets the height when consent was already given', async () => {
    hasConsent.value = true;
    const wrapper = mount(CookiesConsent, { attachTo: document.body });
    await flushPromises();

    expect(wrapper.find('.cookies-wrapper').exists()).toBe(false);
    expect(heightVar()).toBe('');
    wrapper.unmount();
  });
});
