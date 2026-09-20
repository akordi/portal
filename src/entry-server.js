import { renderToString } from '@vue/server-renderer';
import createAppInstance, { routerBaseFor } from '@/createApp';
import createAppRouter from '@/router';
import { setSsrApiBaseUrl } from '@/services/http';
import { setSsrApiBaseUrl as setSsrApiBaseUrlAnon } from '@/services/httpAnon';

/**
 * Renders one request to an HTML string. `config` is the same shape as
 * window.config in the browser, but must be supplied explicitly here since
 * there's no window on the server (see src/createApp.js). config.serviceUrl
 * must be an absolute URL reachable from wherever this runs (e.g.
 * http://localhost:8080) — the relative '/api/' used in the browser only
 * works because nginx proxies it; there's no such resolution in Node.
 *
 * Besides the markup, the result carries the HTTP outcome the rendered view
 * asked for through the per-request `ssrContext` it can inject:
 *   - `status`: the response status to write (200 unless a view set e.g.
 *     404 because the API said the resource doesn't exist);
 *   - `redirect`: a router path (no base, no query) the server should answer
 *     with a 301 to instead of the markup, or null.
 */
export default async function render(url, config) {
  setSsrApiBaseUrl(config.serviceUrl);
  setSsrApiBaseUrlAnon(config.serviceUrl);

  const { app, router, head } = createAppInstance(config, { ssr: true });

  const ssrContext = { status: 200, redirect: null };
  app.provide('ssrContext', ssrContext);

  router.push(url);
  await router.isReady();

  const html = await renderToString(app);
  return { html, head, status: ssrContext.status, redirect: ssrContext.redirect };
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
