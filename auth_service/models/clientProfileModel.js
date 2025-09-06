const { query, transaction } = require('../config/database');

class ClientProfileModel {
  static async createClientProfile(profileData) {
    const { userId, name, email, phoneNo, businessType, city, address } = profileData;
    
    try {
      const queryText = `
        INSERT INTO client_profiles (user_id, name, email, phone_no, business_type, city, address, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id, user_id, name, email, phone_no, business_type, city, address, created_at
      `;
      
      const values = [userId, name, email, phoneNo, businessType, city, address];
      const result = await query(queryText, values);
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async findByUserId(userId) {
    try {
      const queryText = `
        SELECT id, user_id, name, email, phone_no, business_type, city, address, created_at, updated_at
        FROM client_profiles 
        WHERE user_id = $1
      `;
      
      const result = await query(queryText, [userId]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  static async updateClientProfile(userId, updateData) {
    try {
      const { name, phoneNo, businessType, city, address } = updateData;
      
      const queryText = `
        UPDATE client_profiles 
        SET name = $2, phone_no = $3, business_type = $4, city = $5, address = $6, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = $1
        RETURNING id, user_id, name, email, phone_no, business_type, city, address, updated_at
      `;
      
      const values = [userId, name, phoneNo, businessType, city, address];
      const result = await query(queryText, values);
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  static async deleteClientProfile(userId) {
    try {
      const queryText = `
        DELETE FROM client_profiles 
        WHERE user_id = $1
        RETURNING id, name, email
      `;
      
      const result = await query(queryText, [userId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = ClientProfileModel;