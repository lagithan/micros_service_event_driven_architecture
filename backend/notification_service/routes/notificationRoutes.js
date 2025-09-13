const express = require('express');
const NotificationController = require('../controllers/notificationController');

const router = express.Router();

// Input validation middleware
const validateEmailRequest = (req, res, next) => {
  const { to, subject } = req.body;
  
  if (!to || !subject) {
    return res.status(400).json({
      success: false,
      message: 'Email recipient (to) and subject are required'
    });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(to)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }
  
  next();
};

const validateWelcomeEmailRequest = (req, res, next) => {
  const { email, firstName, lastName } = req.body;
  
  if (!email || !firstName || !lastName) {
    return res.status(400).json({
      success: false,
      message: 'Email, firstName, and lastName are required'
    });
  }
  
  // Basic email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid email address'
    });
  }
  
  // Name validation
  if (firstName.trim().length < 1 || lastName.trim().length < 1) {
    return res.status(400).json({
      success: false,
      message: 'First name and last name cannot be empty'
    });
  }
  
  next();
};

// Routes for sending different types of notifications

// Send manual/custom notification
router.post('/send', NotificationController.sendManualNotification);

// Send welcome email
router.post('/welcome', NotificationController.sendWelcome);

// Send login notification
router.post('/login-notification', NotificationController.sendLoginNotification);

// Test email service
router.get('/test', NotificationController.testEmail);

// Get notification service status
router.get('/status', NotificationController.getStatus);

// Health check
router.get('/health', NotificationController.healthCheck);

// Get service information
router.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Notification service information',
    data: {
      service: 'notification-service',
      version: '1.0.0',
      endpoints: {
        send: 'POST /api/notifications/send',
        welcome: 'POST /api/notifications/welcome',
        loginNotification: 'POST /api/notifications/login-notification',
        test: 'GET /api/notifications/test',
        status: 'GET /api/notifications/status',
        health: 'GET /api/notifications/health',
        info: 'GET /api/notifications/info'
      },
      emailProvider: 'Gmail SMTP',
      features: [
        'Welcome emails',
        'Login notifications', 
        'Custom notifications',
        'Kafka event consumption',
        'HTML email templates'
      ],
      rateLimits: {
        customEmails: '5 requests per 15 minutes',
        templateEmails: '10 requests per 15 minutes'
      }
    }
  });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Notification service API documentation',
    data: {
      service: 'notification-service',
      baseUrl: '/api/notifications',
      endpoints: [
        {
          method: 'POST',
          path: '/send',
          description: 'Send a custom notification email',
          parameters: {
            to: 'string (required) - Recipient email address',
            subject: 'string (required) - Email subject',
            message: 'string (required) - Email message content',
            type: 'string (optional) - Notification type',
            firstName: 'string (optional) - Recipient first name',
            lastName: 'string (optional) - Recipient last name'
          },
          rateLimit: '5 requests per 15 minutes'
        },
        {
          method: 'POST',
          path: '/welcome',
          description: 'Send a welcome email using predefined template',
          parameters: {
            email: 'string (required) - Recipient email address',
            firstName: 'string (required) - Recipient first name',
            lastName: 'string (required) - Recipient last name'
          },
          rateLimit: '10 requests per 15 minutes'
        },
        {
          method: 'POST',
          path: '/login-notification',
          description: 'Send a login notification email',
          parameters: {
            email: 'string (required) - Recipient email address',
            firstName: 'string (required) - Recipient first name',
            lastName: 'string (required) - Recipient last name'
          },
          rateLimit: '10 requests per 15 minutes'
        },
        {
          method: 'GET',
          path: '/test',
          description: 'Test email service connection',
          parameters: 'None',
          rateLimit: 'None'
        },
        {
          method: 'GET',
          path: '/status',
          description: 'Get detailed service status',
          parameters: 'None',
          rateLimit: 'None'
        },
        {
          method: 'GET',
          path: '/health',
          description: 'Health check endpoint',
          parameters: 'None',
          rateLimit: 'None'
        }
      ]
    }
  });
});

// Error handling middleware for notification routes
router.use((error, req, res, next) => {
  console.error('Notification route error:', error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details
    });
  }
  
  if (error.code === 'EAUTH') {
    return res.status(500).json({
      success: false,
      message: 'Email authentication failed. Please check email service configuration.'
    });
  }
  
  if (error.code === 'ECONNECTION') {
    return res.status(500).json({
      success: false,
      message: 'Failed to connect to email service.'
    });
  }
  
  // Generic error response
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;