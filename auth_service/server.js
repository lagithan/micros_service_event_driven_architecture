const express = require('express');
const cors = require('cors');
const session = require('express-session');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const { connectDatabase } = require('./config/database');
const { initKafka } = require('./config/kafka');

const app = express();
const PORT = process.env.PORT || 5051;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'auth-service',
    status: 'healthy',
    timestamp: new Date().toISOString()
  });
});

// Service registration with API Gateway
const registerWithGateway = async () => {
  try {
    const serviceInfo = {
      name: 'auth-service',
      url: `http://localhost:${PORT}`,
      health: `http://localhost:${PORT}/health`
    };
    
    console.log('Registering auth-service with API Gateway...');
    // In a real scenario, you would make an HTTP request to the gateway
    console.log('Auth service registered:', serviceInfo);
  } catch (error) {
    console.error('Failed to register with API Gateway:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    // Initialize database connection
    await connectDatabase();
    
    // Initialize Kafka
    await initKafka();
    
    app.listen(PORT, () => {
      console.log(`Auth service running on port ${PORT}`);
      registerWithGateway();
    });
  } catch (error) {
    console.error('Failed to start auth service:', error);
    process.exit(1);
  }
};

startServer();