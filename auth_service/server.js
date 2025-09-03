const express = require('express');
const cors = require('cors');
const session = require('express-session');
const axios = require('axios');
require('dotenv').config();
const authRoutes = require('./routes/authRoutes');
const { connectDatabase } = require('./config/database');
const { initKafka } = require('./config/kafka');
const app = express();
const PORT = process.env.PORT || 5001;
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:5000';
const SERVICE_NAME = 'auth-service';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    service: SERVICE_NAME,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: {
      database: 'connected',
      kafka: 'connected'
    }
  });
});

// Service info endpoint
app.get('/info', (req, res) => {
  res.status(200).json({
    service: SERVICE_NAME,
    version: '1.0.0',
    capabilities: ['authentication', 'authorization', 'user-management'],
    routes: ['/api/auth'],
    registeredWith: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Self-registration with API Gateway
const selfRegister = async (maxRetries = 5, delayMs = 3000) => {
  let attempts = 0;
  const tryRegister = async () => {
    attempts++;
    try {
      const serviceInfo = {
        name: SERVICE_NAME,
        url: `http://localhost:${PORT}`,
        health: `http://localhost:${PORT}/health`,
        routes: ['/api/auth'],
        metadata: {
          version: '1.0.0',
          capabilities: ['authentication', 'authorization', 'user-management'],
          registeredAt: new Date().toISOString(),
          registeredBy: 'self-registration'
        }
      };
      const response = await axios.post(`${GATEWAY_URL}/register-service`, serviceInfo, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `${SERVICE_NAME}/1.0.0`
        }
      });
      if (response.status === 201) {
        return true;
      }
    } catch (error) {
      if (attempts < maxRetries) {
        setTimeout(tryRegister, delayMs);
      } else {
        console.error(`Failed to register with API Gateway after ${maxRetries} attempts`);
      }
    }
    return false;
  };
  tryRegister();
};

// Periodic health beacon
const startHealthBeacon = () => {
  setInterval(async () => {
    try {
      const response = await axios.get(`${GATEWAY_URL}/services`, {
        timeout: 5000
      });
      const services = response.data?.data?.services || [];
      const isRegistered = services.some(service => service.name === SERVICE_NAME);
      if (!isRegistered) {
        selfRegister(1, 1000);
      }
    } catch (error) {}
  }, 5 * 60 * 1000);
};

// Graceful deregistration on shutdown
const gracefulShutdown = async () => {
  try {
    await axios.delete(`${GATEWAY_URL}/register-service/${SERVICE_NAME}`, {
      timeout: 5000
    });
  } catch (error) {}
  process.exit(0);
};

// Start server
const startServer = async () => {
  try {
    await connectDatabase();
    await initKafka();
    app.listen(PORT, () => {
      setTimeout(() => {
        selfRegister();
        setTimeout(() => {
          startHealthBeacon();
        }, 60000);
      }, 2000);
    });
  } catch (error) {
    console.error('Failed to start Auth Service:', error);
    process.exit(1);
  }
};

// Signal handlers for graceful shutdown
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  gracefulShutdown();
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

startServer();