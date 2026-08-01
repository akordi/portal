import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';

const { submit, getMyJob, getQueue, pushError } = vi.hoisted(() => ({
  submit: vi.fn(),
  getMyJob: vi.fn(),
  getQueue: vi.fn(),
  pushError: vi.fn(),
}));

vi.mock('@dativa-lv/lx-ui', () => ({
  LxButton: { name: 'LxButton', props: ['label'], template: '<button />' },
  LxForm: {
    name: 'LxForm',
    props: ['actionDefinitions'],
    emits: ['action-click'],
    template: '<form><slot /></form>',
  },
  LxInfoBox: { name: 'LxInfoBox', props: ['label', 'variant'], template: '<div />' },
  LxLoader: {
    name: 'LxLoader',
    props: ['loading', 'variant', 'label', 'description'],
    template: '<div />',
  },
  LxRow: { name: 'LxRow', props: ['label'], template: '<div><slot /></div>' },
  LxTextInput: {
    name: 'LxTextInput',
    props: ['modelValue'],
    emits: ['update:modelValue', 'blur'],
    template: '<input />',
  },
}));
vi.mock('@vuelidate/core', () => ({
  default: () =>
    ref({ $validate: async () => true, youtubeUrl: { $error: false, $errors: [] } }),
}));
vi.mock('@vuelidate/validators', () => ({
  createI18nMessage: () => (rule) => rule,
  required: {},
  url: {},
}));
vi.mock('@/services/chordgenSongService', () => ({
  default: { submit, getMyJob, getQueue },
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: { youtubeUrl: 'https://youtu.be/abc123def45' }, fullPath: '/x' }),
  useRouter: () => ({ push: vi.fn() }),
}));
vi.mock('@/stores/useViewStore', () => ({
  default: () => ({ title: '', description: '', goBack: false }),
}));
vi.mock('@/stores/useNotifyStore', () => ({
  default: () => ({ pushError, pushSuccess: vi.fn() }),
}));
vi.mock('@/stores/useAuthStore', () => ({
  default: () => ({ isAuthenticated: () => true, login: vi.fn() }),
}));

import ChordGeneratorSubmit from '@/views/ChordGeneratorSubmit.vue';

const queueSnapshot = (overrides = {}) => ({
  data: {
    pending: 0,
    running: 0,
    avgProcessingSeconds: 60,
    estimatedWaitSeconds: 0,
    ...overrides,
  },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  // oEmbed title guess — irrelevant here, always fails silently.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ChordGeneratorSubmit live status panel', () => {
  it('shows the queue snapshot before any submission', async () => {
    getQueue.mockResolvedValue(queueSnapshot());
    const wrapper = mount(ChordGeneratorSubmit);
    await flushPromises();

    expect(getQueue).toHaveBeenCalledTimes(1);
    expect(wrapper.findComponent({ name: 'LxInfoBox' }).props('label')).toBe(
      'pages.chordGenerator.queue.none'
    );
    expect(wrapper.findComponent({ name: 'LxLoader' }).exists()).toBe(false);
  });

  it('replaces the snapshot with a live progress panel and re-fetches the queue on every poll', async () => {
    getQueue.mockResolvedValue(queueSnapshot({ pending: 2, running: 1 }));
    submit.mockResolvedValue({ data: { status: 'pending', id: 'job-1' } });
    getMyJob.mockResolvedValue({ data: { status: 'pending', queueAhead: 2 } });

    const wrapper = mount(ChordGeneratorSubmit);
    await flushPromises();
    expect(getQueue).toHaveBeenCalledTimes(1);

    wrapper.findComponent({ name: 'LxForm' }).vm.$emit('action-click', 'submit');
    await flushPromises();

    // Submitting kicked off an immediate poll, which also refreshed the queue.
    expect(getMyJob).toHaveBeenCalledTimes(1);
    expect(getQueue).toHaveBeenCalledTimes(2);

    // The stale "queue is empty" info box is gone; the live panel is shown
    // with the job's own position in the queue.
    expect(wrapper.findComponent({ name: 'LxInfoBox' }).exists()).toBe(false);
    const loader = wrapper.findComponent({ name: 'LxLoader' });
    expect(loader.props('label')).toBe('pages.chordGenerator.status.pending');
    expect(loader.props('description')).toContain('pages.chordGenerator.status.position');

    // Every subsequent poll tick refreshes both the job and the queue.
    await vi.advanceTimersByTimeAsync(3000);
    expect(getMyJob).toHaveBeenCalledTimes(2);
    expect(getQueue).toHaveBeenCalledTimes(3);
  });

  it('switches the panel to the running state as the job progresses', async () => {
    getQueue.mockResolvedValue(queueSnapshot({ running: 1 }));
    submit.mockResolvedValue({ data: { status: 'pending', id: 'job-1' } });
    getMyJob.mockResolvedValue({ data: { status: 'running' } });

    const wrapper = mount(ChordGeneratorSubmit);
    await flushPromises();
    wrapper.findComponent({ name: 'LxForm' }).vm.$emit('action-click', 'submit');
    await flushPromises();

    const loader = wrapper.findComponent({ name: 'LxLoader' });
    expect(loader.props('label')).toBe('pages.chordGenerator.status.running');
    expect(loader.props('description')).toBe('');
  });
});
