import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';

vi.mock('vue-i18n', () => ({ useI18n: () => ({ t: (key) => key }) }));

import ChordSvg from '@/components/ChordSvg.vue';

// The chord database is imported asynchronously inside the component; wait
// until either the diagram svg or the fallback tile has rendered.
async function mountAndSettle(props) {
  const wrapper = mount(ChordSvg, { props });
  await vi.waitFor(() => {
    if (!wrapper.find('svg').exists() && !wrapper.find('.chord-svg-fallback').exists()) {
      throw new Error('not rendered yet');
    }
  });
  return wrapper;
}

describe('ChordSvg', () => {
  it('renders a fingering diagram for a known chord', async () => {
    const wrapper = await mountAndSettle({ chord: 'Am' });
    expect(wrapper.find('svg').exists()).toBe(true);
    expect(wrapper.find('.chord-title').text()).toBe('Am');
    expect(wrapper.find('.chord-svg-fallback').exists()).toBe(false);
  });

  it('renders slash chords using the base chord fingering, keeping the full name', async () => {
    const wrapper = await mountAndSettle({ chord: 'D/F#' });
    expect(wrapper.find('svg').exists()).toBe(true);
    expect(wrapper.find('.chord-title').text()).toBe('D/F#');
  });

  it('renders suffixes that previously fell through the mapping', async () => {
    const wrapper = await mountAndSettle({ chord: 'Asus4' });
    expect(wrapper.find('svg').exists()).toBe(true);
    expect(wrapper.find('.chord-title').text()).toBe('Asus4');
  });

  it('renders a name-only tile instead of nothing for unknown chords', async () => {
    const wrapper = await mountAndSettle({ chord: 'Cweird9' });
    expect(wrapper.find('svg').exists()).toBe(false);
    const fallback = wrapper.find('.chord-svg-fallback');
    expect(fallback.exists()).toBe(true);
    expect(fallback.text()).toBe('Cweird9');
    expect(fallback.attributes('title')).toBe('chordDiagram.unavailable');
  });

  it('renders the fallback for unparseable labels too', async () => {
    const wrapper = await mountAndSettle({ chord: 'N.C.' });
    expect(wrapper.find('.chord-svg-fallback').text()).toBe('N.C.');
  });

  it('still supports the explicit root/suffix API used by the chords library', async () => {
    const wrapper = await mountAndSettle({ root: 'C', suffix: 'major' });
    expect(wrapper.find('svg').exists()).toBe(true);
    expect(wrapper.find('.chord-title').text()).toBe('C');
  });

  it('renders ukulele diagrams with the instrument-specific root spelling', async () => {
    const wrapper = await mountAndSettle({ chord: 'C#m', instrument: 'ukulele' });
    expect(wrapper.find('svg').exists()).toBe(true);
    expect(wrapper.find('.chord-title').text()).toBe('C#m');
  });
});
