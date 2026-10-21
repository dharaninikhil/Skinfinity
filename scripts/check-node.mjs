#!/usr/bin/env node
/**
 * Runtime guard for the test suite.
 *
 * `jsdom` (used by the render tests in src/App.test.tsx) depends on `undici`,
 * which reads `zlib.createZstdDecompress` at module load time. That API only
 * exists on recent Node releases. On an older runtime the import throws
 *
 *   TypeError: Cannot read properties of undefined (reading 'bind')
 *     at node_modules/undici/lib/interceptor/decompress.js
 *
 * which Vitest reports as an *unhandled* error: the jsdom worker dies before a
 * single test runs, so the output looks like "5 files passed" plus a mystery
 * stack trace from a dependency. Nothing in the app is broken — the runtime is.
 *
 * npm only warns about `engines`, it never fails, so this checks the actual
 * capability and exits with an actionable message instead.
 */

import zlib from 'node:zlib';

const SUPPORTED = '^22.22.2 || ^24.15.0 || >=26.0.0';
const REQUIRED_BY = 'jsdom → undici (zstd decompression)';

if (typeof zlib.createZstdDecompress !== 'function') {
  const lines = [
    '',
    `✖ Node ${process.version} cannot run the jsdom render tests.`,
    '',
    `  ${REQUIRED_BY} needs zlib.createZstdDecompress, which is missing here.`,
    `  Supported versions: ${SUPPORTED}`,
    '',
    '  Fix: nvm use   (the repo ships a .nvmrc), or install Node 22 LTS.',
    '  https://nodejs.org/en/download',
    '',
  ];
  console.error(lines.join('\n'));
  process.exit(1);
}

process.exit(0);
