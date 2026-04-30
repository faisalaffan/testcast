#!/usr/bin/env tsx
/**
 * Test Database Connection Script
 * Tests MySQL connection using fixtures/database.fixture.ts
 */

import * as path from 'node:path';
import * as dotenv from 'dotenv';

// Load environment
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function testConnection() {
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: Number.parseInt(process.env.DB_PORT || '3306', 10),
    user: process.env.DB_USER || 'test_user',
    password: process.env.DB_PASSWORD || 'test_password',
    database: process.env.DB_NAME || 'test_db',
  };

  console.log('🔌 Testing MySQL connection...');
  console.log(`   Host: ${config.host}:${config.port}`);
  console.log(`   Database: ${config.database}`);

  if (config.host === 'localhost') {
    console.log('⚠️  DB_HOST is localhost - skipping connection test');
    console.log('   Set DB_HOST in .env to test actual connection');
    return;
  }

  try {
    const mysql = await import('mysql2/promise');
    const connection = await mysql.createConnection(config);

    console.log('✅ Connected to MySQL successfully!');

    // Test query
    const [rows] = await connection.execute('SELECT 1 as test');
    console.log('   Query test:', rows);

    await connection.end();
    console.log('🔌 Connection closed');
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

testConnection();
