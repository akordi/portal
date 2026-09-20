// Precompress the built client bundle (dist/client) into .gz and .br
// siblings, which server.mjs serves via sirv({ gzip: true, brotli: true }).
// Replaces the old nginx config's `gzip_static on` — sirv only looks for
// siblings that already exist, it never compresses on the fly.
//
// Runs as the last step of `bun run build:client`, so the Dockerfile's
// `COPY --from=build /app/dist/client` picks the siblings up unchanged.
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, extname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { brotliCompressSync, constants, gzipSync } from 'node:zlib';

const CLIENT_DIR = fileURLToPath(new URL('../dist/client', import.meta.url));

// Text-like formats plus raw TrueType/OpenType fonts (the variable IBM Plex
// .ttf is the single largest asset). png/woff2 etc. are already compressed
// and would only grow.
const COMPRESSIBLE = new Set([
  '.js',
  '.mjs',
  '.css',
  '.html',
  '.svg',
  '.json',
  '.map',
  '.txt',
  '.xml',
  '.webmanifest',
  '.ico',
  '.ttf',
  '.otf',
]);

// Below this, headers dominate and a compressed copy isn't worth the extra
// file and the extra inode lookups (same default threshold as most servers).
const MIN_SIZE = 1024;

// index.html is never served by sirv (server.mjs templates it per-request
// and serves it itself), so a static copy would only be dead weight.
const SKIP = new Set(['index.html']);

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(abs);
    else if (entry.isFile()) yield abs;
  }
}

let files = 0;
let rawTotal = 0;
let gzTotal = 0;
let brTotal = 0;

for (const abs of walk(CLIENT_DIR)) {
  const rel = relative(CLIENT_DIR, abs);
  const ext = extname(abs);
  if (!COMPRESSIBLE.has(ext) || SKIP.has(rel)) continue;
  const { size } = statSync(abs);
  if (size < MIN_SIZE) continue;

  const raw = readFileSync(abs);
  const gz = gzipSync(raw, { level: constants.Z_BEST_COMPRESSION });
  const br = brotliCompressSync(raw, {
    params: {
      [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
      [constants.BROTLI_PARAM_SIZE_HINT]: size,
    },
  });

  // Like nginx's gzip_static, only keep a sibling that actually saves bytes.
  if (gz.length < size) {
    writeFileSync(`${abs}.gz`, gz);
    gzTotal += gz.length;
  } else {
    gzTotal += size;
  }
  if (br.length < size) {
    writeFileSync(`${abs}.br`, br);
    brTotal += br.length;
  } else {
    brTotal += size;
  }
  files += 1;
  rawTotal += size;
}

const kb = (n) => `${(n / 1024).toFixed(1)} kB`;
// eslint-disable-next-line no-console
console.log(
  `precompress: ${files} files, ${kb(rawTotal)} raw -> ${kb(gzTotal)} gzip, ${kb(brTotal)} brotli`
);
