import { Test } from '@nestjs/testing';
import { Pool } from 'pg';
import { DatabaseModule } from './database.module.js';
import { DatabaseService } from './database.service.js';

describe('DatabaseModule lifecycle', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('can initialize and close without a database URL or connection', async () => {
    vi.stubEnv('DATABASE_URL', undefined);
    const connect = vi.spyOn(Pool.prototype, 'connect');
    const module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();
    await module.init();
    expect(connect).not.toHaveBeenCalled();
    expect(() => module.get(DatabaseService).db).toThrow(
      'DATABASE_URL is required',
    );
    await module.close();
    expect(connect).not.toHaveBeenCalled();
  });

  it('reuses a lazy database instance and closes its pool on shutdown', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@127.0.0.1:1/unused');
    const connect = vi.spyOn(Pool.prototype, 'connect');
    const end = vi.spyOn(Pool.prototype, 'end');
    const module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();
    const service = module.get(DatabaseService);
    expect(service.db).toBe(service.db);
    expect(connect).not.toHaveBeenCalled();
    await module.close();
    expect(end).toHaveBeenCalledOnce();
    expect(() => service.db).toThrow('closed');
  });

  it('propagates a first-query failure and still closes the pool', async () => {
    vi.stubEnv('DATABASE_URL', 'postgresql://unused:unused@127.0.0.1:1/unused');
    vi.spyOn(Pool.prototype, 'query').mockImplementationOnce(() =>
      Promise.reject(new Error('Simulated connection failure')),
    );
    const end = vi.spyOn(Pool.prototype, 'end');
    const module = await Test.createTestingModule({
      imports: [DatabaseModule],
    }).compile();
    try {
      await expect(
        module.get(DatabaseService).db.execute('SELECT 1'),
      ).rejects.toThrow();
    } finally {
      await module.close();
    }
    expect(end).toHaveBeenCalledOnce();
  });
});
