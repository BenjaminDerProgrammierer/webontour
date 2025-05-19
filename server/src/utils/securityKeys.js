import { query } from '../db/db.js';

/**
 * Retrieves security keys from the database
 * @returns {Promise<Object>} Object containing security keys
 */
export async function getSecurityKeys() {
  try {
    // Check if system_settings table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'system_settings'
      );
    `);
    
    if (!tableCheck.rows[0].exists) {
      console.log('system_settings table not found, cannot retrieve security keys from database');
      return {};
    }
    
    // Fetch JWT_SECRET from database
    const jwtSecretResult = await query(
      'SELECT value FROM system_settings WHERE key = $1',
      ['JWT_SECRET']
    );
    
    // Fetch MASTER_SIGNUP_KEY from database
    const masterKeyResult = await query(
      'SELECT value FROM system_settings WHERE key = $1',
      ['MASTER_SIGNUP_KEY']
    );
    
    return {
      JWT_SECRET: jwtSecretResult.rows.length > 0 ? jwtSecretResult.rows[0].value : null,
      MASTER_SIGNUP_KEY: masterKeyResult.rows.length > 0 ? masterKeyResult.rows[0].value : null
    };
  } catch (error) {
    console.error('Error retrieving security keys from database:', error);
    return {};
  }
}

/**
 * Stores a security key in the database
 * @param {string} key - The key name
 * @param {string} value - The key value
 * @returns {Promise<boolean>} Success indicator
 */
export async function storeSecurityKey(key, value) {
  try {
    // Check if key already exists
    const keyExists = await query(
      'SELECT COUNT(*) FROM system_settings WHERE key = $1',
      [key]
    );
    
    if (parseInt(keyExists.rows[0].count) > 0) {
      // Update existing key
      await query(
        'UPDATE system_settings SET value = $1, updated_at = CURRENT_TIMESTAMP WHERE key = $2',
        [value, key]
      );
    } else {
      // Insert new key
      await query(
        'INSERT INTO system_settings (key, value) VALUES ($1, $2)',
        [key, value]
      );
    }
    
    return true;
  } catch (error) {
    console.error(`Error storing security key ${key} in database:`, error);
    return false;
  }
}
