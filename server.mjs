import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { renderHeadToString } from '@vueuse/head';
import sirv from 'sirv';
import httpProxy from 'http-proxy';
// A build artifact (see package.json's build:server script) — doesn't exist
// until `bun run build` has run, so eslint can't resolve it.
// eslint-disable-next-line no-restricted-imports, import/no-unresolved, import/extensions
import render, { isKnownRoute } from './dist/server/entry-server.mjs';
// eslint-disable-next-line no-restricted-imports
import htmlLang from './src/utils/htmlLang.js';

// No supervisor process here (no nginx/PID-1 wrapper — see Dockerfile), so
// an uncaught error anywhere takes down the entire server, not just the
// request that caused it — some errors (a dependency scheduling work on its
// own microtask) can escape this file's own try/catch even when it awaits
// the call. Log and keep serving instead of crashing.
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

// No gzip/brotli here — the build doesn't emit precompressed files, and
// isn't worth it at this app's traffic volume.
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

// index.html is templated per-request below, never served as a plain file.
function looksLikeStaticAsset(path) {
  return path !== '/' && path !== '/index.html' && /\.[a-zA-Z0-9]+$/.test(path);
}

// Mirrors window.config from index.html — read from env directly since this
// drives the Vue app's own logic (createLx, router base, canonical URLs),
// not just what gets displayed.
function readConfig() {
  return {
    publicUrl: process.env.PUBLIC_URL || '/',
    authUrl: process.env.AUTH_URL || '',
    authEnabled: process.env.AUTH_ENABLED === 'true',
    environment: process.env.ENVIRONMENT || 'production',
    defaultLanguage: process.env.DEFAULT_LANGUAGE || 'lv',
    gtagEnabled: false, // SSR never fires analytics — see SongView's loadSong()
    gtagId: null,
    // Same internal portal-api URL the API proxy below uses — falls back to
    // SERVICE_URL/'/api' for local runs where API_V2_URL isn't set.
    serviceUrl: process.env.API_V2_URL || process.env.SERVICE_URL || '/api',
  };
}

// index.html ships with {{TOKEN}} placeholders (see vite.config.mjs's
// getEnvVariables) — substituted here per-request instead of once via sed
// at container startup, since this process now owns every document
// response.
function injectRuntimeConfig(template) {
  const substitutions = {
    '{{PUBLIC_URL}}': process.env.PUBLIC_URL || '',
    '{{APP_NAME}}': process.env.APP_NAME || 'Akordi',
    '{{APP_TITLE}}': process.env.APP_TITLE || 'Akordi',
    '{{APP_DESCRIPTION}}': process.env.APP_DESCRIPTION || '',
    '{{AUTH_URL}}': process.env.AUTH_URL || '',
    '{{AUTH_ENABLED}}': process.env.AUTH_ENABLED || 'false',
    '{{DEFAULT_LANGUAGE}}': process.env.DEFAULT_LANGUAGE || 'lv',
    '{{HTML_LANG}}': htmlLang(process.env.DEFAULT_LANGUAGE),
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
  // Re-read per request to avoid ever serving a stale template after a
  // deploy replaces files without restarting this process.
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

// The template's <html> already carries lang="..." (the {{HTML_LANG}} token
// above), and App.vue's useHead() sets the same lang via htmlAttrs so the
// client keeps document.documentElement.lang in sync. Appending head's attrs
// verbatim would therefore emit two lang attributes — drop the template's
// copy for any attribute head also renders, so head's value wins once.
// One attribute per match: a name, optionally followed by a quoted or bare
// value. The value alternatives start with distinct characters (no
// overlap, so no backtracking) — Sonar flags anything more permissive.
const ATTR_PATTERN = /[^\s=]+(?:="[^"]*"|='[^']*'|=[^\s"']*)?/g;

function attrName(attr) {
  return attr.split('=')[0].toLowerCase();
}

function mergeHtmlAttrs(templateAttrs, headAttrs) {
  const headAttrList = headAttrs.match(ATTR_PATTERN) || [];
  const headNames = new Set(headAttrList.map(attrName));
  const kept = (templateAttrs.match(ATTR_PATTERN) || []).filter(
    (attr) => !headNames.has(attrName(attr))
  );
  return [...kept, ...headAttrList].map((attr) => ` ${attr}`).join('');
}

// Besides the markup, the SSR entry reports the HTTP outcome the rendered
// view asked for (see src/entry-server.js): `status` to write, or a
// router path to 301 to instead (a song requested under a wrong slug).
async function renderPage(url) {
  const template = stripStaticHeadTags(readTemplate());
  const config = readConfig();
  const { html, head, status, redirect } = await render(url, config);
  const { headTags, htmlAttrs, bodyAttrs, bodyTagsOpen, bodyTags } = await renderHeadToString(head);

  const page = template
    .replace(/<html([^>]*)>/, (_match, attrs) => `<html${mergeHtmlAttrs(attrs, htmlAttrs)}>`)
    .replace('</head>', `${headTags}</head>`)
    .replace(/<body([^>]*)>/, (_match, attrs) => `<body${attrs} ${bodyAttrs}>${bodyTagsOpen}`)
    .replace('<div id="app"></div>', `<div id="app">${html}</div>`)
    .replace('</body>', `${bodyTags}</body>`);
  return { page, status: status || 200, redirect };
}

// Absolute Location for a router path (no base, no query): PUBLIC_URL
// already carries the scheme, host and any base path, and the request's
// query string is kept.
function redirectLocation(routePath, requestUrl) {
  const publicUrl = process.env.PUBLIC_URL || '/';
  const base = publicUrl.endsWith('/') ? publicUrl : `${publicUrl}/`;
  const queryIndex = requestUrl.indexOf('?');
  const query = queryIndex === -1 ? '' : requestUrl.slice(queryIndex);
  return `${base}${routePath.replace(/^\//, '')}${query}`;
}

// Fail open: render its (client-hydrated) shell rather than taking the
// route down. Must not itself throw (see the crash note above) or call
// writeHead a second time if headers were already sent.
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

  // Document request: never cache the shell itself, only the hashed assets.
  res.setHeader(
    'Cache-Control',
    'no-store, no-transform, must-revalidate, no-cache, max-age=0, private'
  );

  try {
    if (!isSsrRoute(path)) {
      // Still the plain SPA shell, but with a real 404 for a URL the router
      // can only resolve to its catch-all notFound route.
      const known = path === '/index.html' || isKnownRoute(path, readConfig());
      respondWithShell(res, known ? 200 : 404);
      return;
    }
    const { page, status, redirect } = await renderPage(req.url);
    if (redirect && redirect !== path) {
      res.writeHead(301, { Location: redirectLocation(redirect, req.url) });
      res.end();
      return;
    }
    res.writeHead(status, { 'Content-Type': 'text/html' });
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
