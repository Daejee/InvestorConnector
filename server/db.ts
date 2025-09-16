import { Pool } from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 30000,
});

// Add proper error handling to prevent uncaught exceptions
pool.on('error', (err) => {
  console.error('Database pool error:', err);
  // Don't exit the process, just log the error
  // The pool will automatically reconnect on the next query
});

pool.on('connect', () => {
  console.log('Database pool connected');
});

pool.on('remove', () => {
  console.log('Database connection removed from pool');
});

export const db = drizzle({ client: pool, schema });