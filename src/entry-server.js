import { renderToString } from '@vue/server-renderer';
import createAppInstance, { routerBaseFor } from '@/createApp';
import createAppRouter from '@/router';
import { setSsrApiBaseUrl } from '@/services/http';
import { setSsrApiBaseUrl as setSsrApiBaseUrlAnon } from '@/services/httpAnon';
import prefetchRoute from '@/ssr/prefetch';
import { pickTransferredState, serializeState } from '@/ssr/serializeState';

/**
 * Renders one request to an HTML string. `config` is the same shape as
 * window.config in the browser, but must be supplied explicitly here since
 * there's no window on the server (see src/createApp.js). config.serviceUrl
 * must be an absolute URL reachable from wherever this runs (e.g.
 * http://localhost:8080) — the relative '/api/' used in the browser only
 * works because nginx proxies it; there's no such resolution in Node.
 *
 * Besides the markup, the result carries:
 *   - `state`: the serialized Pinia state the client hydrates from (see
 *     main.js), already escaped for an inline <script>, or null when the
 *     route had nothing to prefetch — then the client mounts from scratch
 *     exactly as it did before SSR state transfer existed;
 *   - the HTTP outcome the route's prefetch or the rendered view asked for
 *     through the per-request `ssrContext`:
 *     - `status`: the response status to write (200 unless e.g. 404 because
 *       the API said the resource doesn't exist);
 *     - `redirect`: a router path (no base, no query) the server should
 *       answer with a 301 to instead of the markup, or null.
 */
export default async function render(url, config) {
  setSsrApiBaseUrl(config.serviceUrl);
  setSsrApiBaseUrlAnon(config.serviceUrl);

  const { app, router, head, pinia } = createAppInstance(config, { ssr: true });

  const ssrContext = { status: 200, redirect: null };
  app.provide('ssrContext', ssrContext);

  router.push(url);
  await router.isReady();

  // Before renderToString, so that state the layout renders (the header's
  // title) is already in place — a component-level onServerPrefetch resolves
  // after the layout around it has been written out. A failed fetch still
  // renders the page (its loading shell) rather than failing the response.
  let prefetched = false;
  try {
    prefetched = await prefetchRoute({
      route: router.currentRoute.value,
      router,
      pinia,
      ssrContext,
    });
  } catch (err) {
    // A 404 is a reported outcome (ssrContext.status), not a failure worth
    // a stack trace on every crawler hit of a deleted song.
    if (err?.response?.status !== 404) {
      // eslint-disable-next-line no-console
      console.error(`SSR prefetch failed for ${url}:`, err);
    }
  }

  const html = await renderToString(app);
  const state = prefetched ? serializeState(pickTransferredState(pinia.state.value)) : null;
  return { html, head, state, status: ssrContext.status, redirect: ssrContext.redirect };
}

/**
 * Whether the router knows `url` (anything but the catch-all notFound
 * route) — lets the server answer a real 404 for routes it doesn't
 * server-render, without instantiating or rendering the app.
 */
export function isKnownRoute(url, config) {
  const router = createAppRouter({ base: routerBaseFor(config), ssr: true });
  return router.resolve(url).name !== 'notFound';
}
