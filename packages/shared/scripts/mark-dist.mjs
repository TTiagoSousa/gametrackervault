// Each output gets its own package.json with the right "type": without it Node would treat
// ESM as CommonJS (or vice versa), because the root package.json doesn't specify one.
import { writeFileSync } from 'node:fs';

writeFileSync('dist/cjs/package.json', JSON.stringify({ type: 'commonjs' }) + '\n');
writeFileSync('dist/esm/package.json', JSON.stringify({ type: 'module' }) + '\n');
