import { describe, it, expect, vi, afterAll, beforeEach } from 'vitest';
import { createSSRApp } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createI18n } from 'vue-i18n';
import { createMemoryHistory, createRouter } from 'vue-router';
import routes from '@/router/routes';
import buildSiteMap from '@/utils/siteMap';
import SiteMapFooter from '@/components/SiteMapFooter.vue';
import lv from '@/locales/lv.json';
import lt from '@/locales/lt.json';
import ee from '@/locales/ee.json';
import es from '@/locales/es.json';

// The real auth store reads window.config at import time; the footer only
// needs isAuthorized.
const authStore = vi.hoisted(() => ({ isAuthorized: false }));
vi.mock('@/stores/useAuthStore', () => ({ default: () => authStore }));

// vitest runs with isolate: false (vite.config.mjs), and this file loads the
// real vue-i18n, vue-router and lx-ui that other test files mock. Drop them
// from the shared module registry so those files import their own mocks.
afterAll(() => {
  vi.resetModules();
});

const names = (group) => group.routes.map((route) => route.name);

beforeEach(() => {
  authStore.isAuthorized = false;
});

describe('buildSiteMap', () => {
  it('groups the public sections into songs, chords and site columns', () => {
    const groups = buildSiteMap(routes, false);

    expect(groups.map((group) => group.category)).toEqual(['songs', 'chords', 'site']);
    expect(names(groups[0])).toEqual([
      'songSearch',
      'songListNew',
      'songListTop',
      'akordiArtistList',
      'tagList',
      'songNew',
    ]);
    expect(names(groups[1])).toEqual(['chordsLibrary', 'chordGeneratorList']);
    expect(names(groups[2])).toEqual(['dashboard', 'accessibilitySettings']);
  });

  it('adds the signed-in-only pages for an authorized user', () => {
    const site = buildSiteMap(routes, true).find((group) => group.category === 'site');

    expect(names(site)).toEqual(['dashboard', 'songbook', 'userProfile', 'accessibilitySettings']);
  });

  it('only links routes LxSiteMap can resolve by name alone', () => {
    const router = createRouter({ history: createMemoryHistory(), routes });

    buildSiteMap(routes, true)
      .flatMap((group) => group.routes)
      .forEach((route) => {
        expect(() => router.resolve({ name: route.name })).not.toThrow();
      });
  });

  it('drops columns with no visible routes', () => {
    const onlyPrivate = [
      { path: '/a', name: 'a', meta: { category: 'site', anonymous: false } },
      { path: '/b', name: 'b', meta: {} },
    ];

    expect(buildSiteMap(onlyPrivate, false)).toEqual([]);
  });
});

describe('SiteMapFooter', () => {
  async function render(locale = 'lv') {
    const router = createRouter({ history: createMemoryHistory(), routes });
    await router.push('/dashboard');
    const i18n = createI18n({ legacy: false, locale, messages: { lv, lt, ee, es } });
    const app = createSSRApp(SiteMapFooter).use(router).use(i18n);
    return renderToString(app);
  }

  it('server-renders real links with stable list ids', async () => {
    const html = await render();

    expect(html).toContain('aria-label="Vietnes karte"');
    expect(html).toContain('id="site-map-songs"');
    expect(html).toContain('href="/search"');
    expect(html).toContain('href="/akordi/artists"');
    expect(html).toContain('href="/chordgen"');
    expect(html).toContain('href="/accessibility-settings"');
    expect(html).toContain('Dziesmu meklētājs');
    expect(html).not.toContain('href="/songbooks"');
    // Same markup on every render, so hydration can't mismatch.
    expect(await render()).toBe(html);
  });

  it('is translated for every site locale', async () => {
    const htmls = await Promise.all(['lv', 'lt', 'ee', 'es'].map((locale) => render(locale)));

    expect(htmls[1]).toContain('Svetainės žemėlapis');
    expect(htmls[2]).toContain('Saidikaart');
    expect(htmls[3]).toContain('Mapa del sitio');
    htmls.forEach((html) => expect(html).not.toMatch(/siteMap\.|pages\./));
  });

  it('links the signed-in-only pages for an authorized user', async () => {
    authStore.isAuthorized = true;

    const html = await render();

    expect(html).toContain('href="/songbooks"');
    expect(html).toContain('href="/user/profile"');
  });
});
