import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import HomeSearch from '@/components/HomeSearch.vue';

const { push } = vi.hoisted(() => ({ push: vi.fn() }));

vi.mock('@akordi/lx-ui', () => ({
  LxTextInput: {
    name: 'LxTextInput',
    props: ['modelValue', 'placeholder', 'kind', 'labelId'],
    emits: ['update:modelValue'],
    template:
      '<input :value="modelValue" :placeholder="placeholder" @input="$emit(\'update:modelValue\', $event.target.value)" />',
  },
  LxButton: {
    name: 'LxButton',
    props: ['label', 'kind', 'icon'],
    emits: ['click'],
    template: '<button @click="$emit(\'click\')">{{ label }}</button>',
  },
}));
vi.mock('vue-i18n', () => ({
  useI18n: () => ({ t: (key, args) => (args ? `${key}:${JSON.stringify(args)}` : key) }),
}));
vi.mock('vue-router', () => ({ useRouter: () => ({ push }) }));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('HomeSearch', () => {
  it('sends the trimmed query to the search page on Enter', async () => {
    const wrapper = mount(HomeSearch);
    const input = wrapper.find('input');
    await input.setValue('  Eglīte ');
    await input.trigger('keydown', { key: 'Enter' });

    expect(push).toHaveBeenCalledWith({ name: 'songSearch', query: { q: 'Eglīte' } });
  });

  it('sends the query when the button is clicked', async () => {
    const wrapper = mount(HomeSearch);
    await wrapper.find('input').setValue('Līvi');
    await wrapper.find('button').trigger('click');

    expect(push).toHaveBeenCalledWith({ name: 'songSearch', query: { q: 'Līvi' } });
  });

  it('opens the search page without a query when the field is empty', async () => {
    const wrapper = mount(HomeSearch);
    await wrapper.find('button').trigger('click');

    expect(push).toHaveBeenCalledWith({ name: 'songSearch' });
  });

  it('shows the catalogue size in the placeholder once it is known', () => {
    const withCount = mount(HomeSearch, { props: { songCount: 5224 } });
    expect(withCount.find('input').attributes('placeholder')).toBe(
      'pages.dashboard.search.placeholderCount:{"songCount":5224}'
    );

    const withoutCount = mount(HomeSearch);
    expect(withoutCount.find('input').attributes('placeholder')).toBe(
      'pages.dashboard.search.placeholder'
    );
  });

  it('is exposed to assistive tech as a labelled search region', () => {
    const wrapper = mount(HomeSearch);
    expect(wrapper.find('[role="search"]').exists()).toBe(true);
    expect(wrapper.findComponent({ name: 'LxTextInput' }).props('labelId')).toBe('homeSearchLabel');
    expect(wrapper.find('#homeSearchLabel').text()).toBe('pages.dashboard.search.label');
  });
});
