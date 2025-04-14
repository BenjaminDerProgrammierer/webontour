import express from 'express';
import { query, getClient } from '../db/db.js';
import { auth, checkRole, isModeratorOrAdmin } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads with proper storage directory
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../attachments');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|pdf/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Images, PDFs only!'));
    }
  }
});

// =====================
// TAGS ENDPOINTS
// =====================

// Get all available tags
router.get('/tags/all', async (req, res) => {
  try {
    const result = await query('SELECT * FROM tags ORDER BY name');
    res.json(result.rows);
  } catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// =====================
// CATEGORIES ENDPOINTS
// =====================

// Get all categories
router.get('/categories/all', async (req, res) => {
  try {
    const result = await query('SELECT * FROM categories ORDER BY name');
    res.json(result.rows);
  } catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create new category (admin and moderator only)
router.post('/categories', auth, isModeratorOrAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Validate input
    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Category name is required' });
    }
    
    // Check if category already exists
    const existingCategory = await query(
      'SELECT id FROM categories WHERE name = $1',
      [name]
    );
    
    if (existingCategory.rows.length > 0) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }
    
    // Insert new category
    const result = await query(
      'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING *',
      [name, description || '']
    );
    
    res.status(201).json(result.rows[0]);
  } catch(err) {
    console.error('Error creating category:', err);
    res.status(500).send('Server error');
  }
});

// =====================
// ADMIN ENDPOINTS
// =====================

// Get all users - admin and moderator only route
router.get('/admin/users', auth, isModeratorOrAdmin, async (req, res) => {
  try {
    const result = await query(`
      SELECT u.id, u.username, u.email, r.name as role, u.created_at
      FROM users u
      JOIN roles r ON u.role_id = r.id
      ORDER BY u.username
    `);
    
    res.json(result.rows);
  } catch(err) {
    console.error('Error fetching users:', err);
    res.status(500).send('Server error');
  }
});

// =====================
// POSTS ENDPOINTS
// =====================

// Get all posts with attachments, category, and tags
router.get('/', async (req, res) => {
  try {
    // Extract query parameters for filtering
    const { category, tag } = req.query;
    
    let sqlQuery = `
      SELECT 
        p.id, 
        p.title, 
        p.content, 
        p.created_at, 
        p.updated_at,
        u.username as author,
        c.id as category_id,
        c.name as category_name,
        COALESCE(json_agg(DISTINCT a.filename) FILTER (WHERE a.filename IS NOT NULL), '[]') as attachments,
        COALESCE(json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '[]') as tags
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN attachments a ON p.id = a.post_id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
    `;
    
    const queryParams = [];
    const whereConditions = [];
    
    // Add category filter if specified
    if (category) {
      queryParams.push(category);
      whereConditions.push(`c.name = $${queryParams.length}`);
    }
    
    // Add tag filter if specified
    if (tag) {
      // We need a subquery for tag filtering
      queryParams.push(tag);
      whereConditions.push(`
        p.id IN (
          SELECT pt.post_id 
          FROM post_tags pt 
          JOIN tags t ON pt.tag_id = t.id 
          WHERE t.name = $${queryParams.length}
        )
      `);
    }
    
    // Add WHERE clause if we have conditions
    if (whereConditions.length > 0) {
      sqlQuery += ` WHERE ${whereConditions.join(' AND ')}`;
    }
    
    // Complete the query with GROUP BY and ORDER BY
    sqlQuery += `
      GROUP BY p.id, u.username, c.id, c.name
      ORDER BY p.created_at DESC
    `;
    
    const result = await query(sqlQuery, queryParams);
    
    res.json(result.rows);
  } catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Create a new post with attachments, category, and tags
router.post('/', auth, upload.array('attachments', 5), async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { title, content, category_id, tags } = req.body;
    const authorId = req.user ? req.user.id : req.session.userId;
    
    if (!authorId) {
      return res.status(400).json({ message: 'Author ID not found in session or token' });
    }
    
    // Insert post with category
    const postResult = await client.query(
      'INSERT INTO posts (title, content, author_id, category_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, content, authorId, category_id]
    );
    
    const postId = postResult.rows[0].id;
    const files = req.files || [];
    
    // Insert attachments
    for (const file of files) {
      await client.query(
        'INSERT INTO attachments (post_id, filename) VALUES ($1, $2)',
        [postId, file.filename]
      );
    }
    
    // Process tags
    let tagList = [];
    if (tags) {
      tagList = Array.isArray(tags) ? tags : [tags];
    }
    if (tagList.length > 0) {
      for (const tagName of tagList) {
        // First check if tag exists, if not create it
        let tagResult = await client.query('SELECT id FROM tags WHERE name = $1', [tagName]);
        let tagId;
        
        if (tagResult.rows.length === 0) {
          // Create new tag
          tagResult = await client.query(
            'INSERT INTO tags (name) VALUES ($1) RETURNING id',
            [tagName]
          );
        }
        
        tagId = tagResult.rows[0].id;
        
        // Link tag to post
        await client.query(
          'INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [postId, tagId]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Get the complete post with attachments, category, and tags
    const completePostResult = await query(`
      SELECT 
        p.id, 
        p.title, 
        p.content, 
        p.created_at, 
        p.updated_at,
        u.username as author,
        c.id as category_id,
        c.name as category_name,
        COALESCE(json_agg(DISTINCT a.filename) FILTER (WHERE a.filename IS NOT NULL), '[]') as attachments,
        COALESCE(json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '[]') as tags
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN attachments a ON p.id = a.post_id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.id = $1
      GROUP BY p.id, u.username, c.id, c.name
    `, [postId]);
    
    res.json(completePostResult.rows[0]);
  } catch(err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server error');
  } finally {
    client.release();
  }
});

// Get a single post with attachments, category, and tags
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await query(`
      SELECT 
        p.id, 
        p.title, 
        p.content, 
        p.created_at, 
        p.updated_at,
        u.username as author,
        c.id as category_id,
        c.name as category_name,
        COALESCE(json_agg(DISTINCT a.filename) FILTER (WHERE a.filename IS NOT NULL), '[]') as attachments,
        COALESCE(json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '[]') as tags
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN attachments a ON p.id = a.post_id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.id = $1
      GROUP BY p.id, u.username, c.id, c.name
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    res.json(result.rows[0]);
  } catch(err) {
    console.error(err.message);
    res.status(500).send('Server error');
  }
});

// Update a post with attachments, category, and tags
router.put('/:id', auth, upload.array('attachments', 5), async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const { title, content, category_id, removeAttachments, tags } = req.body;
    const userId = req.user ? req.user.id : req.session.userId;
    const userRole = req.user ? req.user.role : req.session.role;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID not found in session or token' });
    }
    
    // Check if post exists and get author ID
    const postCheck = await client.query(
      'SELECT author_id FROM posts WHERE id = $1',
      [id]
    );
    
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const postAuthorId = postCheck.rows[0].author_id;
    
    // Check if user is authorized to edit this post
    // Only the post author, moderators, or admins can edit posts
    if (postAuthorId !== userId && !['admin', 'moderator'].includes(userRole)) {
      return res.status(403).json({ message: 'Not authorized to edit this post' });
    }
    
    // Update post with category
    await client.query(
      `UPDATE posts 
       SET title = $1, content = $2, category_id = $3, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $4 
       RETURNING *`,
      [title, content, category_id, id]
    );
    
    // Handle attachments
    const files = req.files || [];
    
    // Remove attachments if specified
    if (removeAttachments && Array.isArray(removeAttachments)) {
      for (const filename of removeAttachments) {
        // Get the attachment record
        const attachmentResult = await client.query(
          'SELECT * FROM attachments WHERE post_id = $1 AND filename = $2',
          [id, filename]
        );
        
        if (attachmentResult.rows.length > 0) {
          // Delete the file
          const filepath = path.join(__dirname, '../../attachments', filename);
          if (fs.existsSync(filepath)) {
            fs.unlinkSync(filepath);
          }
          
          // Delete the record
          await client.query(
            'DELETE FROM attachments WHERE post_id = $1 AND filename = $2',
            [id, filename]
          );
        }
      }
    }
    
    // Add new attachments
    for (const file of files) {
      await client.query(
        'INSERT INTO attachments (post_id, filename) VALUES ($1, $2)',
        [id, file.filename]
      );
    }
    
    // Handle tags - first remove all existing tags
    await client.query('DELETE FROM post_tags WHERE post_id = $1', [id]);
    
    // Then add the new tags
    let tagList = [];
    if (tags) {
      tagList = Array.isArray(tags) ? tags : [tags];
    }
    if (tagList.length > 0) {
      for (const tagName of tagList) {
        // First check if tag exists, if not create it
        let tagResult = await client.query('SELECT id FROM tags WHERE name = $1', [tagName]);
        let tagId;
        
        if (tagResult.rows.length === 0) {
          // Create new tag
          tagResult = await client.query(
            'INSERT INTO tags (name) VALUES ($1) RETURNING id',
            [tagName]
          );
        }
        
        tagId = tagResult.rows[0].id;
        
        // Link tag to post
        await client.query(
          'INSERT INTO post_tags (post_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
          [id, tagId]
        );
      }
    }
    
    await client.query('COMMIT');
    
    // Get the complete post with attachments, category, and tags
    const completePostResult = await query(`
      SELECT 
        p.id, 
        p.title, 
        p.content, 
        p.created_at, 
        p.updated_at,
        u.username as author,
        c.id as category_id,
        c.name as category_name,
        COALESCE(json_agg(DISTINCT a.filename) FILTER (WHERE a.filename IS NOT NULL), '[]') as attachments,
        COALESCE(json_agg(DISTINCT t.name) FILTER (WHERE t.name IS NOT NULL), '[]') as tags
      FROM posts p
      JOIN users u ON p.author_id = u.id
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN attachments a ON p.id = a.post_id
      LEFT JOIN post_tags pt ON p.id = pt.post_id
      LEFT JOIN tags t ON pt.tag_id = t.id
      WHERE p.id = $1
      GROUP BY p.id, u.username, c.id, c.name
    `, [id]);
    
    res.json(completePostResult.rows[0]);
  } catch(err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server error');
  } finally {
    client.release();
  }
});

// Delete a post
// Allow moderators and admins to delete any post
// Regular users can only delete their own posts
router.delete('/:id', auth, async (req, res) => {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    const { id } = req.params;
    const userId = req.user ? req.user.id : req.session.userId;
    const userRole = req.user ? req.user.role : req.session.role;
    
    if (!userId) {
      return res.status(400).json({ message: 'User ID not found in session or token' });
    }
    
    // Check if post exists and get author ID
    const postCheck = await client.query(
      'SELECT author_id FROM posts WHERE id = $1',
      [id]
    );
    
    if (postCheck.rows.length === 0) {
      return res.status(404).json({ message: 'Post not found' });
    }
    
    const postAuthorId = postCheck.rows[0].author_id;
    
    // Check if user is authorized to delete this post
    // Only the post author, moderators, or admins can delete posts
    if (postAuthorId !== userId && !['admin', 'moderator'].includes(userRole)) {
      return res.status(403).json({ message: 'Not authorized to delete this post' });
    }
    
    // Get all attachments for the post
    const attachmentsResult = await client.query(
      'SELECT filename FROM attachments WHERE post_id = $1',
      [id]
    );
    
    // Delete attachment files
    for (const row of attachmentsResult.rows) {
      const filepath = path.join(__dirname, '../../attachments', row.filename);
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath);
      }
    }
    
    // Delete post (cascade will handle attachments)
    await client.query('DELETE FROM posts WHERE id = $1', [id]);
    
    await client.query('COMMIT');
    
    res.json({ message: 'Post deleted' });
  } catch(err) {
    await client.query('ROLLBACK');
    console.error(err.message);
    res.status(500).send('Server error');
  } finally {
    client.release();
  }
});

export default router;
