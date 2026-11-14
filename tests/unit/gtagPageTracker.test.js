import { describe, expect, it } from 'vitest';
import { createMemoryHistory, createRouter } from 'vue-router';
import routes from '@/router/routes';
import gtagPageTracker, { pageViewFor } from '@/utils/gtagPageTracker';

const t = (key) => `t:${key}`;
const router = createRouter({ history: createMemoryHistory(), routes });

describe('gtagPageTracker', () => {
  it('tracks every route, songs included', () => {
    const tracker = gtagPageTracker(router, t);
    expect(tracker.router).toBe(router);
    expect(tracker.exclude).toBeUndefined();
  });

  it.each(['/song/1-A_-_B', '/search/song/1-A_-_B', '/top/song/1-A_-_B', '/new/song/1-A_-_B'])(
    'reports %s as the canonical song path without a generic title',
    (path) => {
      const route = router.resolve(path);
      expect(route.meta.songPage).toBe(true);
      expect(pageViewFor(route, t, `https://x${path}?q=1`)).toEqual({
        page_path: '/song/1-A_-_B',
        page_location: 'https://x/song/1-A_-_B',
      });
    }
  );

  it('sends the translated route title for other pages', () => {
    const route = router.resolve('/top');
    expect(pageViewFor(route, t, 'https://x/top')).toEqual({
      page_path: '/top',
      page_title: `t:${route.meta.title}`,
      page_location: 'https://x/top',
    });
  });
});
