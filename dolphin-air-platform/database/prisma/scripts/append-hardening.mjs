import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const migrationPath = resolve('database/prisma/migrations/0001_identity_foundation/migration.sql');
const hardeningPath = resolve('database/prisma/hardening/identity-foundation.sql');
const beginMarker = '-- BEGIN DOLPHIN AIR IDENTITY HARDENING';
const endMarker = '-- END DOLPHIN AIR IDENTITY HARDENING';
const migration = await readFile(migrationPath, 'utf8');
const hardening = (await readFile(hardeningPath, 'utf8')).trim();
const begin = migration.indexOf(beginMarker);
const end = migration.indexOf(endMarker);

if ((begin === -1) !== (end === -1) || (begin !== -1 && end < begin)) {
  throw new Error('Migration hardening markers are incomplete or out of order.');
}

const block = `${beginMarker}\n${hardening}\n${endMarker}`;
const finalized = begin === -1
  ? `${migration.trimEnd()}\n\n${block}\n`
  : `${migration.slice(0, begin)}${block}${migration.slice(end + endMarker.length)}`;

await writeFile(migrationPath, finalized, 'utf8');
process.stdout.write('Initial identity migration hardening applied to generated SQL.\n');
