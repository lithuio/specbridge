import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { databaseUrl } from './database.config.js';
import * as schema from './schema/index.js';

export type Database = NodePgDatabase<typeof schema>;
export type DatabaseTransaction = Parameters<
  Parameters<Database['transaction']>[0]
>[0];

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private pool?: Pool;
  private database?: Database;
  private closed = false;

  // Lazy initialization preserves the existing DB-independent liveness endpoint.
  get db(): Database {
    if (this.closed) throw new Error('Database service is closed');
    if (!this.database) {
      this.pool = new Pool({
        connectionString: databaseUrl(process.env.DATABASE_URL),
        max: 10,
        connectionTimeoutMillis: 5000,
        idleTimeoutMillis: 30000,
      });
      this.pool.on('error', () =>
        this.logger.error('Database pool connection error'),
      );
      this.database = drizzle(this.pool, { schema, logger: false });
    }
    return this.database;
  }

  transaction<T>(work: (tx: DatabaseTransaction) => Promise<T>): Promise<T> {
    return this.db.transaction(work);
  }

  async onModuleDestroy(): Promise<void> {
    this.closed = true;
    await this.pool?.end();
  }
}
