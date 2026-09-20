import { inject } from 'vue';

/**
 * Runtime config, safe for both SSR and the browser.
 *
 * createApp.js provides the config as 'appConfig' (server.mjs's readConfig()
 * on the server, window.config in main.js), so components should read it via
 * inject instead of window.config — on the server window doesn't exist, and
 * components that guarded with `typeof window` silently rendered as if every
 * flag were off, causing a layout shift once hydration re-read the real values.
 *
 * Falls back to window.config for call sites outside a component setup
 * context (inject only works during setup).
 */
export default function useAppConfig() {
  const injected = inject('appConfig', null);
  if (injected) return injected;
  return typeof window !== 'undefined' && window.config ? window.config : {};
}
