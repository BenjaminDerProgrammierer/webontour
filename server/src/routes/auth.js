import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { query } from '../db/db.js';
import { auth, checkRole } from '../middleware/auth.js';

const router = express.Router();

// Signup route (protected by master key)
router.post('/signup', async (req, res) => {
  try {
    const { username, password, email, masterKey } = req.body;
    
    // Validate master key
    if (!masterKey || masterKey !== process.env.MASTER_SIGNUP_KEY) {
      return res.status(401).json({ message: 'Invalid master key' });
    }

    // Validate input
    if (!username || !password || !email) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ message: 'Password must be at least 8 characters long' });
    }

    // Check if username or email already exists
    const existingUser = await query(
      'SELECT * FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ message: 'Username or email already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Get user role ID (default to 'user' role)
    const roleResult = await query('SELECT id FROM roles WHERE name = $1', ['user']);
    if (roleResult.rows.length === 0) {
      return res.status(500).json({ message: 'User role not found' });
    }
    const userRoleId = roleResult.rows[0].id;
    
    // Insert new user
    const result = await query(
      'INSERT INTO users (username, password, email, role_id) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role_id',
      [username, hashedPassword, email, userRoleId]
    );
    
    // Verify role name for the response
    const userWithRole = await query(
      'SELECT u.id, u.username, u.email, r.name as role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
      [result.rows[0].id]
    );
    
    // Create session
    req.session.userId = result.rows[0].id;
    req.session.role = 'user';
    
    // Create JWT token
    const payload = {
      id: result.rows[0].id,
      username: result.rows[0].username,
      role: 'user'
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || '',
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({
          token,
          message: 'User registered successfully',
          user: {
            id: userWithRole.rows[0].id,
            username: userWithRole.rows[0].username,
            email: userWithRole.rows[0].email,
            role: userWithRole.rows[0].role
          }
        });
      }
    );
  } catch (err) {
    console.error('Error registering user:', err);
    
    if (err.code === '23505') {
      return res.status(400).json({ message: 'Username or email already exists' });
    }
    
    res.status(500).json({ message: 'Server error' });
  }
});

// Login route
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    // Check if user exists
    const userResult = await query(
      `SELECT u.*, r.name as role_name 
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.username = $1`,
      [username]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];

    // Validate password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Create session
    req.session.userId = user.id;
    req.session.role = user.role_name;

    // Create JWT token
    const payload = {
      id: user.id,
      username: user.username,
      role: user.role_name
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET || '',
      { expiresIn: '1d' },
      (err, token) => {
        if (err) throw err;
        res.json({
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            role: user.role_name
          }
        });
      }
    );
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Check auth status
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user?.id || req.session.userId;
    const userResult = await query(
      `SELECT u.id, u.username, u.email, r.name as role
       FROM users u
       JOIN roles r ON u.role_id = r.id
       WHERE u.id = $1`,
      [userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(userResult.rows[0]);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Logout route
router.post('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).json({ message: 'Could not log out' });
    }
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out successfully' });
  });
});

// Get all available roles (for admin use)
router.get('/roles', auth, checkRole(['admin']), async (req, res) => {
  try {
    const rolesResult = await query('SELECT * FROM roles ORDER BY id');
    res.json(rolesResult.rows);
  } catch (err) {
    console.error('Error fetching roles:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update a user's role (admin only)
router.put('/user/:userId/role', auth, checkRole(['admin']), async (req, res) => {
  try {
    const { userId } = req.params;
    const { roleId } = req.body;
    
    // Validate inputs
    if (!roleId) {
      return res.status(400).json({ message: 'Role ID is required' });
    }

    // Check if role exists
    const roleCheck = await query('SELECT id FROM roles WHERE id = $1', [roleId]);
    if (roleCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Role not found' });
    }
    
    // Update the user's role
    await query(
      'UPDATE users SET role_id = $1 WHERE id = $2 RETURNING id',
      [roleId, userId]
    );
    
    res.json({ message: 'User role updated successfully' });
  } catch (err) {
    console.error('Error updating user role:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
