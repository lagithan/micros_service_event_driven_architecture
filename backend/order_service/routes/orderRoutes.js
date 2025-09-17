const express = require('express');
const OrderController = require('../controllers/orderController');

const router = express.Router();

// Input validation middleware
const validateOrderCreation = (req, res, next) => {
  const { senderName, receiverName, receiverPhone, pickupAddress, destinationAddress } = req.body;
  
  if (!senderName || !receiverName || !receiverPhone || !pickupAddress || !destinationAddress) {
    return res.status(400).json({
      success: false,
      message: 'senderName, receiverName, receiverPhone, pickupAddress, and destinationAddress are required'
    });
  }
  
  // Basic phone number validation
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  if (!phoneRegex.test(receiverPhone.replace(/\s+/g, ''))) {
    return res.status(400).json({
      success: false,
      message: 'Please provide a valid phone number'
    });
  }
  
  // Name validation
  if (senderName.trim().length < 1 || receiverName.trim().length < 1) {
    return res.status(400).json({
      success: false,
      message: 'Sender name and receiver name cannot be empty'
    });
  }
  
  // Address validation
  if (pickupAddress.trim().length < 5 || destinationAddress.trim().length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Addresses must be at least 5 characters long'
    });
  }
  
  next();
};

const validateStatusUpdate = (req, res, next) => {
  const { newStatus, statusChangedBy } = req.body;
  
  if (!newStatus || !statusChangedBy) {
    return res.status(400).json({
      success: false,
      message: 'newStatus and statusChangedBy are required'
    });
  }
  
  const validStatuses = ['Pending', 'Selected_for_pickup', 'Pickedup_from_client', 'Inwarehouse', 'Pickedup_from_warehouse', 'Delivered', 'Cancelled'];
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
    });
  }
  
  next();
};

const validateTrackingNumber = (req, res, next) => {
  const { trackingNumber } = req.params;
  
  if (!trackingNumber || trackingNumber.length < 5) {
    return res.status(400).json({
      success: false,
      message: 'Valid tracking number is required'
    });
  }
  
  next();
};

// Order routes

// Create new order
router.post('/', validateOrderCreation, OrderController.createOrder);

// Get order by order ID
router.get('/order/:orderId', OrderController.getOrder);

// Get order by tracking number
router.get('/tracking/:trackingNumber', validateTrackingNumber, OrderController.getOrder);

// Track order with status history
router.get('/track/:trackingNumber', validateTrackingNumber, OrderController.trackOrder);

// Update order status
router.patch('/:orderId/status', validateStatusUpdate, OrderController.updateOrderStatus);

// Cancel order
router.patch('/:orderId/cancel', OrderController.cancelOrder);

// Get orders for a specific user
router.get('/user/:userId', OrderController.getUserOrders);

// Get orders for a specific client (business)
router.get('/client/:clientId', OrderController.getUserOrders);

// Get orders for a specific driver
router.get('/driver/:driverId', OrderController.getUserOrders);

// Get order statistics
router.get('/statistics', OrderController.getOrderStatistics);

// Get all orders with pagination (admin/system use)
router.get('/', (req, res) => {
  // This would typically be an admin-only endpoint
  res.status(200).json({
    success: true,
    message: 'Order list endpoint - typically restricted to admin users',
    note: 'Use specific endpoints like /user/:userId, /client/:clientId, or /driver/:driverId instead'
  });
});

// Health check for order routes
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Order routes are healthy',
    service: 'order-service',
    routes: {
      available: [
        'POST /api/orders',
        'GET /api/orders/order/:orderId',
        'GET /api/orders/tracking/:trackingNumber', 
        'GET /api/orders/track/:trackingNumber',
        'PATCH /api/orders/:orderId/status',
        'PATCH /api/orders/:orderId/cancel',
        'GET /api/orders/user/:userId',
        'GET /api/orders/client/:clientId',
        'GET /api/orders/driver/:driverId',
        'GET /api/orders/statistics'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Order service API documentation',
    data: {
      service: 'order-service',
      baseUrl: '/api/orders',
      endpoints: [
        {
          method: 'POST',
          path: '/',
          description: 'Create a new order',
          parameters: {
            senderName: 'string (required) - Name of the sender',
            receiverName: 'string (required) - Name of the receiver',
            receiverPhone: 'string (required) - Phone number of the receiver',
            pickupAddress: 'string (required) - Pickup address',
            destinationAddress: 'string (required) - Destination address',
            userId: 'integer (optional) - User ID placing the order',
            clientId: 'integer (optional) - Client/business ID',
            packageDetails: 'string (optional) - Description of package contents',
            specialInstructions: 'string (optional) - Special delivery instructions',
            estimatedDeliveryDate: 'datetime (optional) - Estimated delivery date'
          }
        },
        {
          method: 'GET',
          path: '/order/:orderId',
          description: 'Get order details by order ID',
          parameters: {
            orderId: 'string (required) - Order ID'
          }
        },
        {
          method: 'GET',
          path: '/tracking/:trackingNumber',
          description: 'Get order details by tracking number',
          parameters: {
            trackingNumber: 'string (required) - Tracking number'
          }
        },
        {
          method: 'GET',
          path: '/track/:trackingNumber',
          description: 'Track order with complete status history',
          parameters: {
            trackingNumber: 'string (required) - Tracking number'
          }
        },
        {
          method: 'PATCH',
          path: '/:orderId/status',
          description: 'Update order status',
          parameters: {
            orderId: 'string (required) - Order ID',
            newStatus: 'string (required) - New status (Pending, Selected_for_pickup, Pickedup_from_client, Inwarehouse, Pickedup_from_warehouse, Delivered, Cancelled)',
            statusChangedBy: 'string (required) - Who changed the status',
            changeReason: 'string (optional) - Reason for status change',
            location: 'string (optional) - Current location',
            driverId: 'integer (optional) - Driver ID if assigned'
          }
        },
        {
          method: 'PATCH',
          path: '/:orderId/cancel',
          description: 'Cancel an order',
          parameters: {
            orderId: 'string (required) - Order ID',
            cancelReason: 'string (optional) - Reason for cancellation',
            cancelledBy: 'string (required) - Who cancelled the order'
          }
        },
        {
          method: 'GET',
          path: '/user/:userId',
          description: 'Get orders for a specific user',
          parameters: {
            userId: 'string (required) - User ID',
            page: 'integer (optional) - Page number (default: 1)',
            limit: 'integer (optional) - Items per page (default: 20)',
            status: 'string (optional) - Filter by order status'
          }
        },
        {
          method: 'GET',
          path: '/statistics',
          description: 'Get order statistics',
          parameters: {
            userId: 'string (optional) - Filter by user ID',
            clientId: 'string (optional) - Filter by client ID',
            driverId: 'string (optional) - Filter by driver ID'
          }
        }
      ],
      orderStatuses: [
        'Pending - Order created but not yet selected for pickup',
        'Selected_for_pickup - Order selected by driver, ready for client pickup',
        'Pickedup_from_client - Order picked up from client, transport to warehouse',
        'Inwarehouse - Order stored in warehouse, ready for final delivery',
        'Pickedup_from_warehouse - Order picked up from warehouse for final delivery',
        'Delivered - Order has been delivered to recipient',
        'Cancelled - Order has been cancelled'
      ],
      responseFormat: {
        success: 'boolean - Whether the request was successful',
        message: 'string - Human-readable message',
        data: 'object - Response data (varies by endpoint)',
        error: 'string - Error message (only present in development mode on errors)'
      }
    }
  });
});

// Error handling middleware for order routes
router.use((error, req, res, next) => {
  console.error('Order route error:', error);
  
  // Handle specific error types
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details
    });
  }
  
  if (error.code === '23505') { // PostgreSQL unique constraint violation
    return res.status(409).json({
      success: false,
      message: 'Order with this ID or tracking number already exists'
    });
  }
  
  if (error.code === '23503') { // PostgreSQL foreign key constraint violation
    return res.status(400).json({
      success: false,
      message: 'Referenced user, client, or driver does not exist'
    });
  }
  
  if (error.message.includes('Invalid status transition')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }
  
  if (error.message.includes('Order not found')) {
    return res.status(404).json({
      success: false,
      message: error.message
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