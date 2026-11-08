import { defineConfig } from 'vitest/config';
import { testDatabaseUrl } from './src/database/database.config.js';
testDatabaseUrl(process.env.TEST_DATABASE_URL);
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    include: ['test/auth/**/*.e2e-spec.ts'],
    fileParallelism: false,
    testTimeout: 15000,
    hookTimeout: 30000,
  },
});
