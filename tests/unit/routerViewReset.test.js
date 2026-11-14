import { describe, expect, it } from 'vitest';
import { START_LOCATION } from 'vue-router';
import shouldResetView from '@/router/viewReset';

const at = (name, path = '/') => ({ name, path });

describe('shouldResetView', () => {
  it('clears the heading when another view opens', () => {
    expect(shouldResetView(at('dashboard'), at('akordiArtistView', '/band/4-A'))).toBe(true);
  });

  it('leaves it to a view that stays on screen with new params', () => {
    expect(
      shouldResetView(at('akordiArtistView', '/band/5-B'), at('akordiArtistView', '/band/4-A'))
    ).toBe(false);
    expect(
      shouldResetView(at('akordiArtistLetter', '/find/b'), at('akordiArtistLetter', '/find/a'))
    ).toBe(false);
  });

  it('keeps the server-rendered state on the first navigation', () => {
    expect(shouldResetView(at('akordiArtistView'), START_LOCATION)).toBe(false);
  });

  it('ignores failed or aborted navigations', () => {
    expect(shouldResetView(at('dashboard'), at('akordiArtistView'), new Error('aborted'))).toBe(
      false
    );
  });
});
