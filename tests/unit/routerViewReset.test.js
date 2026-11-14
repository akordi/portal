import { describe, expect, it } from 'vitest';
import { START_LOCATION } from 'vue-router';
import shouldResetView from '@/router/viewReset';

const at = (path) => ({ path });

describe('shouldResetView', () => {
  it('clears the heading when moving to another page', () => {
    expect(shouldResetView(at('/'), at('/band/4-Raimonds_Pauls'))).toBe(true);
  });

  it('keeps the server-rendered state on the first navigation', () => {
    expect(shouldResetView(at('/band/4-Raimonds_Pauls'), START_LOCATION)).toBe(false);
  });

  it('keeps it for query-only changes and failed or aborted navigations', () => {
    expect(shouldResetView(at('/search'), at('/search'))).toBe(false);
    expect(shouldResetView(at('/'), at('/band/4-A'), new Error('aborted'))).toBe(false);
  });
});
