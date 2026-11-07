import { databaseUrl, testDatabaseUrl } from './database.config.js';

const testUrl =
  'postgresql://specbridge_test:local_test_only@127.0.0.1:5434/specbridge_test';

describe('database configuration safety', () => {
  it('requires an explicit URL rather than using pg connection defaults', () => {
    expect(() => databaseUrl(undefined)).toThrow('DATABASE_URL is required');
    expect(() => testDatabaseUrl(undefined)).toThrow('TEST_DATABASE_URL');
  });

  it.each([
    'https://user:secret@example.com/db',
    'postgresql://user:secret@localhost/',
    'postgresql://user:secret@localhost/db?options=-csearch_path=other',
    'secret-not-a-url',
  ])(
    'rejects malformed/unsupported connections without disclosing them',
    (url) => {
      let message = '';
      try {
        databaseUrl(url);
      } catch (error) {
        message = (error as Error).message;
      }
      expect(message).toContain('Invalid database URL');
      expect(message).not.toContain('secret');
    },
  );

  it('accepts only explicitly named databases on the isolated test instance', () => {
    expect(testDatabaseUrl(testUrl)).toBe(testUrl);
    const verificationUrl = testUrl.replace(
      ':5434/specbridge_test',
      ':5434/specbridge_dev_verify',
    );
    expect(testDatabaseUrl(verificationUrl, 'specbridge_dev_verify')).toBe(
      verificationUrl,
    );
  });

  it.each([
    testUrl.replace(':5434/', ':5433/'),
    testUrl.replace(':5434/specbridge_test', ':5434/specbridge'),
    testUrl.replace('specbridge_test:', 'specbridge:'),
    testUrl.replace('127.0.0.1', 'production.example.com'),
    `${testUrl}?host=production.example.com`,
  ])('rejects unintended test targets', (url) => {
    expect(() => testDatabaseUrl(url)).toThrow();
  });
});
