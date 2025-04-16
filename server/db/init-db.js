import { readFileSync, existsSync, rmSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';
import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: 'db/.env' });

const __dirname = new URL('.', import.meta.url).pathname;

// Check if the required environment variables are set
if (!process.env.DB_USER || !process.env.DB_PASSWORD || !process.env.DB_HOST || !process.env.DB_PORT || !process.env.DB_NAME) {
  console.error('Missing required environment variables: DB_USER, DB_PASSWORD, DB_HOST, DB_PORT, DB_NAME');
  process.exit(1);
}

console.log(`DB_USER=${process.env.DB_USER}`);
console.log(`DB_PASSWORD=${process.env.DB_PASSWORD}`);
console.log(`DB_HOST=${process.env.DB_HOST}`);
console.log(`DB_PORT=${process.env.DB_PORT}`);
console.log(`DB_NAME=${process.env.DB_NAME}`);

// Create connection pool
const pool = new Pool({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
});

(async function () {
  try {
    let client = await pool.connect();
    console.log('Connected to the database');

    // execute SQL script
    const sql = readFileSync(join(__dirname, 'init.sql'), 'utf8');
    await client.query(sql);
    console.log('init.sql executed successfully');

    // delete attachments
    const attachmentsPath = join(__dirname, '..', 'attachments');
    if (existsSync(attachmentsPath)) {
      rmSync(attachmentsPath, { recursive: true, force: true });
    }
    mkdirSync(attachmentsPath, { recursive: true });
    writeFileSync(join(attachmentsPath, '.gitkeep'), '');

    // copy credentials to ../.env:
    const jwt_secret = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
    const master_signup_key = process.env.MASTER_SIGNUP_KEY || crypto.randomBytes(32).toString('hex');

    const file = join(__dirname, '..', '.env');
    const content = `DB_USER=${process.env.DB_USER}
DB_PASSWORD=${process.env.DB_PASSWORD}
DB_HOST=${process.env.DB_HOST}
DB_PORT=${process.env.DB_PORT}
DB_NAME=${process.env.DB_NAME}
JWT_SECRET=${jwt_secret}
MASTER_SIGNUP_KEY=${master_signup_key}
PORT=${process.env.PORT || 3000}
`;
    writeFileSync(file, content, 'utf8');
    client.release();
    await pool.end();
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    console.log('Database initialization complete');
  }
}());