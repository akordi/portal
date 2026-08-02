import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';

const { getSong, getTags, saveEdit, replace, push, back, pushError, query } = vi.hoisted(() => ({
  getSong: vi.fn(),
  getTags: vi.fn(),
  saveEdit: vi.fn(),
  replace: vi.fn(),
  push: vi.fn(),
  back: vi.fn(),
  pushError: vi.fn(),
  query: { value: {} },
}));

// Stub the lx-ui pieces the form uses; LxForm captures the save/cancel action.
vi.mock('@dativa-lv/lx-ui', () => {
  const passthrough = (name) => ({ name, template: '<div><slot /></div>' });
  return {
    LxForm: {
      name: 'LxForm',
      props: ['actionDefinitions'],
      emits: ['action-click'],
      template: '<div><slot /></div>',
    },
    LxRow: passthrough('LxRow'),
    LxAutoComplete: { name: 'LxAutoComplete', props: ['modelValue'], template: '<div />' },
    LxTextInput: { name: 'LxTextInput', props: ['modelValue'], template: '<input />' },
    LxTextArea: { name: 'LxTextArea', props: ['modelValue'], template: '<textarea />' },
    LxValuePicker: { name: 'LxValuePicker', props: ['modelValue'], template: '<div />' },
  };
});
vi.mock('@/services/akordiService', () => ({
  default: { getSong, getTags, saveEdit, searchArtist: vi.fn() },
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));
vi.mock('vue-router', () => ({
  useRoute: () => ({ query: query.value }),
  useRouter: () => ({ replace, push, back }),
}));
vi.mock('@/stores/useViewStore', () => ({
  default: () => ({ title: '', description: '', goBack: false, $reset: vi.fn() }),
}));
vi.mock('@/stores/useNotifyStore', () => ({
  default: () => ({ pushError, pushSuccess: vi.fn() }),
}));
// The template reads v.<field>.$error for every field, so hand back a ref whose
// unknown properties answer as a clean, untouched validator.
vi.mock('@vuelidate/core', async () => {
  const { ref } = await import('vue');
  const validator = new Proxy(
    { $validate: () => Promise.resolve(true), $reset: () => {} },
    {
      get(target, prop) {
        if (prop in target) {
          return target[prop];
        }
        return { $error: false, $errors: [] };
      },
    },
  );
  return { default: () => ref(validator) };
});
vi.mock('@vuelidate/validators', () => ({
  createI18nMessage: () => (rule) => rule,
  required: () => true,
}));

const songResponse = {
  data: {
    id: 5237,
    title: 'Pirmajā dienā',
    body: 'body with chords',
    mainArtist: { id: 1, title: 'Prāta Vētra/Brainstorm' },
    composers: [],
    poets: [],
    performers: [],
    tags: [],
  },
};

async function mountForm(isNew) {
  const SongEdit = (await import('@/views/SongEdit.vue')).default;
  const wrapper = mount(SongEdit, { props: { isNew } });
  await flushPromises();
  return wrapper;
}

async function save(wrapper) {
  wrapper.findComponent({ name: 'LxForm' }).vm.$emit('action-click', 'save');
  await flushPromises();
}

describe('public song form new-vs-edit mode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query.value = {};
    getTags.mockResolvedValue({ data: { content: [] } });
    getSong.mockResolvedValue(songResponse);
    saveEdit.mockResolvedValue({ data: { id: 1 } });
  });

  it('sends /add?id= to the edit route so it is not submitted as a new song', async () => {
    query.value = { id: '5237' };
    await mountForm(true);

    expect(replace).toHaveBeenCalledWith({ name: 'songEdit', query: { id: '5237' } });
    // Nothing is loaded or submitted from the mismatched route.
    expect(getSong).not.toHaveBeenCalled();
  });

  it('sends /edit with no id to the new-song route', async () => {
    await mountForm(false);

    expect(replace).toHaveBeenCalledWith({ name: 'songNew' });
    expect(getSong).not.toHaveBeenCalled();
  });

  it('leaves /add alone and submits without a song id', async () => {
    const wrapper = await mountForm(true);
    expect(replace).not.toHaveBeenCalled();

    // The main artist is the only field the submit mapping needs.
    wrapper.findAllComponents({ name: 'LxAutoComplete' })[0].vm.$emit('update:modelValue', '1');
    await flushPromises();

    await save(wrapper);
    expect(saveEdit).toHaveBeenCalledTimes(1);
    expect(saveEdit.mock.calls[0][0].id).toBeUndefined();
  });

  it('submits /edit?id= as an edit carrying the song id', async () => {
    query.value = { id: '5237' };
    const wrapper = await mountForm(false);
    expect(replace).not.toHaveBeenCalled();
    expect(getSong).toHaveBeenCalledWith('5237');

    await save(wrapper);
    expect(saveEdit).toHaveBeenCalledTimes(1);
    expect(saveEdit.mock.calls[0][0].id).toBe(5237);
  });

  it('refuses to submit an edit whose song failed to load', async () => {
    query.value = { id: '5237' };
    getSong.mockRejectedValue(new Error('boom'));
    const wrapper = await mountForm(false);

    await save(wrapper);
    expect(saveEdit).not.toHaveBeenCalled();
    expect(pushError).toHaveBeenCalledWith('errors.loadSongFailed');
  });
});
