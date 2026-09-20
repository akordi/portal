import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderHeadToString } from '@vueuse/head';
// A build artifact (see package.json's build:server script), not a source
// file — doesn't exist, and can't be resolved by eslint, until `bun run
// build` has run. Node needs the real extension for a relative ESM import.
// eslint-disable-next-line no-restricted-imports, import/no-unresolved, import/extensions
import render from './dist/server/entry-server.mjs';

const PORT = process.env.SSR_PORT || 3000;
// In production this points at nginx's own webroot copy (see Dockerfile),
// the same file 30-envsubst-content.sh rewrites in place at container
// startup — there's deliberately no second copy to keep in sync. Falls back
// to the client build's own output for local/manual runs (bun run
// serve:ssr) where nginx isn't in the picture at all.
const TEMPLATE_PATH =
  process.env.SSR_TEMPLATE_PATH ||
  fileURLToPath(new URL('./dist/client/index.html', import.meta.url));

// Only these route shapes have actually been made SSR-safe (see the lx-ui
// and portal SSR-safety commits) — everything else still gets the plain SPA
// shell, exactly as before SSR existed, so an unaudited route (settings,
// auth, songbook management, ...) can't silently misbehave under SSR.
const SSR_ROUTE_PATTERNS = [
  /^\/song\/[^/]+\/?$/,
  /^\/search\/song\/[^/]+\/?$/,
  /^\/new\/song\/[^/]+\/?$/,
  /^\/top\/song\/[^/]+\/?$/,
  /^\/band\/[^/]+\/?$/,
];

function isSsrRoute(url) {
  const path = url.split('?')[0];
  return SSR_ROUTE_PATTERNS.some((pattern) => pattern.test(path));
}

// config mirrors window.config from index.html (see docker/30-envsubst-
// content.sh) — read directly from the same env vars rather than parsing the
// already-substituted HTML, since this is what actually drives the Vue app's
// own logic (createLx options, router base, canonical URLs), not just what
// gets displayed.
function readConfig() {
  return {
    publicUrl: process.env.PUBLIC_URL || '/',
    authUrl: process.env.AUTH_URL || '',
    authEnabled: process.env.AUTH_ENABLED === 'true',
    environment: process.env.ENVIRONMENT || 'production',
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'lv',
    gtagEnabled: false, // SSR never fires analytics — see SongView's loadSong()
    gtagId: null,
    // Reuses the exact env var nginx's own /api/v2 proxy_pass already relies
    // on (see docker/default.conf.template) — the internal portal-api URL is
    // the same whether nginx or this process is the one calling it. Falls
    // back to SERVICE_URL/'/api' only for local/manual runs where API_V2_URL
    // isn't set, which won't resolve from inside Node the way it does from a
    // browser, but keeps this from crashing outright.
    serviceUrl: process.env.API_V2_URL || process.env.SERVICE_URL || '/api',
  };
}

function readTemplate() {
  // Re-read per request in dev-ish/low-traffic scenarios cost nothing
  // meaningful here and avoid ever serving a stale template after a deploy
  // that replaces files without restarting this process.
  return readFileSync(TEMPLATE_PATH, 'utf-8');
}

// The static template's own <title>/description/og: tags (from index.html)
// exist for routes server.mjs never renders. For an SSR'd route, useHead()'s
// tags must fully replace them — appending headTags after them would leave
// two <title> elements, and per spec a browser (and most crawlers) use the
// *first* one, silently keeping the generic static title instead of the
// real one this whole thing exists to serve.
function stripStaticHeadTags(template) {
  return template
    .replace(/<title>[^<]*<\/title>/, '')
    .replace(/<meta\s+name="description"[^>]*>/i, '')
    .replace(/<meta\s+property="og:[^>]*>/gi, '');
}

async function renderPage(url) {
  const template = stripStaticHeadTags(readTemplate());
  const config = readConfig();
  const { html, head } = await render(url, config);
  const { headTags, htmlAttrs, bodyAttrs, bodyTagsOpen, bodyTags } = await renderHeadToString(head);

  return template
    .replace(/<html([^>]*)>/, (_match, attrs) => `<html${attrs} ${htmlAttrs}>`)
    .replace('</head>', `${headTags}</head>`)
    .replace(/<body([^>]*)>/, (_match, attrs) => `<body${attrs} ${bodyAttrs}>${bodyTagsOpen}`)
    .replace('<div id="app"></div>', `<div id="app">${html}</div>`)
    .replace('</body>', `${bodyTags}</body>`);
}

// Fail open: a content page should still render its (client-hydrated) shell
// if SSR breaks, rather than taking the whole route down. This must not
// itself throw — an unhandled rejection here would crash the whole process
// (Node's default since v15), taking down every other in-flight and future
// request, not just this one — and must not call writeHead a second time if
// the failure happened after headers were already sent.
function respondWithShell(res, statusCode = 200) {
  if (res.headersSent) {
    res.end();
    return;
  }
  try {
    const template = readTemplate();
    res.writeHead(statusCode, { 'Content-Type': 'text/html' });
    res.end(template);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('Failed to read the SPA shell template:', err);
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
}

createServer(async (req, res) => {
  try {
    if (!isSsrRoute(req.url)) {
      respondWithShell(res);
      return;
    }

    const page = await renderPage(req.url);
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(page);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`SSR render failed for ${req.url}:`, err);
    respondWithShell(res);
  }
}).listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`SSR server listening on :${PORT}`);
});
