import { renderToString } from '@vue/server-renderer';
import createAppInstance from '@/createApp';

/**
 * Renders one request to an HTML string. `config` is the same shape as
 * window.config in the browser, but must be supplied explicitly here since
 * there's no window on the server (see src/createApp.js).
 */
export default async function render(url, config) {
  const { app, router, head } = createAppInstance(config, { ssr: true });

  router.push(url);
  await router.isReady();

  const html = await renderToString(app);
  return { html, head };
}
