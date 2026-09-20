import { renderToString } from '@vue/server-renderer';
import createAppInstance from '@/createApp';
import { setSsrApiBaseUrl } from '@/services/http';
import { setSsrApiBaseUrl as setSsrApiBaseUrlAnon } from '@/services/httpAnon';

/**
 * Renders one request to an HTML string. `config` is the same shape as
 * window.config in the browser, but must be supplied explicitly here since
 * there's no window on the server (see src/createApp.js). config.serviceUrl
 * must be an absolute URL reachable from wherever this runs (e.g.
 * http://localhost:8080) — the relative '/api/' used in the browser only
 * works because nginx proxies it; there's no such resolution in Node.
 */
export default async function render(url, config) {
  setSsrApiBaseUrl(config.serviceUrl);
  setSsrApiBaseUrlAnon(config.serviceUrl);

  const { app, router, head } = createAppInstance(config, { ssr: true });

  router.push(url);
  await router.isReady();

  const html = await renderToString(app);
  return { html, head };
}
