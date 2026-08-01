import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('@dativa-lv/lx-ui', () => ({
  LxContentSwitcher: {
    name: 'LxContentSwitcher',
    props: ['items', 'modelValue'],
    emits: ['update:modelValue'],
    template: '<div />',
  },
}));
vi.mock('@/components/ChordSvg.vue', () => ({
  default: {
    name: 'ChordSvg',
    props: ['chord', 'instrument'],
    template: '<div />',
  },
}));
vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));

import ChordPlayer from '@/components/ChordPlayer.vue';

const segments = [
  { start: 0, end: 2, label: 'Am' },
  { start: 2, end: 4, label: 'C' },
  { start: 4, end: 6, label: 'Am' },
  { start: 6, end: 8, label: 'G' },
];

const mountPlayer = (props = {}) =>
  mount(ChordPlayer, {
    props: { videoUrl: 'https://youtu.be/abc123def45', segments, duration: 8, ...props },
  });

describe('ChordPlayer chord diagram panel', () => {
  it('is hidden by default so existing usages are unchanged', () => {
    const wrapper = mountPlayer();
    expect(wrapper.find('.chord-player-diagrams').exists()).toBe(false);
    expect(wrapper.findComponent({ name: 'LxContentSwitcher' }).exists()).toBe(false);
  });

  it('renders one diagram per distinct chord, in order of first appearance', () => {
    const wrapper = mountPlayer({ showDiagrams: true });
    const diagrams = wrapper.findAllComponents({ name: 'ChordSvg' });
    expect(diagrams.map((d) => d.props('chord'))).toEqual(['Am', 'C', 'G']);
  });

  it('highlights the chord under the playhead', () => {
    const wrapper = mountPlayer({ showDiagrams: true });
    // Playback starts at 0s, which falls in the first segment (Am).
    const active = wrapper.findAll('.chord-diagram.is-active');
    expect(active).toHaveLength(1);
    expect(active[0].findComponent({ name: 'ChordSvg' }).props('chord')).toBe('Am');
  });

  it('passes the instrument to diagrams and re-emits switcher changes', async () => {
    const wrapper = mountPlayer({ showDiagrams: true, instrument: 'ukulele' });
    const diagrams = wrapper.findAllComponents({ name: 'ChordSvg' });
    expect(diagrams.every((d) => d.props('instrument') === 'ukulele')).toBe(true);

    const switcher = wrapper.findComponent({ name: 'LxContentSwitcher' });
    expect(switcher.props('modelValue')).toBe('ukulele');
    switcher.vm.$emit('update:modelValue', 'guitar');
    expect(wrapper.emitted('update:instrument')).toEqual([['guitar']]);
  });

  it('hides the panel when segments carry no labels', () => {
    const wrapper = mountPlayer({
      showDiagrams: true,
      segments: [{ start: 0, end: 2, label: '' }],
    });
    expect(wrapper.find('.chord-player-diagrams').exists()).toBe(false);
  });
});
