import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATASET_SEED, generateClaims, toCsv } from './generator.ts';

const outPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'data', 'claims.csv');
mkdirSync(dirname(outPath), { recursive: true });

const claims = generateClaims(DATASET_SEED);
writeFileSync(outPath, toCsv(claims), 'utf8');
console.log(`Wrote ${claims.length} claims to ${outPath}`);
