import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('@dativa-lv/lx-ui', () => ({
  LxValuePicker: {
    name: 'LxValuePicker',
    props: ['items', 'modelValue', 'variant'],
    emits: ['update:modelValue'],
    template: '<div />',
  },
  LxButton: {
    name: 'LxButton',
    props: ['label', 'icon', 'disabled'],
    emits: ['click'],
    template: '<button :disabled="disabled" @click="$emit(\'click\')" />',
  },
}));
vi.mock('@/components/ChordSvg.vue', () => ({
  default: {
    name: 'ChordSvg',
    props: ['chord', 'instrument'],
    template: '<div />',
  },
}));
vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key, params) => (params ? `${key}:${Object.values(params).join(',')}` : key),
  }),
}));

import ChordPlayer from '@/components/ChordPlayer.vue';

// Fake YouTube IFrame API: build() resolves immediately and onReady fires
// synchronously, so tests can assert calls against the created player.
let lastPlayer;
class FakePlayer {
  constructor(el, opts) {
    lastPlayer = this;
    this.setPlaybackRate = vi.fn();
    this.seekTo = vi.fn();
    this.playVideo = vi.fn();
    this.loadVideoById = vi.fn();
    this.destroy = vi.fn();
    this.getIframe = () => ({ style: {} });
    this.getCurrentTime = () => 0;
    opts.events.onReady();
  }
}

beforeEach(() => {
  lastPlayer = undefined;
  vi.stubGlobal('YT', { Player: FakePlayer });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const segments = [
  { start: 0, end: 2, label: 'Am' },
  { start: 2, end: 4, label: 'C' },
  { start: 4, end: 6, label: 'Am' },
  { start: 6, end: 8, label: 'G' },
];

async function mountPlayer(props = {}) {
  const wrapper = mount(ChordPlayer, {
    props: { videoUrl: 'https://youtu.be/abc123def45', segments, duration: 8, ...props },
  });
  // build() awaits the (already-resolved) API promise before creating the
  // player — let those microtasks run.
  await vi.waitFor(() => {
    if (!lastPlayer) throw new Error('player not built yet');
  });
  return wrapper;
}

const speedSwitcher = (wrapper) =>
  wrapper
    .findAllComponents({ name: 'LxValuePicker' })
    .find((c) => c.props('variant') === 'tags');

describe('ChordPlayer chord diagram panel', () => {
  it('is hidden by default so existing usages are unchanged', async () => {
    const wrapper = await mountPlayer();
    expect(wrapper.find('.chord-player-diagrams').exists()).toBe(false);
  });

  it('renders one diagram per distinct chord, in order of first appearance', async () => {
    const wrapper = await mountPlayer({ showDiagrams: true });
    const diagrams = wrapper.findAllComponents({ name: 'ChordSvg' });
    expect(diagrams.map((d) => d.props('chord'))).toEqual(['Am', 'C', 'G']);
  });

  it('does not highlight diagrams in sync with playback (static reference only)', async () => {
    const wrapper = await mountPlayer({ showDiagrams: true });
    expect(wrapper.find('.chord-player-diagrams .is-active').exists()).toBe(false);
  });

  it('passes the instrument to diagrams and re-emits switcher changes', async () => {
    const wrapper = await mountPlayer({ showDiagrams: true, instrument: 'ukulele' });
    const diagrams = wrapper.findAllComponents({ name: 'ChordSvg' });
    expect(diagrams.every((d) => d.props('instrument') === 'ukulele')).toBe(true);

    const dropdown = wrapper
      .findAllComponents({ name: 'LxValuePicker' })
      .find((c) => c.props('variant') === 'dropdown');
    expect(dropdown.props('modelValue')).toBe('ukulele');
    dropdown.vm.$emit('update:modelValue', 'guitar');
    expect(wrapper.emitted('update:instrument')).toEqual([['guitar']]);
  });

  it('hides the panel when segments carry no labels', async () => {
    const wrapper = await mountPlayer({
      showDiagrams: true,
      segments: [{ start: 0, end: 2, label: '' }],
    });
    expect(wrapper.find('.chord-player-diagrams').exists()).toBe(false);
  });

  it('keeps no-chord markers out of the fingering panel', async () => {
    const wrapper = await mountPlayer({
      showDiagrams: true,
      segments: [
        { start: 0, end: 2, label: 'Am' },
        { start: 2, end: 4, label: 'N' },
        { start: 4, end: 6, label: 'C' },
      ],
    });
    const diagrams = wrapper.findAllComponents({ name: 'ChordSvg' });
    expect(diagrams.map((d) => d.props('chord'))).toEqual(['Am', 'C']);
  });
});

describe('ChordPlayer playback speed', () => {
  it('offers 0.5×, 0.75×, and 1× with 1× selected by default', async () => {
    const wrapper = await mountPlayer();
    const switcher = speedSwitcher(wrapper);
    expect(switcher.props('items').map((i) => i.id)).toEqual(['0.5', '0.75', '1']);
    expect(switcher.props('modelValue')).toBe('1');
  });

  it('applies a selected speed to the player', async () => {
    const wrapper = await mountPlayer();
    speedSwitcher(wrapper).vm.$emit('update:modelValue', '0.75');
    await wrapper.vm.$nextTick();
    expect(lastPlayer.setPlaybackRate).toHaveBeenCalledWith(0.75);
  });

  it('re-applies the speed when a new video loads into the same player', async () => {
    const wrapper = await mountPlayer();
    speedSwitcher(wrapper).vm.$emit('update:modelValue', '0.5');
    await wrapper.vm.$nextTick();
    lastPlayer.setPlaybackRate.mockClear();

    await wrapper.setProps({ videoUrl: 'https://youtu.be/XYZ123def45' });
    expect(lastPlayer.loadVideoById).toHaveBeenCalledWith('XYZ123def45');
    expect(lastPlayer.setPlaybackRate).toHaveBeenCalledWith(0.5);
  });
});

describe('ChordPlayer transpose', () => {
  const label = (wrapper) => wrapper.find('.chord-player-transpose-value');
  const buttons = (wrapper) => ({
    down: wrapper.find('#chordPlayerTransposeDown'),
    up: wrapper.find('#chordPlayerTransposeUp'),
    reset: wrapper.find('#chordPlayerTransposeReset'),
  });

  it('is hidden unless the host view opts in', async () => {
    const wrapper = await mountPlayer({ showDiagrams: true });
    expect(wrapper.find('#chordPlayerTransposeUp').exists()).toBe(false);
  });

  it('transposes timeline and diagram labels together', async () => {
    const wrapper = await mountPlayer({ showDiagrams: true, hasTranspose: true });
    await buttons(wrapper).up.trigger('click');
    await buttons(wrapper).up.trigger('click');

    expect(label(wrapper).text()).toBe('+2');
    const diagrams = wrapper.findAllComponents({ name: 'ChordSvg' });
    expect(diagrams.map((d) => d.props('chord'))).toEqual(['Bm', 'D', 'A']);
    // The timeline blocks show the same transposed labels.
    const blockLabels = wrapper.findAll('.chord-block-label').map((b) => b.text());
    expect(blockLabels).toContain('Bm');
    expect(blockLabels).not.toContain('Am');
  });

  it('shows a capo hint for downward transposes within reach of a real capo', async () => {
    const wrapper = await mountPlayer({ hasTranspose: true });
    await buttons(wrapper).down.trigger('click');
    await buttons(wrapper).down.trigger('click');
    expect(wrapper.find('.chord-player-capo-hint').text()).toBe('pages.playAlong.capoHint:2');
  });

  it('hides the capo hint when the equivalent fret is impractical', async () => {
    const wrapper = await mountPlayer({ hasTranspose: true });
    await buttons(wrapper).up.trigger('click'); // +1 → capo 11
    expect(wrapper.find('.chord-player-capo-hint').exists()).toBe(false);
  });

  it('resets to the original key and clamps at ±11', async () => {
    const wrapper = await mountPlayer({ hasTranspose: true });
    const { up } = buttons(wrapper);
    for (let i = 0; i < 15; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await up.trigger('click');
    }
    expect(label(wrapper).text()).toBe('+11');
    expect(up.attributes('disabled')).toBeDefined();

    await buttons(wrapper).reset.trigger('click');
    expect(label(wrapper).text()).toBe('0');
    expect(wrapper.find('#chordPlayerTransposeReset').exists()).toBe(false);
  });

  it('drops any transpose offset when a different song loads', async () => {
    const wrapper = await mountPlayer({ showDiagrams: true, hasTranspose: true });
    await buttons(wrapper).up.trigger('click');
    expect(label(wrapper).text()).toBe('+1');

    await wrapper.setProps({ videoUrl: 'https://youtu.be/XYZ123def45' });
    expect(label(wrapper).text()).toBe('0');
  });
});
