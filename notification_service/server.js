const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();
const { initKafkaConsumer } = require('./config/kafka');
const { initEmailService } = require('./config/email');
const NotificationController = require('./controllers/notificationController');

const app = express();
const PORT = process.env.PORT || 5002;
const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:5000';
const SERVICE_NAME = 'notification-service';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    service: SERVICE_NAME,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: {
      emailService: 'ready',
      kafkaConsumer: 'connected'
    }
  });
});

// Service info endpoint
app.get('/info', (req, res) => {
  res.status(200).json({
    service: SERVICE_NAME,
    version: '1.0.0',
    capabilities: ['notifications', 'email-delivery', 'message-queue'],
    routes: ['/api/notifications', '/api/send-notification'],
    registeredWith: 'api-gateway',
    timestamp: new Date().toISOString()
  });
});

// Manual notification endpoint (for testing)
app.post('/api/send-notification', NotificationController.sendManualNotification);

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
        routes: ['/api/notifications', '/api/send-notification'],
        metadata: {
          version: '1.0.0',
          capabilities: ['notifications', 'email-delivery', 'message-queue'],
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
    await initEmailService();
    await initKafkaConsumer();
    app.listen(PORT, () => {
      setTimeout(() => {
        selfRegister();
        setTimeout(() => {
          startHealthBeacon();
        }, 60000);
      }, 2000);
    });
  } catch (error) {
    console.error('Failed to start Notification Service:', error);
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