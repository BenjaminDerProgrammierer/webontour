import { query } from "../db/db.js";
import express from "express";
import { auth, checkRole } from "../middleware/auth.js";

const router = express.Router();


router.get('/tables', auth, checkRole('admin'), async (req, res) => {
    try {
        // Query to get all tables in the database
        const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
        // Extract table names from the result
        const tableNames = tables.rows.map(table => table.table_name);
        res.json(tableNames);
    } catch (error) {
        console.error('Error fetching tables:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/table/:tableName', auth, checkRole('admin'), async (req, res) => {
    const { tableName } = req.params;
    try {
        // Query to get all rows from the specified table
        const result = await query(`SELECT * FROM ${tableName}`);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching table data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

export default router;
