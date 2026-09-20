import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants as zlibConstants, gzipSync } from 'node:zlib';
import { renderHeadToString } from '@vueuse/head';
import sirv from 'sirv';
import httpProxy from 'http-proxy';
// A build artifact (see package.json's build:server script) — doesn't exist
// until `bun run build` has run, so eslint can't resolve it.
// eslint-disable-next-line no-restricted-imports, import/no-unresolved, import/extensions
import render from './dist/server/entry-server.mjs';

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

// gzip/brotli: serve the .gz/.br siblings scripts/precompress-assets.mjs
// writes at build time (the old nginx config's `gzip_static on`). sirv picks
// the sibling from Accept-Encoding and sets Content-Encoding, Content-Length
// and ETag for that representation plus Vary: Accept-Encoding; a client
// that accepts neither still gets the raw file.
const serveStatic = sirv(CLIENT_DIR, {
  maxAge: 31536000,
  immutable: true,
  etag: true,
  gzip: true,
  brotli: true,
});

// On-the-fly compression for the documents this process generates itself
// (the SSR'd page and the SPA shell) — those can't be precompressed since
// they're templated per request. Static assets are handled by sirv above,
// and the API proxy is left alone: portal-api decides its own encoding.
//
// Brotli at its default quality (11) is far too slow to run per request;
// 5 is in the range CDNs use for dynamic content (~gzip speed, smaller).
const BROTLI_DYNAMIC_QUALITY = 5;
// Below this, headers dominate and compressing just burns CPU.
const COMPRESS_MIN_BYTES = 1024;

// The encodings we can produce that Accept-Encoding allows, best first,
// honouring q-values (`gzip;q=0` means "not gzip") and `*`.
function acceptedEncodings(req) {
  const header = req.headers['accept-encoding'];
  if (!header) return [];
  const weights = new Map();
  header.split(',').forEach((part) => {
    const [name, ...params] = part.trim().toLowerCase().split(';');
    if (!name) return;
    const q = params.map((param) => param.trim()).find((param) => param.startsWith('q='));
    const weight = q ? Number.parseFloat(q.slice(2)) : 1;
    weights.set(name, Number.isNaN(weight) ? 0 : weight);
  });
  const allows = (name) => {
    if (weights.has(name)) return weights.get(name) > 0;
    return weights.has('*') && weights.get('*') > 0;
  };
  return ['br', 'gzip'].filter(allows);
}

// Picks 'br', 'gzip' or null for a response we compress ourselves.
function pickEncoding(req) {
  return acceptedEncodings(req)[0] || null;
}

function compress(encoding, body) {
  if (encoding === 'br') {
    return brotliCompressSync(body, {
      params: {
        [zlibConstants.BROTLI_PARAM_QUALITY]: BROTLI_DYNAMIC_QUALITY,
        [zlibConstants.BROTLI_PARAM_SIZE_HINT]: body.length,
      },
    });
  }
  return gzipSync(body);
}

// Sends an HTML document, compressed when the client accepts it. Always
// sets Vary so any cache in between keys on Accept-Encoding, even when the
// response went out uncompressed. Callers' Cache-Control is left as-is.
function sendHtml(req, res, statusCode, html) {
  let body = Buffer.from(html, 'utf-8');
  const headers = {
    'Content-Type': 'text/html; charset=utf-8',
    Vary: 'Accept-Encoding',
  };
  const encoding = body.length >= COMPRESS_MIN_BYTES ? pickEncoding(req) : null;
  if (encoding) {
    body = compress(encoding, body);
    headers['Content-Encoding'] = encoding;
  }
  headers['Content-Length'] = body.length;
  res.writeHead(statusCode, headers);
  res.end(body);
}

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

// Fail open: render its (client-hydrated) shell rather than taking the
// route down. Must not itself throw (see the crash note above) or call
// writeHead a second time if headers were already sent.
function respondWithShell(req, res, statusCode = 200) {
  if (res.headersSent) {
    res.end();
    return;
  }
  try {
    sendHtml(req, res, statusCode, readTemplate());
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
    // sirv only substring-matches Accept-Encoding (so `gzip;q=0` would still
    // get gzip) — hand it just the encodings the client actually allows.
    req.headers['accept-encoding'] = acceptedEncodings(req).join(', ');
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
      respondWithShell(req, res);
      return;
    }
    const page = await renderPage(req.url);
    sendHtml(req, res, 200, page);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`SSR render failed for ${req.url}:`, err);
    respondWithShell(req, res);
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
