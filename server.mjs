import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderHeadToString } from '@vueuse/head';
import sirv from 'sirv';
import httpProxy from 'http-proxy';
// A build artifact (see package.json's build:server script), not a source
// file — doesn't exist, and can't be resolved by eslint, until `bun run
// build` has run. Node needs the real extension for a relative ESM import.
// eslint-disable-next-line no-restricted-imports, import/no-unresolved, import/extensions
import render from './dist/server/entry-server.mjs';

// Without a supervisor process (no nginx/PID-1 wrapper here — see the
// Dockerfile), an uncaught error anywhere takes down the *entire* server,
// not just the request that triggered it — including static assets and the
// API proxy, not only SSR. Some of these can originate outside this file's
// own try/catch blocks (e.g. a router afterEach hook that a dependency
// schedules on its own microtask, as lx-ui's flowUtils.afterEach did before
// being fixed for SSR — see that commit) despite renderPage() being awaited
// inside one. Node's default since v15 is to crash on an unhandled
// rejection; log and keep serving instead, matching how a real reverse
// proxy in front of this would isolate one bad request from everyone else's.
process.on('unhandledRejection', (reason) => {
  // eslint-disable-next-line no-console
  console.error('Unhandled promise rejection (server stays up):', reason);
});
process.on('uncaughtException', (err) => {
  // eslint-disable-next-line no-console
  console.error('Uncaught exception (server stays up):', err);
});

const PORT = process.env.PORT || 8080;
const CLIENT_DIR = fileURLToPath(new URL('./dist/client', import.meta.url));
const TEMPLATE_PATH = fileURLToPath(new URL('./dist/client/index.html', import.meta.url));

const SECURITY_HEADERS = {
  'X-XSS-Protection': '1; mode=block',
  'X-Frame-Options': 'Deny',
  'X-Content-Type-Options': 'nosniff',
  // eslint-disable-next-line quotes -- the value itself needs literal single quotes
  'Feature-Policy': "autoplay 'none';",
};

// Hashed filenames under /assets/* are safe to cache forever; sirv also
// handles ETags and range requests for us. No on-the-fly gzip/brotli here —
// the build doesn't emit precompressed files, and at this app's traffic
// volume it isn't worth adding; revisit if that changes.
const serveStatic = sirv(CLIENT_DIR, { maxAge: 31536000, immutable: true, etag: true });

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

function isSsrRoute(path) {
  return SSR_ROUTE_PATTERNS.some((pattern) => pattern.test(path));
}

// A request "looks like" a static asset if its last path segment has a file
// extension and it isn't index.html (which is templated per-request below,
// never served as a plain file) — everything else is a document route.
function looksLikeStaticAsset(path) {
  return path !== '/' && path !== '/index.html' && /\.[a-zA-Z0-9]+$/.test(path);
}

// config mirrors window.config from index.html — read directly from the same
// env vars rather than parsing the template, since this is what actually
// drives the Vue app's own logic (createLx options, router base, canonical
// URLs), not just what gets displayed.
function readConfig() {
  return {
    publicUrl: process.env.PUBLIC_URL || '/',
    authUrl: process.env.AUTH_URL || '',
    authEnabled: process.env.AUTH_ENABLED === 'true',
    environment: process.env.ENVIRONMENT || 'production',
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'lv',
    gtagEnabled: false, // SSR never fires analytics — see SongView's loadSong()
    gtagId: null,
    // Reuses the exact env var the API proxy below already uses — the
    // internal portal-api URL is the same whether this request came in as a
    // browser API call or this process rendering a page server-side. Falls
    // back to SERVICE_URL/'/api' only for local/manual runs where
    // API_V2_URL isn't set, which won't resolve from inside Node the way it
    // does from a browser, but keeps this from crashing outright.
    serviceUrl: process.env.API_V2_URL || process.env.SERVICE_URL || '/api',
  };
}

// index.html ships with the same {{TOKEN}} placeholders it always has (see
// vite.config.mjs's getEnvVariables) — this replaces docker/30-envsubst-
// content.sh's job of substituting them, just per-request in JS instead of
// once via sed at container startup, since this process now owns every
// document response instead of nginx serving a pre-rewritten static file.
function injectRuntimeConfig(template) {
  const substitutions = {
    '{{PUBLIC_URL}}': process.env.PUBLIC_URL || '',
    '{{APP_NAME}}': process.env.APP_NAME || 'Akordi',
    '{{APP_TITLE}}': process.env.APP_TITLE || 'Akordi',
    '{{APP_DESCRIPTION}}': process.env.APP_DESCRIPTION || '',
    '{{AUTH_URL}}': process.env.AUTH_URL || '',
    '{{AUTH_ENABLED}}': process.env.AUTH_ENABLED || 'false',
    '{{DEFAULT_LANGUAGE}}': process.env.DEFAULT_LANGUAGE || 'lv',
    '{{ENVIRONMENT}}': process.env.ENVIRONMENT || 'production',
    '{{GTAG_ENABLED}}': process.env.GTAG_ENABLED || 'false',
    '{{GTAG_ID}}': process.env.GTAG_ID || '',
    '{{SERVICE_URL}}': process.env.SERVICE_URL || '/api',
  };
  return Object.entries(substitutions).reduce(
    (html, [token, value]) => html.split(token).join(value),
    template
  );
}

function readTemplate() {
  // Re-read per request — the cost is negligible at this traffic volume and
  // it avoids ever serving a stale template after a deploy that replaces
  // files without restarting this process.
  return injectRuntimeConfig(readFileSync(TEMPLATE_PATH, 'utf-8'));
}

// The static template's own <title>/description/og: tags exist for routes
// this process doesn't server-render. For an SSR'd route, useHead()'s tags
// must fully replace them — appending headTags after them would leave two
// <title> elements, and per spec a browser (and most crawlers) use the
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

const apiProxy = httpProxy.createProxyServer({ changeOrigin: true });
apiProxy.on('error', (err, req, res) => {
  // eslint-disable-next-line no-console
  console.error(`API proxy error for ${req.url}:`, err);
  if (!res.headersSent) res.writeHead(502, { 'Content-Type': 'text/plain' });
  res.end('Bad Gateway');
});

function proxyTargetFor(path) {
  if (path.startsWith('/api/v2/admin')) return process.env.API_V2_ADMIN_URL;
  if (path.startsWith('/api/v2')) return process.env.API_V2_URL;
  return null;
}

const server = createServer(async (req, res) => {
  Object.entries(SECURITY_HEADERS).forEach(([key, value]) => res.setHeader(key, value));

  const path = req.url.split('?')[0];

  if (path === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('healthy\n');
    return;
  }

  const target = proxyTargetFor(path);
  if (target) {
    apiProxy.web(req, res, { target });
    return;
  }

  if (looksLikeStaticAsset(path)) {
    serveStatic(req, res);
    return;
  }

  // Everything below is a document request: match nginx's old
  // no-store Cache-Control for `location /` (never cache the shell/app
  // shell itself, only the hashed assets above).
  res.setHeader(
    'Cache-Control',
    'no-store, no-transform, must-revalidate, no-cache, max-age=0, private'
  );

  try {
    if (!isSsrRoute(path)) {
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
});

// WebSocket/upgrade passthrough for the API proxy — matches the old nginx
// config's Upgrade/Connection headers on /api/v2*.
server.on('upgrade', (req, socket, head) => {
  const path = req.url.split('?')[0];
  const target = proxyTargetFor(path);
  if (!target) {
    socket.destroy();
    return;
  }
  apiProxy.ws(req, socket, head, { target });
});

server.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on :${PORT}`);
});
