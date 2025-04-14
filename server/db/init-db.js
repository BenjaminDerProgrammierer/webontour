const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
require('dotenv').config({ path: 'db/.env' });

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
    const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
    await client.query(sql);
    console.log('init.sql executed successfully');

    // delete attachments
    const attachmentsPath = path.join(__dirname, '..', 'attachments');
    if (fs.existsSync(attachmentsPath)) {
      fs.rmSync(attachmentsPath, { recursive: true, force: true });
    }
    fs.mkdirSync(attachmentsPath, { recursive: true });
    fs.writeFileSync(path.join(attachmentsPath, '.gitkeep'), '');

    // copy credentials to ../.env:
    const jwt_secret = process.env.JWT_SECRET || require('crypto').randomBytes(64).toString('hex');
    const master_signup_key = process.env.MASTER_SIGNUP_KEY || require('crypto').randomBytes(32).toString('hex');

    const file = path.join(__dirname, '..', '.env');
    const content = `DB_USER=${process.env.DB_USER}
DB_PASSWORD=${process.env.DB_PASSWORD}
DB_HOST=${process.env.DB_HOST}
DB_PORT=${process.env.DB_PORT}
DB_NAME=${process.env.DB_NAME}
JWT_SECRET=${jwt_secret}
MASTER_SIGNUP_KEY=${master_signup_key}
PORT=${process.env.PORT || 3000}
`;
    fs.writeFileSync(file, content, 'utf8');
  } catch (err) {
    console.error('Error initializing database:', err);
  } finally {
    client.release();
    await pool.end();
    console.log('Database initialization complete');
  }
}());