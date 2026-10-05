// Copies only the node_modules files server.mjs and the SSR bundle actually
// load into dist/runtime/node_modules, so the runtime image ships those
// instead of the full production install. Run after `bun run build`.
import { copyFileSync, lstatSync, mkdirSync, readlinkSync, rmSync, symlinkSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { nodeFileTrace } from '@vercel/nft';

const root = fileURLToPath(new URL('..', import.meta.url));
const outDir = `${root}dist/runtime`;

const { fileList, warnings } = await nodeFileTrace([`${root}server.mjs`], {
  base: root,
  // The conditions Bun resolves with (it ignores production/development).
  conditions: ['bun', 'node'],
});

// A dependency the tracer can't follow would only fail at render time, and
// server.mjs falls back to the SPA shell then — fail the build instead.
const unresolved = [...warnings].filter((w) => w.message.startsWith('Failed to resolve'));
if (unresolved.length) {
  unresolved.forEach((w) => console.error(w.message));
  process.exit(1);
}

rmSync(outDir, { recursive: true, force: true });
const modules = [...fileList].filter((file) => file.startsWith('node_modules/'));
modules.forEach((file) => {
  const target = `${outDir}/${file}`;
  mkdirSync(dirname(target), { recursive: true });
  // The tracer lists a symlinked package and the files behind it separately;
  // keep the link so both resolve as they did in the source tree.
  if (lstatSync(`${root}${file}`).isSymbolicLink()) {
    symlinkSync(readlinkSync(`${root}${file}`), target);
  } else {
    copyFileSync(`${root}${file}`, target);
  }
});
console.log(`Traced ${modules.length} node_modules files into ${outDir}`);
