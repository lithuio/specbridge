/** Never include connection input or URL parser errors in diagnostics. */
export function databaseUrl(value: string | undefined): string {
  if (!value) throw new Error('DATABASE_URL is required for database access');
  try {
    const url = new URL(value);
    if (
      !['postgres:', 'postgresql:'].includes(url.protocol) ||
      !url.hostname ||
      !url.username ||
      !url.pathname ||
      url.pathname === '/' ||
      url.hash ||
      url.search
    ) {
      throw new Error('Invalid connection URL');
    }
    return value;
  } catch {
    throw new Error(
      'Invalid database URL; expected a PostgreSQL URL without query parameters',
    );
  }
}

/** This is intentionally narrower than development/runtime configuration. */
export function testDatabaseUrl(
  value: string | undefined,
  database = 'specbridge_test',
): string {
  if (!value)
    throw new Error('TEST_DATABASE_URL must be explicitly configured');
  const valid = databaseUrl(value);
  const url = new URL(valid);
  if (
    !['specbridge_test', 'specbridge_dev_verify'].includes(database) ||
    !['localhost', '127.0.0.1'].includes(url.hostname) ||
    url.port !== '5434' ||
    url.username !== 'specbridge_test' ||
    url.pathname !== `/${database}`
  ) {
    throw new Error(
      'Refusing database access: expected the isolated local/CI test instance',
    );
  }
  return valid;
}
