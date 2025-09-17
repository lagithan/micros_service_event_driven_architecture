const { Pool } = require('pg');

const pool = new Pool({
  host: 'aws-1-us-east-2.pooler.supabase.com',
  port: 6543, // check dashboard if it should be 5432
  database: 'postgres',
  user: 'postgres.ncweqyzmweooaneexole',
  password: '077Lagithan',
  ssl: { rejectUnauthorized: false }, // ✅ required for Supabase
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // ✅ increased
});

// Database connection function
const connectDatabase = async () => {
  try {
    const client = await pool.connect();
    console.log('Connected to PostgreSQL database');
    
    // Create Order_Delivery_Table
    await client.query(`
      CREATE TABLE IF NOT EXISTS Order_Delivery_Table (
        id SERIAL PRIMARY KEY,
        delivery_person_id INTEGER NOT NULL,
        delivery_person_name VARCHAR(255) NOT NULL,
        order_id VARCHAR(100) NOT NULL,
        delivered_date TIMESTAMP,
        pickedup_date TIMESTAMP,
        delivery_status VARCHAR(30) NOT NULL CHECK (delivery_status IN ('Pending', 'Selected_for_pickup', 'Pickedup_from_client', 'Inwarehouse', 'Pickedup_from_warehouse', 'Delivered'))
      )
    `);

    // Update existing constraint if table already exists
    try {
      console.log('🔄 Updating delivery_status constraint...');
      await client.query(`
        ALTER TABLE Order_Delivery_Table 
        DROP CONSTRAINT IF EXISTS order_delivery_table_delivery_status_check;
      `);
      
      await client.query(`
        ALTER TABLE Order_Delivery_Table 
        ADD CONSTRAINT order_delivery_table_delivery_status_check 
        CHECK (delivery_status IN ('Pending', 'Selected_for_pickup', 'Pickedup_from_client', 'Inwarehouse', 'Pickedup_from_warehouse', 'Delivered'));
      `);
      
      await client.query(`
        ALTER TABLE Order_Delivery_Table 
        ALTER COLUMN delivery_status TYPE VARCHAR(30);
      `);
      
      console.log('✅ Delivery status constraint updated successfully');
    } catch (constraintError) {
      console.log('ℹ️  Constraint update info:', constraintError.message);
      // Don't throw error - table might be new
    }

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_delivery_order_id ON Order_Delivery_Table(order_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_person_id ON Order_Delivery_Table(delivery_person_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_status ON Order_Delivery_Table(delivery_status);
    `);

    console.log('Order_Delivery_Table ready');
    client.release();
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
};

// Query function
const query = async (text, params) => {
  const client = await pool.connect();
  try {
    const result = await client.query(text, params);
    return result;
  } finally {
    client.release();
  }
};

// Transaction function
const transaction = async (queries) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const results = [];
    
    for (const { text, params } of queries) {
      const result = await client.query(text, params);
      results.push(result);
    }
    
    await client.query('COMMIT');
    return results;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  connectDatabase,
  query,
  transaction
};