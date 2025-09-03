const bcrypt = require('bcryptjs');
const { query, transaction } = require('../config/database');

class UserModel {
  // Create a new user
  static async createUser(userData) {
    const { email, password, firstName, lastName } = userData;
    
    try {
      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      
      const queryText = `
        INSERT INTO users (email, password, first_name, last_name, created_at, updated_at)
        VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, email, first_name, last_name, created_at
      `;
      
      const values = [email.toLowerCase(), hashedPassword, firstName, lastName];
      const result = await query(queryText, values);
      
      return result.rows[0];
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Email already exists');
      }
      throw error;
    }
  }

  // Find user by email
  static async findByEmail(email) {
    try {
      const queryText = `
        SELECT id, email, password, first_name, last_name, created_at, updated_at
        FROM users 
        WHERE email = $1
      `;
      
      const result = await query(queryText, [email.toLowerCase()]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find user by ID
  static async findById(userId) {
    try {
      const queryText = `
        SELECT id, email, first_name, last_name, created_at, updated_at
        FROM users 
        WHERE id = $1
      `;
      
      const result = await query(queryText, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Verify user password
  static async verifyPassword(plainPassword, hashedPassword) {
    try {
      return await bcrypt.compare(plainPassword, hashedPassword);
    } catch (error) {
      throw error;
    }
  }

  // Update user information
  static async updateUser(userId, updateData) {
    try {
      const { firstName, lastName } = updateData;
      
      const queryText = `
        UPDATE users 
        SET first_name = $2, last_name = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, email, first_name, last_name, updated_at
      `;
      
      const values = [userId, firstName, lastName];
      const result = await query(queryText, values);
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Update user password
  static async updatePassword(userId, newPassword) {
    try {
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);
      
      const queryText = `
        UPDATE users 
        SET password = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $1
        RETURNING id, email
      `;
      
      const values = [userId, hashedPassword];
      const result = await query(queryText, values);
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete user
  static async deleteUser(userId) {
    try {
      const queryText = `
        DELETE FROM users 
        WHERE id = $1
        RETURNING id, email
      `;
      
      const result = await query(queryText, [userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get all users (for admin purposes)
  static async getAllUsers(limit = 50, offset = 0) {
    try {
      const queryText = `
        SELECT id, email, first_name, last_name, created_at, updated_at
        FROM users 
        ORDER BY created_at DESC
        LIMIT $1 OFFSET $2
      `;
      
      const result = await query(queryText, [limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Check if email exists
  static async emailExists(email) {
    try {
      const queryText = `
        SELECT EXISTS(SELECT 1 FROM users WHERE email = $1)
      `;
      
      const result = await query(queryText, [email.toLowerCase()]);
      return result.rows[0].exists;
    } catch (error) {
      throw error;
    }
  }
}

module.exports = UserModel;