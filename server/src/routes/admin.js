import express from 'express';
import { query, getClient } from '../db/db.js';
import { auth, isAdmin, checkRole } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import isDocker from '../utils/isDocker.js';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = isDocker()
      ? '/attachments'
      : path.join(__dirname, '../../../storage/attachments');
      
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
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|ppt|pptx|csv|txt/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Error: Only common document formats are allowed'));
    }
  }
});

/**
 * @route   GET /api/admin/tables
 * @desc    Get list of all database tables
 * @access  Admin only
 */
router.get('/tables', auth, isAdmin, async (req, res) => {
  try {
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const result = await query(tablesQuery);
    
    res.json({
      tables: result.rows.map(row => row.table_name)
    });
  } catch (err) {
    console.error('Error fetching tables:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/tables/:tableName/schema
 * @desc    Get schema information for a table
 * @access  Admin only
 */
router.get('/tables/:tableName/schema', auth, isAdmin, async (req, res) => {
  try {
    const { tableName } = req.params;
    
    // Validate tableName to prevent SQL injection
    const validTableNameRegex = /^[a-zA-Z0-9_]+$/;
    if (!validTableNameRegex.test(tableName)) {
      return res.status(400).json({ message: 'Invalid table name' });
    }
    
    const schemaQuery = `
      SELECT 
        column_name, 
        data_type,
        is_nullable,
        column_default,
        character_maximum_length
      FROM 
        information_schema.columns 
      WHERE 
        table_schema = 'public' 
        AND table_name = $1
      ORDER BY 
        ordinal_position;
    `;
    
    const foreignKeyQuery = `
      SELECT
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
      WHERE
        tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name = $1;
    `;
    
    const primaryKeyQuery = `
      SELECT
        kcu.column_name
      FROM
        information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
      WHERE
        tc.constraint_type = 'PRIMARY KEY'
        AND tc.table_name = $1;
    `;
    
    const [columns, foreignKeys, primaryKeys] = await Promise.all([
      query(schemaQuery, [tableName]),
      query(foreignKeyQuery, [tableName]),
      query(primaryKeyQuery, [tableName])
    ]);
    
    // Create a schema object with column details
    const schema = columns.rows.map(col => {
      // Check if this column is a primary key
      const isPrimaryKey = primaryKeys.rows.some(pk => pk.column_name === col.column_name);
      
      // Check if this column is a foreign key
      const foreignKeyInfo = foreignKeys.rows.find(fk => fk.column_name === col.column_name);
      
      return {
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        default: col.column_default,
        maxLength: col.character_maximum_length,
        isPrimaryKey,
        foreignKey: foreignKeyInfo ? {
          table: foreignKeyInfo.foreign_table_name,
          column: foreignKeyInfo.foreign_column_name
        } : null
      };
    });
    
    res.json({ schema });
  } catch (err) {
    console.error(`Error fetching schema for table ${req.params.tableName}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   GET /api/admin/tables/:tableName
 * @desc    Get data from a table with pagination, sorting, and filtering
 * @access  Admin only, Writers/Moderators for posts
 */
router.get('/tables/:tableName', auth, async (req, res) => {
  try {
    const { tableName } = req.params;
    const userRole = req.user?.role || req.session?.role;
    const userId = req.user?.id || req.session?.userId;

    // Check if user has permissions for this table
    if (tableName === 'posts') {
      // Writers, moderators, and admins can access posts
      if (!['writer', 'moderator', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
      }
    } else {
      // Only admins can access other tables
      if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }
    }
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'id';
    const sortOrder = req.query.sortOrder === 'desc' ? 'DESC' : 'ASC';
    const search = req.query.search || '';
    
    // Validate tableName to prevent SQL injection
    const validTableNameRegex = /^[a-zA-Z0-9_]+$/;
    if (!validTableNameRegex.test(tableName)) {
      return res.status(400).json({ message: 'Invalid table name' });
    }
    
    // Validate sortBy to prevent SQL injection
    if (!validTableNameRegex.test(sortBy)) {
      return res.status(400).json({ message: 'Invalid sort field' });
    }
    
    // Get table columns for search
    const columnsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1;
    `;
    
    const columnsResult = await query(columnsQuery, [tableName]);
    const columns = columnsResult.rows;
    
    // Build dynamic search conditions if search parameter is provided
    let searchConditions = '';
    let searchParams = [];
    
    if (search) {
      const searchableColumns = columns.filter(col => 
        ['character varying', 'text', 'varchar', 'char', 'name'].includes(col.data_type)
      );
      
      if (searchableColumns.length > 0) {
        const searchConditionParts = searchableColumns.map((col, idx) => {
          searchParams.push(`%${search}%`);
          return `${col.column_name}::text ILIKE $${searchParams.length}`;
        });
        
        searchConditions = 'WHERE ' + searchConditionParts.join(' OR ');
      }
    }
    
    // Writers should only see their own posts
    let userFilter = '';
    if (tableName === 'posts' && userRole === 'writer') {
      // If the user is a writer, add a filter to only show their posts
      if (searchConditions) {
        userFilter = ` AND author_id = $${searchParams.length + 1}`;
        searchParams.push(userId);
      } else {
        userFilter = ` WHERE author_id = $${searchParams.length + 1}`;
        searchParams.push(userId);
      }
    }
    
    // Count total records (with search filter if applied)
    const countQuery = `
      SELECT COUNT(*) as total FROM "${tableName}" ${searchConditions}${userFilter};
    `;
    
    // Query data with pagination, sorting, and search
    // Always use placeholders at the end for LIMIT and OFFSET
    const limitParamIdx = searchParams.length + 1;
    const offsetParamIdx = searchParams.length + 2;
    const dataQuery = `
      SELECT * FROM "${tableName}"
      ${searchConditions}${userFilter}
      ORDER BY "${sortBy}" ${sortOrder}
      LIMIT $${limitParamIdx} OFFSET $${offsetParamIdx};
    `;

    // Add pagination parameters to the appropriate query
    const dataQueryParams = [...searchParams, limit, offset];

    const [countResult, dataResult] = await Promise.all([
      query(countQuery, searchParams),
      query(dataQuery, dataQueryParams)
    ]);
    
    const total = parseInt(countResult.rows[0].total);
    const totalPages = Math.ceil(total / limit);
    
    res.json({
      data: dataResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
    
  } catch (err) {
    console.error(`Error fetching data from table ${req.params.tableName}:`, err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   POST /api/admin/tables/:tableName
 * @desc    Insert a new record into a table
 * @access  Admin for all tables, Writers/Moderators for posts only
 */
router.post('/tables/:tableName', auth, async (req, res) => {
  const client = await getClient();
  
  try {
    const { tableName } = req.params;
    const data = req.body;
    const userRole = req.user?.role || req.session?.role;
    const userId = req.user?.id || req.session?.userId;

    // Check if user has permissions for this table
    if (tableName === 'posts') {
      // Writers, moderators, and admins can create posts
      if (!['writer', 'moderator', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
      }
      
      // For writers, ensure they set themselves as the author
      if (userRole === 'writer') {
        data.author_id = userId;
      }
    } else {
      // Only admins can create records in other tables
      if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }
    }
    
    // Validate tableName to prevent SQL injection
    const validTableNameRegex = /^[a-zA-Z0-9_]+$/;
    if (!validTableNameRegex.test(tableName)) {
      return res.status(400).json({ message: 'Invalid table name' });
    }
    
    await client.query('BEGIN');
    
    // Get the columns for this table
    const columnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1;
    `;
    
    const columnsResult = await client.query(columnsQuery, [tableName]);
    const validColumns = columnsResult.rows.map(row => row.column_name);
    
    // Filter input data to only include valid columns
    const columns = [];
    const values = [];
    const placeholders = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(data)) {
      if (validColumns.includes(key)) {
        columns.push(`"${key}"`);
        values.push(value);
        placeholders.push(`$${paramIndex++}`);
      }
    }
    
    if (columns.length === 0) {
      throw new Error('No valid columns provided');
    }
    
    // Build and execute the insert query
    const insertQuery = `
      INSERT INTO "${tableName}" (${columns.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *;
    `;
    
    const result = await client.query(insertQuery, values);
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Record created successfully',
      data: result.rows[0]
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Error inserting into table ${req.params.tableName}:`, err);
    
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Duplicate key violation' });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  } finally {
    client.release();
  }
});

/**
 * @route   PUT /api/admin/tables/:tableName/:id
 * @desc    Update a record in a table
 * @access  Admin for all tables, Writers for own posts, Moderators for any post
 */
router.put('/tables/:tableName/:id', auth, async (req, res) => {
  const client = await getClient();
  
  try {
    const { tableName, id } = req.params;
    const data = req.body;
    const userRole = req.user?.role || req.session?.role;
    const userId = req.user?.id || req.session?.userId;
    
    // Check permissions based on table and role
    if (tableName === 'posts') {
      if (!['writer', 'moderator', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
      }
      
      // Writers can only edit their own posts
      if (userRole === 'writer') {
        // Check if this post belongs to the writer
        const postCheckResult = await query('SELECT author_id FROM posts WHERE id = $1', [id]);
        
        if (postCheckResult.rows.length === 0) {
          return res.status(404).json({ message: 'Post not found' });
        }
        
        if (postCheckResult.rows[0].author_id !== userId) {
          return res.status(403).json({ message: 'Access denied: you can only edit your own posts' });
        }
      }
    } else {
      // Only admins can edit other tables
      if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }
    }
    
    // Validate tableName to prevent SQL injection
    const validTableNameRegex = /^[a-zA-Z0-9_]+$/;
    if (!validTableNameRegex.test(tableName)) {
      return res.status(400).json({ message: 'Invalid table name' });
    }
    
    await client.query('BEGIN');
    
    // Get the primary key column for this table
    const pkQuery = `
      SELECT kcu.column_name AS pk
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1
        AND tc.constraint_type = 'PRIMARY KEY';
    `;
    
    const pkResult = await client.query(pkQuery, [tableName]);
    
    if (pkResult.rows.length === 0) {
      return res.status(400).json({ message: 'Table has no primary key' });
    }
    
    const pkColumn = pkResult.rows[0].pk;
    
    // Get the valid columns for this table
    const columnsQuery = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' AND table_name = $1;
    `;
    
    const columnsResult = await client.query(columnsQuery, [tableName]);
    const validColumns = columnsResult.rows.map(row => row.column_name);
    
    // Filter input data to only include valid columns
    const setClause = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(data)) {
      if (validColumns.includes(key)) {
        setClause.push(`"${key}" = $${paramIndex++}`);
        values.push(value);
      }
    }
    
    if (setClause.length === 0) {
      throw new Error('No valid columns provided');
    }
    
    // Add the id parameter
    values.push(id);
    
    // Build and execute the update query
    const updateQuery = `
      UPDATE "${tableName}" 
      SET ${setClause.join(', ')}
      WHERE "${pkColumn}" = $${values.length}
      RETURNING *;
    `;
    
    const result = await client.query(updateQuery, values);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: 'Record updated successfully',
      data: result.rows[0]
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Error updating record in ${req.params.tableName}:`, err);
    
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Duplicate key violation' });
    }
    
    res.status(500).json({ 
      message: 'Server error', 
      error: err.message 
    });
  } finally {
    client.release();
  }
});

/**
 * @route   DELETE /api/admin/tables/:tableName/:id
 * @desc    Delete a record from a table
 * @access  Admin for all tables, Writers for own posts, Moderators for any post
 */
router.delete('/tables/:tableName/:id', auth, async (req, res) => {
  const client = await getClient();
  
  try {
    const { tableName, id } = req.params;
    const userRole = req.user?.role || req.session?.role;
    const userId = req.user?.id || req.session?.userId;
    
    // Check permissions based on table and role
    if (tableName === 'posts') {
      if (!['writer', 'moderator', 'admin'].includes(userRole)) {
        return res.status(403).json({ message: 'Access denied: insufficient permissions' });
      }
      
      // Writers can only delete their own posts
      if (userRole === 'writer') {
        // Check if this post belongs to the writer
        const postCheckResult = await query('SELECT author_id FROM posts WHERE id = $1', [id]);
        
        if (postCheckResult.rows.length === 0) {
          return res.status(404).json({ message: 'Post not found' });
        }
        
        if (postCheckResult.rows[0].author_id !== userId) {
          return res.status(403).json({ message: 'Access denied: you can only delete your own posts' });
        }
      }
    } else {
      // Only admins can delete records from other tables
      if (userRole !== 'admin') {
        return res.status(403).json({ message: 'Access denied: admin privileges required' });
      }
    }
    
    // Validate tableName to prevent SQL injection
    const validTableNameRegex = /^[a-zA-Z0-9_]+$/;
    if (!validTableNameRegex.test(tableName)) {
      return res.status(400).json({ message: 'Invalid table name' });
    }
    
    await client.query('BEGIN');
    
    // Get the primary key column for this table
    const pkQuery = `
      SELECT kcu.column_name AS pk
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.table_name = $1
        AND tc.constraint_type = 'PRIMARY KEY';
    `;
    
    const pkResult = await client.query(pkQuery, [tableName]);
    
    if (pkResult.rows.length === 0) {
      return res.status(400).json({ message: 'Table has no primary key' });
    }
    
    const pkColumn = pkResult.rows[0].pk;
    
    // Execute the delete query
    const deleteQuery = `
      DELETE FROM "${tableName}"
      WHERE "${pkColumn}" = $1
      RETURNING *;
    `;
    
    const result = await client.query(deleteQuery, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Record not found' });
    }
    
    await client.query('COMMIT');
    
    res.json({
      message: 'Record deleted successfully',
      data: result.rows[0]
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(`Error deleting from table ${req.params.tableName}:`, err);
    
    if (err.code === '23503') {
      return res.status(409).json({ message: 'Cannot delete: record referenced by other tables' });
    }
    
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

/**
 * @route   POST /api/admin/attachments/upload
 * @desc    Upload an attachment
 * @access  Admin only
 */
router.post('/attachments/upload', auth, checkRole(['admin']), upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    // You can save to db or just return the file info
    res.json({ 
      message: 'File uploaded successfully',
      file: {
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path
      }
    });
  } catch (err) {
    console.error('File upload error:', err);
    res.status(500).json({ message: 'File upload failed' });
  }
});

/**
 * @route   GET /api/admin/attachments
 * @desc    List all attachments
 * @access  Admin only
 */
router.get('/attachments', auth, checkRole(['admin']), async (req, res) => {
  try {
    const result = await query('SELECT * FROM attachments ORDER BY created_at DESC');
    res.json({ attachments: result.rows });
  } catch (err) {
    console.error('Error fetching attachments:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

/**
 * @route   DELETE /api/admin/attachments/:id
 * @desc    Delete an attachment
 * @access  Admin only
 */
router.delete('/attachments/:id', auth, checkRole(['admin']), async (req, res) => {
  const client = await getClient();
  
  try {
    const { id } = req.params;
    
    await client.query('BEGIN');
    
    // Get the attachment info
    const attachmentResult = await client.query('SELECT * FROM attachments WHERE id = $1', [id]);
    
    if (attachmentResult.rows.length === 0) {
      return res.status(404).json({ message: 'Attachment not found' });
    }
    
    const attachment = attachmentResult.rows[0];
    
    // Delete the file
    const filePath = isDocker()
      ? `/attachments/${attachment.filename}`
      : path.join(__dirname, '../../../storage/attachments', attachment.filename);
    
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete from database
    await client.query('DELETE FROM attachments WHERE id = $1', [id]);
    await client.query('COMMIT');
    
    res.json({ 
      message: 'Attachment deleted successfully', 
      attachment
    });
    
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error deleting attachment:', err);
    res.status(500).json({ message: 'Server error' });
  } finally {
    client.release();
  }
});

export default router;
