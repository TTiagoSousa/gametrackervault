// Cada saída leva o seu package.json com o "type" certo: sem isto o Node trataria o
// ESM como CommonJS (ou vice-versa), porque o package.json da raiz não diz nenhum.
import { writeFileSync } from 'node:fs';

writeFileSync('dist/cjs/package.json', JSON.stringify({ type: 'commonjs' }) + '\n');
writeFileSync('dist/esm/package.json', JSON.stringify({ type: 'module' }) + '\n');
