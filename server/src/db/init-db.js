import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import crypto from 'crypto';

// Initialize database and required directories
async function initDB() {
  dotenv.config();
  
  console.log('Starting database initialization check...');
  
  // Default connection for initial connection (postgres)
  const initialPool = new Pool({
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: 'postgres' // Connect to default postgres database first
  });

  const dbName = process.env.DB_NAME || 'default-db';
  
  try {
    // First, check if our target database exists
    const client = await initialPool.connect();
    try {
      console.log(`Checking if database '${dbName}' exists...`);
      const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
      
      if (result.rowCount === 0) {
        console.log(`Database '${dbName}' does not exist. Creating...`);
        // Need to use template1 as you cannot create a DB while connected to it
        await client.query(`CREATE DATABASE ${dbName}`);
        console.log(`Database '${dbName}' created successfully.`);
      } else {
        console.log(`Database '${dbName}' already exists.`);
      }
    } finally {
      client.release();
    }
    
    // Now connect to the target database to initialize schema
    const targetPool = new Pool({
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      database: dbName
    });
    
    const targetClient = await targetPool.connect();
    try {
      console.log(`Connected to database '${dbName}'. Initializing schema...`);
      
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
        const sqlPath = new URL('./init.sql', import.meta.url).pathname;
        const sql = readFileSync(sqlPath, 'utf8');
        await targetClient.query(sql);
        console.log('Schema initialized successfully.');
      } else {
        console.log('Tables already exist. Skipping schema initialization.');
      }
      
      // Setup attachments directory in server root
      const serverRoot = new URL('../../', import.meta.url).pathname;
      const attachmentsPath = join(serverRoot, 'attachments');
      
      if (!existsSync(attachmentsPath)) {
        console.log('Creating attachments directory...');
        mkdirSync(attachmentsPath, { recursive: true });
        writeFileSync(join(attachmentsPath, '.gitkeep'), '');
        console.log('Attachments directory created at server root.');
      } else {
        console.log('Attachments directory already exists.');
      }
      
      // Generate JWT secret and master signup key if not already set
      if (!process.env.JWT_SECRET || !process.env.MASTER_SIGNUP_KEY) {
        console.log('Generating security keys...');
        const jwt_secret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
        const master_signup_key = process.env.MASTER_SIGNUP_KEY || crypto.randomBytes(32).toString('hex');
        
        console.log('Security keys generated. These should be set in your environment or .env file.');
      }
      
    } finally {
      targetClient.release();
      await targetPool.end();
    }
    
    await initialPool.end();
    console.log('Database initialization complete.');
    return true;
    
  } catch (err) {
    console.error('Error during database initialization:', err);
    return false;
  }
}

export default initDB;
