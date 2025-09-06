const { query, transaction } = require('../config/database');

class DriverProfileModel {
  static async createDriverProfile(profileData) {
    const { userId, fullName, email, phoneNo, city, address } = profileData;
    
    try {
      const queryText = `
        INSERT INTO driver_profiles (user_id, full_name, email, phone_no, city, address, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, user_id, full_name, email, phone_no, city, address, created_at
      `;
      
      const values = [userId, fullName, email, phoneNo, city, address];
      const result = await query(queryText, values);
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const queryText = `
        SELECT id, user_id, full_name, email, phone_no, city, address, created_at, updated_at
        FROM driver_profiles 
        WHERE user_id = $1
      `;
      
      const result = await query(queryText, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async updateDriverProfile(userId, updateData) {
    try {
      const { fullName, phoneNo, city, address } = updateData;
      
      const queryText = `
        UPDATE driver_profiles 
        SET full_name = $2, phone_no = $3, city = $4, address = $5, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING id, user_id, full_name, email, phone_no, city, address, updated_at
      `;
      
      const values = [userId, fullName, phoneNo, city, address];
      const result = await query(queryText, values);
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async deleteDriverProfile(userId) {
    try {
      const queryText = `
        DELETE FROM driver_profiles 
        WHERE user_id = $1
        RETURNING id, full_name, email
      `;
      
      const result = await query(queryText, [userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = DriverProfileModel;