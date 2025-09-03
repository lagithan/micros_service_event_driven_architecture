const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { initKafkaConsumer } = require('./config/kafka');
const { initEmailService } = require('./config/email');
const NotificationController = require('./controllers/notificationController');

const app = express();
const PORT = process.env.PORT || 5002;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/notifications', require('./routes/notificationRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    service: 'notification-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
    emailService: 'ready',
    kafkaConsumer: 'connected'
  });
});

// Manual notification endpoint (for testing)
app.post('/api/send-notification', NotificationController.sendManualNotification);

// Service registration with API Gateway
const registerWithGateway = async () => {
  try {
    const serviceInfo = {
      name: 'notification-service',
      url: `http://localhost:${PORT}`,
      health: `http://localhost:${PORT}/health`
    };
    
    console.log('Registering notification-service with API Gateway...');
    // In a real scenario, you would make an HTTP request to the gateway
    console.log('Notification service registered:', serviceInfo);
  } catch (error) {
    console.error('Failed to register with API Gateway:', error);
  }
};

// Start server
const startServer = async () => {
  try {
    // Initialize email service
    await initEmailService();
    
    // Initialize Kafka consumer
    await initKafkaConsumer();
    
    app.listen(PORT, () => {
      console.log(`Notification service running on port ${PORT}`);
      registerWithGateway();
    });
  } catch (error) {
    console.error('Failed to start notification service:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down notification service...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down notification service...');
  process.exit(0);
});

startServer();