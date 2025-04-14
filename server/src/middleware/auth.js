import jwt from 'jsonwebtoken';
import { query } from '../db/db.js';

// Basic authentication middleware
export function auth(req, res, next) {
  // Check for session-based authentication first
  if (req.session?.userId) {
    return next();
  }

  // Then check for JWT token in headers
  const token = req.header('x-auth-token');
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || '');
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Role-based authentication middleware 
export function checkRole(roles) {
  return async (req, res, next) => {
    try {
      const userId = req.user?.id || req.session.userId;

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // Query to get the user's role
      const userResult = await query(
        'SELECT r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
        [userId]
      );

      if (userResult.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      const userRole = userResult.rows[0].role_name;

      // Check if user's role is in the allowed roles
      if (roles.includes(userRole)) {
        next();
      } else {
        res.status(403).json({ message: 'Access denied: insufficient permissions' });
      }
    } catch (err) {
      console.error('Role check error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  };
};

// Middleware to check for moderator or admin
export const isModeratorOrAdmin = checkRole(['moderator', 'admin']);
