import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { readFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import isDocker from '../utils/isDocker.js';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize database and required directories
async function initDB() {
  dotenv.config();

  // Check for required environment variables
  if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_NAME) {
    console.error('Database connection details are not set in environment variables.');
    console.error('Please set DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, and DB_NAME.');
    process.exit(1);
  }
  
  // Default connection for initial connection (postgres)
  const initialPool = new Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT),
    database: 'postgres' // Connect to default postgres database first
  });

  const dbName = process.env.DB_NAME;
  
  try {
    // First, check if our target database exists
    const client = await initialPool.connect();
    try {
      const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
      
      if (result.rowCount === 0) {
        console.log(`Database '${dbName}' does not exist. Creating...`);
        await client.query(`CREATE DATABASE "${dbName}"`);
        console.log(`Database '${dbName}' created successfully.`);
      }
    } finally {
      client.release();
      await initialPool.end();
    }
    
    // Now connect to the target database to initialize schema
    const targetPool = new Pool({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT),
      database: dbName
    });
    
    const targetClient = await targetPool.connect();
    try {
      console.log(`Using database '${dbName}'.`);
      
      // Check if tables exist by querying for the 'users' table
      const tableCheck = await targetClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'users'
        );
      `);
      
      // If tables don't exist, initialize from SQL script
      if (!tableCheck.rows[0].exists) {
        console.log('Tables do not exist. Creating schema from init.sql...');
        const sqlPath = join(__dirname, 'init.sql');
        const sql = readFileSync(sqlPath, 'utf8');
        await targetClient.query(sql);
        console.log('Schema initialized successfully.');
      }

      const attachmentsPath = isDocker()
        ? '/attachments'
        : join(__dirname, '../../attachments');
      
      if (!existsSync(attachmentsPath)) {
        mkdirSync(attachmentsPath, { recursive: true });
      }
      console.log(`Using attachments directory at: ${attachmentsPath}`);
      
      
      // Check for system_settings table
      const settingsTableCheck = await targetClient.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'system_settings'
        );
      `);
      
      // Create the system_settings table if it doesn't exist
      if (!settingsTableCheck.rows[0].exists) {
        console.log('Creating system_settings table...');
        await targetClient.query(`
          CREATE TABLE system_settings (
            key VARCHAR(255) PRIMARY KEY,
            value TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      }
      
      // Handle JWT_SECRET - use from env or generate and store in DB
      const jwtSecretResult = await targetClient.query(
        'SELECT value FROM system_settings WHERE key = $1',
        ['JWT_SECRET']
      );
      
      let jwtSecret = process.env.JWT_SECRET;
      
      if (!jwtSecret) {
        if (jwtSecretResult.rows.length > 0) {
          console.log('Using JWT_SECRET from database');
        } else {
          // Generate new one and store in database
          jwtSecret = crypto.randomBytes(32).toString('hex');
          await targetClient.query(
            'INSERT INTO system_settings (key, value) VALUES ($1, $2)',
            ['JWT_SECRET', jwtSecret]
          );
          console.log('Generated and stored new JWT_SECRET in database');
        }
        
        // Add warning about setting it in env for better security
        console.log('Consider setting JWT_SECRET in environment variables for better security');
      } else if (jwtSecretResult.rows.length === 0) {
        // Store the env var in DB for backup purposes
        await targetClient.query(
          'INSERT INTO system_settings (key, value) VALUES ($1, $2)',
          ['JWT_SECRET', jwtSecret]
        );
        console.log('Stored environment JWT_SECRET in database as backup');
      }
      
      // Handle MASTER_SIGNUP_KEY - use from env or generate and store in DB
      const masterKeyResult = await targetClient.query(
        'SELECT value FROM system_settings WHERE key = $1',
        ['MASTER_SIGNUP_KEY']
      );
      
      let masterSignupKey = process.env.MASTER_SIGNUP_KEY;
      
      if (!masterSignupKey) {
        if (masterKeyResult.rows.length > 0) {
          // Get from database
          masterSignupKey = masterKeyResult.rows[0].value;
          console.log('Using MASTER_SIGNUP_KEY from database');
        } else {
          // Generate new one and store in database
          masterSignupKey = crypto.randomBytes(16).toString('hex');
          await targetClient.query(
            'INSERT INTO system_settings (key, value) VALUES ($1, $2)',
            ['MASTER_SIGNUP_KEY', masterSignupKey]
          );
          console.log('Generated and stored new MASTER_SIGNUP_KEY in database');
        }
        
        // Add warning about setting it in env for better security
        console.log('Consider setting MASTER_SIGNUP_KEY in environment variables for better security');
      } else if (masterKeyResult.rows.length === 0) {
        // Store the env var in DB for backup purposes
        await targetClient.query(
          'INSERT INTO system_settings (key, value) VALUES ($1, $2)',
          ['MASTER_SIGNUP_KEY', masterSignupKey]
        );
        console.log('Stored environment MASTER_SIGNUP_KEY in database as backup');
      }
      console.log(`Master signup key is: ${masterSignupKey}`);
    } finally {
      targetClient.release();
      await targetPool.end();
    }    
  } catch (error) {
    console.error('Error during database initialization:', error);
    process.exit(1);
  }
}

export default initDB;
