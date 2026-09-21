import { describe, it, expect } from 'vitest';
import { pickTransferredState, serializeState } from '@/ssr/serializeState';

describe('pickTransferredState', () => {
  it('keeps only the stores meant to cross to the client', () => {
    const state = pickTransferredState({
      songStore: { song: { id: 1 } },
      viewStore: { title: 'x' },
      settingsStore: { instrument: 'ukulele' },
      authStore: { session: {} },
    });

    expect(state).toEqual({ songStore: { song: { id: 1 } }, viewStore: { title: 'x' } });
  });

  it('leaves out a transferred store that was never instantiated', () => {
    expect(pickTransferredState({ viewStore: { title: 'x' } })).toEqual({
      viewStore: { title: 'x' },
    });
  });
});

describe('serializeState', () => {
  it('is JSON that reads back to the same value', () => {
    const state = { songStore: { song: { body: 'Am  F\nlyrics "quoted" <b>Am</b>' } } };

    expect(JSON.parse(serializeState(state))).toEqual(state);
  });

  it('cannot break out of an inline <script>', () => {
    const state = { song: { body: '</script><script>alert(1)</script>' } };
    const serialized = serializeState(state);

    expect(serialized).not.toContain('<');
    expect(serialized).not.toContain('</script>');
    expect(JSON.parse(serialized)).toEqual(state);
  });

  it('escapes the line terminators JSON allows but JS source does not', () => {
    const state = { text: 'a\u2028b\u2029c' };
    const serialized = serializeState(state);

    expect(serialized).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(serialized)).toEqual(state);
  });
});
