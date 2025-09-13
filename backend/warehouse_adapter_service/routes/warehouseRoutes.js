const express = require('express');
const WarehouseAdapterController = require('../controllers/warehouseAdapterController');

const router = express.Router();
const controller = new WarehouseAdapterController();

// Input validation middleware
const validateSimulateEvent = (req, res, next) => {
  const { eventType, orderData } = req.body;
  
  if (!eventType || !orderData) {
    return res.status(400).json({
      success: false,
      message: 'eventType and orderData are required'
    });
  }
  
  const validEventTypes = ['ORDER_CREATED', 'ORDER_STATUS_UPDATED', 'ORDER_CANCELLED'];
  if (!validEventTypes.includes(eventType)) {
    return res.status(400).json({
      success: false,
      message: `Invalid eventType. Valid types are: ${validEventTypes.join(', ')}`
    });
  }
  
  // Validate required orderData fields based on event type
  if (eventType === 'ORDER_CREATED') {
    const required = ['orderId', 'orderNumber', 'trackingNumber', 'senderName', 'receiverName', 'orderStatus'];
    const missing = required.filter(field => !orderData[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields for ORDER_CREATED: ${missing.join(', ')}`
      });
    }
  }
  
  if (eventType === 'ORDER_STATUS_UPDATED') {
    const required = ['orderId', 'orderNumber', 'trackingNumber', 'newStatus'];
    const missing = required.filter(field => !orderData[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields for ORDER_STATUS_UPDATED: ${missing.join(', ')}`
      });
    }
  }
  
  if (eventType === 'ORDER_CANCELLED') {
    const required = ['orderId', 'orderNumber', 'trackingNumber'];
    const missing = required.filter(field => !orderData[field]);
    if (missing.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Missing required fields for ORDER_CANCELLED: ${missing.join(', ')}`
      });
    }
  }
  
  next();
};

const validateTestMessage = (req, res, next) => {
  const { message } = req.body;
  
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({
      success: false,
      message: 'Valid message content is required'
    });
  }
  
  if (message.length > 1000) {
    return res.status(400).json({
      success: false,
      message: 'Message content cannot exceed 1000 characters'
    });
  }
  
  next();
};

const validateHistoryQuery = (req, res, next) => {
  const { limit } = req.query;
  
  if (limit && (isNaN(parseInt(limit)) || parseInt(limit) < 1 || parseInt(limit) > 1000)) {
    return res.status(400).json({
      success: false,
      message: 'Limit must be a number between 1 and 1000'
    });
  }
  
  next();
};

// Service endpoints

// Health check
router.get('/health', controller.healthCheck.bind(controller));

// Service status and information
router.get('/status', controller.getStatus.bind(controller));
router.get('/info', controller.getServiceInfo.bind(controller));

// Message history and statistics
router.get('/history', validateHistoryQuery, controller.getMessageHistory.bind(controller));
router.get('/statistics', controller.getStatistics.bind(controller));

// Connection testing endpoints
router.get('/test/wms', controller.testWMSConnection.bind(controller));
router.get('/test/order-service', controller.testOrderServiceConnection.bind(controller));

// Manual testing endpoints
router.post('/test/send', validateTestMessage, controller.sendTestMessage.bind(controller));
router.post('/simulate', validateSimulateEvent, controller.simulateWarehouseEvent.bind(controller));

// Maintenance endpoints
router.delete('/history', controller.clearHistory.bind(controller));

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Warehouse Adapter Service API documentation',
    data: {
      service: 'warehouse-adapter-service',
      baseUrl: '/api/warehouse',
      endpoints: [
        {
          method: 'GET',
          path: '/health',
          description: 'Health check endpoint - returns service health status',
          parameters: 'None'
        },
        {
          method: 'GET',
          path: '/status',
          description: 'Get detailed service status including statistics',
          parameters: 'None'
        },
        {
          method: 'GET',
          path: '/info',
          description: 'Get service information and capabilities',
          parameters: 'None'
        },
        {
          method: 'GET',
          path: '/history',
          description: 'Get message history',
          parameters: {
            orderId: 'string (optional) - Filter by order ID',
            limit: 'integer (optional) - Limit results (1-1000, default: 50)'
          }
        },
        {
          method: 'GET',
          path: '/statistics',
          description: 'Get service statistics',
          parameters: 'None'
        },
        {
          method: 'GET',
          path: '/test/wms',
          description: 'Test WMS TCP/IP connection',
          parameters: 'None'
        },
        {
          method: 'GET',
          path: '/test/order-service',
          description: 'Test Order Service HTTP connection',
          parameters: 'None'
        },
        {
          method: 'POST',
          path: '/test/send',
          description: 'Send test message to WMS',
          parameters: {
            message: 'string (required) - Message content to send',
            messageId: 'string (optional) - Custom message ID'
          }
        },
        {
          method: 'POST',
          path: '/simulate',
          description: 'Simulate warehouse event processing',
          parameters: {
            eventType: 'string (required) - ORDER_CREATED, ORDER_STATUS_UPDATED, or ORDER_CANCELLED',
            orderData: 'object (required) - Order data matching the event type'
          }
        },
        {
          method: 'DELETE',
          path: '/history',
          description: 'Clear old message history',
          parameters: {
            hoursToKeep: 'integer (optional) - Hours of history to keep (default: 24)'
          }
        }
      ],
      eventTypes: {
        consumed: [
          {
            type: 'ORDER_CREATED',
            description: 'New order created - sends NEW_ORDER message to WMS',
            tcpFormat: 'NEW_ORDER|OrderNumber|TrackingNumber|Sender|Receiver|Status'
          },
          {
            type: 'ORDER_STATUS_UPDATED',
            description: 'Order status changed - sends ORDER_UPDATE message to WMS',
            tcpFormat: 'ORDER_UPDATE|OrderNumber|TrackingNumber|PrevStatus|NewStatus|Location'
          },
          {
            type: 'ORDER_CANCELLED',
            description: 'Order cancelled - sends ORDER_CANCEL message to WMS',
            tcpFormat: 'ORDER_CANCEL|OrderNumber|TrackingNumber|Reason'
          }
        ]
      },
      responseFormat: {
        success: 'boolean - Whether the request was successful',
        message: 'string - Human-readable message',
        data: 'object - Response data (varies by endpoint)',
        error: 'string - Error message (only present in development mode on errors)'
      }
    }
  });
});

// Routes health check
router.get('/routes/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Warehouse adapter routes are healthy',
    service: 'warehouse-adapter-service',
    routes: {
      available: [
        'GET /api/warehouse/health',
        'GET /api/warehouse/status',
        'GET /api/warehouse/info',
        'GET /api/warehouse/history',
        'GET /api/warehouse/statistics',
        'GET /api/warehouse/test/wms',
        'GET /api/warehouse/test/order-service',
        'POST /api/warehouse/test/send',
        'POST /api/warehouse/simulate',
        'DELETE /api/warehouse/history',
        'GET /api/warehouse/docs'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware for warehouse routes
router.use((error, req, res, next) => {
  console.error('Warehouse adapter route error:', error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details
    });
  }
  
  if (error.code === 'ECONNREFUSED') {
    return res.status(503).json({
      success: false,
      message: 'Service connection failed. External service may be unavailable.'
    });
  }
  
  if (error.message && error.message.includes('timeout')) {
    return res.status(504).json({
      success: false,
      message: 'Request timeout. External service is not responding.'
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