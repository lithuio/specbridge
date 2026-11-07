import { defineConfig } from 'drizzle-kit';

// Generate/check are offline. Applying SQL is an explicit, separate script.
export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  strict: true,
  verbose: false,
});
