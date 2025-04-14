import dotenv from 'dotenv';
dotenv.config();

import express, { json, static as myStatic } from 'express';
import cors from 'cors';
import session from 'express-session';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import auth from './routes/auth.js';
import posts from './routes/posts.js';
import setup from './routes/setup.js';
import adminCrud from './routes/adminCrud.js';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set in the environment variables.');
  process.exit(1);
}

const app = express();
const PORT = parseInt(process.env.PORT || "3000");

// Middleware
app.use(cors());
app.use(json());

// Session middleware
app.use(session({
  secret: process.env.JWT_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

app.use('/uploads', myStatic(join(__dirname, '../attachments')));

// Routes
app.use('/api/auth', auth);
app.use('/api/posts', posts);
app.use('/api/setup', setup);
app.use('/api/admin', adminCrud);

// Simple health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'UP', time: new Date() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
