import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
dotenv.config({ quiet: true });

// Create a singleton pool instance to reuse connections
let _pool = null;

/**
 * Get the database pool instance - singleton pattern
 * @returns {Pool} The database connection pool
 */
export function getPool() {
  if (!_pool) {
    _pool = new Pool({
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME || 'default-db',
      // Adding max and idle timeout settings for better resource management
      max: parseInt(process.env.DB_MAX_CONNECTIONS || '20'),
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });

    // Add event listeners for connection issues
    _pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
    });
  }
  return _pool;
}

/**
 * Execute a query with parameters
 * @param {string} text - SQL query text
 * @param {Array} params - Query parameters
 * @returns {Promise} Query result
 */
export async function query(text, params = []) {
  const pool = getPool();
  
  try {
    const response = await pool.query(text, params);
    // if (process.env.NODE_ENV !== 'production') {
    //   console.log('Executing query:', text, 'with params:', params, 'response:', response);
    // }
    return response;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

/**
 * Get a client from the pool for executing multiple queries in a transaction
 * @returns {Promise<PoolClient>} Database client
 */
export async function getClient() {
  const pool = getPool();
  const client = await pool.connect();

  // Add extra functionality for testing - track query history
  const originalQuery = client.query;
  const queryLog = [];

  // Only monkey patch in test environment
  if (process.env.NODE_ENV === 'test') {
    client.query = (...args) => {
      queryLog.push(args);
      return originalQuery.apply(client, args);
    };
    client.getQueryLog = () => queryLog;
  }

  return client;
}

/**
 * Close all pool connections - useful for tests and graceful shutdown
 */
export async function closePool() {
  if (_pool) {
    await _pool.end();
    _pool = null;
  }
}

export default {
  query,
  getClient,
  getPool,
  closePool
};
