import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { defineConfig } from 'prisma/config';

// Node 24 can load the ignored root .env without adding a dotenv dependency.
// No URL is required for schema validation, client generation, or schema diff.
if (existsSync('.env')) {
  loadEnvFile('.env');
}

export default defineConfig({
  schema: 'database/prisma/schema.prisma',
  migrations: {
    path: 'database/prisma/migrations',
  },
  datasource: {
    // Prisma CLI operations use only the migrator account. Runtime DATABASE_URL
    // is intentionally not a fallback, preventing migrations as the app role.
    url: process.env.MIGRATION_DATABASE_URL ?? '',
  },
});
