import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { ref } from 'vue';

const { submit, getMyJob, getQueue, getMyLimit, pushError } = vi.hoisted(() => ({
  submit: vi.fn(),
  getMyJob: vi.fn(),
  getQueue: vi.fn(),
  getMyLimit: vi.fn(),
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
  LxInfoBox: {
    name: 'LxInfoBox',
    props: ['label', 'description', 'variant'],
    template: '<div />',
  },
  LxRow: { name: 'LxRow', props: ['label'], template: '<div><slot /></div>' },
  LxTextInput: {
    name: 'LxTextInput',
    props: ['modelValue'],
    emits: ['update:modelValue', 'blur'],
    template: '<input />',
  },
  lxDateUtils: { formatDateTime: (value) => `fmt:${value}` },
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
  default: { submit, getMyJob, getQueue, getMyLimit },
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

const limitSnapshot = (overrides = {}) => ({
  data: { limit: 5, used: 0, remaining: 5, ...overrides },
});

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  getMyLimit.mockResolvedValue(limitSnapshot());
  // oEmbed title guess — irrelevant here, always fails silently.
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')));
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe('ChordGeneratorSubmit persistent status box', () => {
  it('shows the queue snapshot before any submission', async () => {
    getQueue.mockResolvedValue(queueSnapshot());
    const wrapper = mount(ChordGeneratorSubmit);
    await flushPromises();

    expect(getQueue).toHaveBeenCalledTimes(1);
    const box = wrapper.findComponent({ name: 'LxInfoBox' });
    expect(box.props('label')).toBe('pages.chordGenerator.queue.none');
    // The allowance line rides along as the description.
    expect(box.props('description')).toBe('pages.chordGenerator.limit.remaining');
    expect(box.props('variant')).toBe('info');
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

    // The same info box persists but now shows live job status with the
    // job's own position in the queue instead of the stale snapshot.
    const box = wrapper.findComponent({ name: 'LxInfoBox' });
    expect(box.props('label')).toBe('pages.chordGenerator.status.pending');
    expect(box.props('description')).toContain('pages.chordGenerator.status.position');

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

    const box = wrapper.findComponent({ name: 'LxInfoBox' });
    expect(box.props('label')).toBe('pages.chordGenerator.status.running');
    expect(box.props('description')).toBe('');
  });
});

describe('ChordGeneratorSubmit daily allowance', () => {
  it('turns the status box into a warning and disables submit when exhausted', async () => {
    getQueue.mockResolvedValue(queueSnapshot());
    getMyLimit.mockResolvedValue(
      limitSnapshot({ used: 5, remaining: 0, resetAt: '2026-08-03T05:00:00Z' })
    );

    const wrapper = mount(ChordGeneratorSubmit);
    await flushPromises();

    const box = wrapper.findComponent({ name: 'LxInfoBox' });
    expect(box.props('variant')).toBe('warning');
    // The exhausted message (with the reset time) leads; the queue snapshot
    // becomes the detail line.
    expect(box.props('label')).toBe('pages.chordGenerator.limit.exhaustedUntil');
    expect(box.props('description')).toBe('pages.chordGenerator.queue.none');

    const actions = wrapper.findComponent({ name: 'LxForm' }).props('actionDefinitions');
    expect(actions.find((a) => a.id === 'submit').disabled).toBe(true);
  });

  it('keeps submit enabled while slots remain', async () => {
    getQueue.mockResolvedValue(queueSnapshot());
    getMyLimit.mockResolvedValue(limitSnapshot({ used: 3, remaining: 2 }));

    const wrapper = mount(ChordGeneratorSubmit);
    await flushPromises();

    const actions = wrapper.findComponent({ name: 'LxForm' }).props('actionDefinitions');
    expect(actions.find((a) => a.id === 'submit').disabled).toBe(false);
  });

  it('refreshes the allowance after an accepted submission', async () => {
    getQueue.mockResolvedValue(queueSnapshot());
    submit.mockResolvedValue({ data: { status: 'pending', id: 'job-1' } });
    getMyJob.mockResolvedValue({ data: { status: 'pending' } });

    const wrapper = mount(ChordGeneratorSubmit);
    await flushPromises();
    expect(getMyLimit).toHaveBeenCalledTimes(1);

    wrapper.findComponent({ name: 'LxForm' }).vm.$emit('action-click', 'submit');
    await flushPromises();
    expect(getMyLimit).toHaveBeenCalledTimes(2);
  });

  it('surfaces the reset time from a 429 and re-syncs the allowance', async () => {
    getQueue.mockResolvedValue(queueSnapshot());
    submit.mockRejectedValue({
      response: { status: 429, data: { limit: 5, remaining: 0, resetAt: '2026-08-03T05:00:00Z' } },
    });

    const wrapper = mount(ChordGeneratorSubmit);
    await flushPromises();
    expect(getMyLimit).toHaveBeenCalledTimes(1);

    wrapper.findComponent({ name: 'LxForm' }).vm.$emit('action-click', 'submit');
    await flushPromises();

    expect(pushError).toHaveBeenCalledWith('pages.chordGenerator.limit.exhaustedUntil');
    expect(getMyLimit).toHaveBeenCalledTimes(2);
  });

  it('falls back to the generic message when a 429 has no reset time', async () => {
    getQueue.mockResolvedValue(queueSnapshot());
    submit.mockRejectedValue({ response: { status: 429, data: {} } });

    const wrapper = mount(ChordGeneratorSubmit);
    await flushPromises();
    wrapper.findComponent({ name: 'LxForm' }).vm.$emit('action-click', 'submit');
    await flushPromises();

    expect(pushError).toHaveBeenCalledWith('pages.chordGenerator.status.rateLimited');
  });
});
