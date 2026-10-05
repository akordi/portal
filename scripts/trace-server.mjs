// Copies the node_modules files server.mjs and the SSR bundle load into
// dist/runtime, so the image ships those instead of a full production install.
import { cpSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { nodeFileTrace } from '@vercel/nft';

const root = join(import.meta.dirname, '..');
const outDir = join(root, 'dist/runtime');

const { fileList } = await nodeFileTrace([join(root, 'server.mjs')], {
  base: root,
  conditions: ['bun', 'node'],
});

rmSync(outDir, { recursive: true, force: true });
const files = [...fileList].filter((file) => file.startsWith('node_modules/'));
files.forEach((file) => {
  cpSync(join(root, file), join(outDir, file), { verbatimSymlinks: true });
});
console.log(`Traced ${files.length} node_modules files into ${outDir}`);
