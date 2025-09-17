const { Pool } = require('pg');

const pool = n        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        status_changed_by VARCHAR(100),ol({
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
    
    // Create orders table
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        id SERIAL PRIMARY KEY,
        order_id VARCHAR(100) UNIQUE NOT NULL,
        sender_name VARCHAR(255) NOT NULL,
        receiver_name VARCHAR(255) NOT NULL,
        receiver_phone VARCHAR(20) NOT NULL,
        pickup_address TEXT NOT NULL,
        destination_address TEXT NOT NULL,
        order_status VARCHAR(50) NOT NULL DEFAULT 'Pending' CHECK (order_status IN ('Pending', 'Selected_for_pickup', 'Pickedup_from_client', 'Inwarehouse', 'Pickedup_from_warehouse', 'Delivered', 'Cancelled')),
        user_id INTEGER,
        client_id INTEGER,
        driver_id INTEGER,
        package_details TEXT,
        special_instructions TEXT,
        estimated_delivery_date TIMESTAMP,
        actual_pickup_date TIMESTAMP,
        actual_delivery_date TIMESTAMP,
        tracking_number VARCHAR(100) UNIQUE,
        cash_paid BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create order_status_history table for tracking status changes
    await client.query(`
      CREATE TABLE IF NOT EXISTS order_status_history (
        id SERIAL PRIMARY KEY,
        order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
        previous_status VARCHAR(50),
        new_status VARCHAR(50) NOT NULL,
        status_changed_by VARCHAR(100),
        change_reason TEXT,
        location TEXT,
        changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
      CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
      CREATE INDEX IF NOT EXISTS idx_orders_client_id ON orders(client_id);
      CREATE INDEX IF NOT EXISTS idx_orders_driver_id ON orders(driver_id);
      CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
      CREATE INDEX IF NOT EXISTS idx_orders_tracking ON orders(tracking_number);
      CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
    `);
    
    console.log('All tables ready (orders, order_status_history)');
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