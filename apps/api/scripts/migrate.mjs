import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import {
  databaseUrl,
  testDatabaseUrl,
} from '../src/database/database.config.ts';

// The integration path never loads the developer's .env file.
const mode = process.argv[2];
if (!['--development', '--test', '--verify-development'].includes(mode)) {
  throw new Error('Choose --development, --test or --verify-development');
}
let pool;
try {
  const isTest = mode !== '--development';
  if (!isTest && !process.env.DATABASE_URL) {
    const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
    if (existsSync(envFile)) loadEnvFile(envFile);
  }
  const expectedDatabase =
    mode === '--verify-development'
      ? 'specbridge_dev_verify'
      : 'specbridge_test';
  const connectionString = isTest
    ? testDatabaseUrl(process.env.TEST_DATABASE_URL, expectedDatabase)
    : databaseUrl(process.env.DATABASE_URL);
  pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 5000 });
  pool.on('error', () => {
    console.error('Migration connection failed');
    process.exitCode = 1;
  });
  if (isTest) {
    const result = await pool.query(
      'SELECT current_database() AS name, current_user AS role',
    );
    if (
      result.rows[0].name !== expectedDatabase ||
      result.rows[0].role !== 'specbridge_test'
    ) {
      throw new Error('Unexpected test database identity');
    }
  }
  await migrate(drizzle(pool), {
    migrationsFolder: fileURLToPath(new URL('../drizzle', import.meta.url)),
  });
  console.log('Database migrations applied successfully');
} catch {
  // Driver errors can contain credentials, SQL parameters or business content.
  console.error(
    'Migration failed; check the target configuration and reviewed SQL locally',
  );
  process.exitCode = 1;
} finally {
  await pool?.end();
}
