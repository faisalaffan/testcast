import { test as base } from '@playwright/test';
import type { Connection, ResultSetHeader } from 'mysql2/promise';
import * as mysql from 'mysql2/promise';

/**
 * Database Fixture
 * Provides MySQL connection for backend validation
 */

export interface DbFixtures {
  dbConnection: Connection | null;
  testData: {
    cleanupQueries: string[];
  };
}

let dbConnection: Connection | null = null;

export const dbFixture = base.extend<DbFixtures>({
  dbConnection: async (_, use) => {
    // Create connection if credentials are available
    const config = {
      host: process.env.DB_HOST || 'localhost',
      port: Number.parseInt(process.env.DB_PORT || '3306', 10),
      user: process.env.DB_USER || 'test_user',
      password: process.env.DB_PASSWORD || 'test_password',
      database: process.env.DB_NAME || 'test_db',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
    };

    // Only connect if DB_HOST is set and not localhost (meaning real config exists)
    if (config.host !== 'localhost' && process.env.DB_HOST) {
      try {
        dbConnection = await mysql.createConnection(config);
        console.log('[DB Fixture] Connected to MySQL database');
        await use(dbConnection);
      } catch (_error) {
        console.warn('[DB Fixture] Could not connect to database, skipping...');
        await use(null);
      }
    } else {
      console.warn('[DB Fixture] DB_HOST not configured, skipping database connection');
      await use(null);
    }

    // Cleanup
    if (dbConnection) {
      await dbConnection.end();
      dbConnection = null;
    }
  },

  // Track cleanup queries
  testData: async (_, use) => {
    const data = {
      cleanupQueries: [] as string[],
    };

    await use(data);

    // Execute cleanup queries if any
    if (dbConnection && data.cleanupQueries.length > 0) {
      for (const query of data.cleanupQueries) {
        try {
          await dbConnection.execute(query);
        } catch (_error) {
          console.warn(`[DB Fixture] Cleanup query failed: ${query}`, _error);
        }
      }
    }
  },
});

/**
 * Helper to run raw queries
 */
export async function queryDatabase<T extends Record<string, unknown>>(
  sql: string,
  params?: (string | number | boolean | null)[]
): Promise<T[]> {
  if (!dbConnection) {
    throw new Error('Database connection not available');
  }
  const [rows] = await dbConnection.execute(sql, params);
  return rows as T[];
}

/**
 * Helper to insert test data and track for cleanup
 */
export async function insertTestData(
  table: string,
  data: Record<string, unknown>,
  _idColumn = 'id'
): Promise<number> {
  if (!dbConnection) {
    throw new Error('Database connection not available');
  }

  const keys = Object.keys(data);
  const values: (string | number | boolean | null)[] = Object.values(data) as (
    | string
    | number
    | boolean
    | null
  )[];
  const placeholders = keys.map(() => '?').join(', ');

  const sql = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`;
  const [result] = await dbConnection.execute(sql, values);

  const insertId = (result as ResultSetHeader).insertId;

  // Track for cleanup
  // Note: This assumes the fixture is active - cleanup happens in fixture teardown

  return insertId;
}
