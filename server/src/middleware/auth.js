import jwt from 'jsonwebtoken';
import { query } from '../db/db.js';

/**
 * Authentication middleware that checks for session or JWT token
 */
export function auth(req, res, next) {
  // Check for session-based authentication first
  if (req.session?.userId) {
    return next();
  }

  // Then check for JWT token in headers
  const token = req.header('x-auth-token') || req.header('authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification error:', err.message);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
}

/**
 * Admin-only middleware
 */
export const isAdmin = checkRole(['admin']);

/**
 * Get the current user's ID from either session or token
 */
export function getUserId(req) {
  return req.user?.id || req.session?.userId;
}

/**
 * Get the current user's role from either session or token
 */
export function getUserRole(req) {
  return req.user?.role || req.session?.role;
}

/**
 * Role-based authorization middleware
 * @param {string[]} roles - Array of allowed roles
 */
export function checkRole(roles) {
  return async (req, res, next) => {
    try {
      const userId = getUserId(req);

      if (!userId) {
        return res.status(401).json({ message: 'Authentication required' });
      }

      // First try to get the role from the token or session for efficiency
      let userRole = getUserRole(req);
      
      // If not available, query the database
      if (!userRole) {
        const userResult = await query(
          'SELECT r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = $1',
          [userId]
        );

        if (userResult.rows.length === 0) {
          return res.status(404).json({ message: 'User not found' });
        }

        userRole = userResult.rows[0].role_name;
      }

      // Check if user's role is in the allowed roles
      if (roles.includes(userRole)) {
        return next();
      } else {
        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
      }
    } catch (err) {
      console.error('Role check error:', err);
      return res.status(500).json({ message: 'Server error during authorization' });
    }
  };
}

/**
 * Check if user is authorized to modify a post
 * @param {Object} req - Express request object
 * @param {number} postAuthorId - ID of the post author
 */
export async function isAuthorizedForPost(req, postAuthorId) {
  const userId = getUserId(req);
  const userRole = getUserRole(req);
  
  // If user is admin or moderator, they're authorized
  if (['admin', 'moderator'].includes(userRole)) {
    return true;
  }
  
  // Otherwise, check if user is the author
  return userId === postAuthorId;
}

// Common role checks
export const isWriter = checkRole(['writer', 'admin']);
export const isWriterOrModerator = checkRole(['writer', 'moderator', 'admin']);
export const isModeratorOrAdmin = checkRole(['moderator', 'admin']);

export default {
  auth,
  getUserId,
  getUserRole,
  checkRole,
  isAuthorizedForPost,
  isAdmin,
  isWriter,
  isWriterOrModerator,
  isModeratorOrAdmin
};
