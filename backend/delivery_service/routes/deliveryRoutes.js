const express = require('express');
const DeliveryController = require('../controllers/DeliveryController');

const router = express.Router();

// Input validation middleware
const validateDeliveryCreation = (req, res, next) => {
  const { deliveryPersonId, deliveryPersonName, orderId, deliveryStatus } = req.body;

  if (!deliveryPersonId || !deliveryPersonName || !orderId || !deliveryStatus) {
    return res.status(400).json({
      success: false,
      message: 'deliveryPersonId, deliveryPersonName, orderId, and deliveryStatus are required'
    });
  }

  const validStatuses = ['Picking', 'PickedUp', 'Delivering', 'Delivered'];
  if (!validStatuses.includes(deliveryStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid delivery status. Valid statuses are: ${validStatuses.join(', ')}`
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

  const validStatuses = ['Picking', 'PickedUp', 'Delivering', 'Delivered'];
  if (!validStatuses.includes(newStatus)) {
    return res.status(400).json({
      success: false,
      message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
    });
  }

  next();
};

const validateOrderId = (req, res, next) => {
  const { orderId } = req.params;

  if (!orderId || orderId.trim() === '') {
    return res.status(400).json({
      success: false,
      message: 'Valid orderId is required'
    });
  }

  next();
};

// Delivery routes

// Create new delivery
router.post('/', validateDeliveryCreation, DeliveryController.createDelivery);

// Get delivery by order ID
router.get('/order/:orderId', validateOrderId, DeliveryController.getDelivery);

// Update delivery status
router.patch('/status/:orderId', validateOrderId, DeliveryController.updateDeliveryStatus);

// Cancel delivery
router.patch('/:orderId/cancel', validateOrderId, DeliveryController.cancelDelivery);

// Get deliveries for a specific delivery person
router.get('/person/:deliveryPersonId', DeliveryController.getDeliveriesForPerson);

// Get delivery statistics
router.get('/statistics', DeliveryController.getDeliveryStatistics);

// Get available orders for pickup
router.get('/available-orders', DeliveryController.getAvailableOrders);

// Assign order to delivery person
router.post('/assign/:orderId', validateOrderId, DeliveryController.assignOrderToDriver);

// Get my deliveries for a delivery person
router.get('/my/:deliveryPersonId', DeliveryController.getMyDeliveries);

// Update cash payment status
router.patch('/payment/:orderId', validateOrderId, DeliveryController.updateCashPaymentStatus);

// Health check for delivery routes
router.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Delivery routes are healthy',
    service: 'delivery-service',
    routes: {
      available: [
        'POST /api/deliveries',
        'GET /api/deliveries/order/:orderId',
        'PATCH /api/deliveries/status/:orderId',
        'PATCH /api/deliveries/:orderId/cancel',
        'GET /api/deliveries/person/:deliveryPersonId',
        'GET /api/deliveries/statistics',
        'GET /api/deliveries/available-orders',
        'POST /api/deliveries/assign/:orderId',
        'GET /api/deliveries/my/:deliveryPersonId',
        'PATCH /api/deliveries/payment/:orderId'
      ]
    },
    timestamp: new Date().toISOString()
  });
});

// API documentation endpoint
router.get('/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Delivery service API documentation',
    data: {
      service: 'delivery-service',
      baseUrl: '/api/deliveries',
      endpoints: [
        {
          method: 'POST',
          path: '/',
          description: 'Create a new delivery',
          parameters: {
            deliveryPersonId: 'integer (required) - Delivery person ID',
            deliveryPersonName: 'string (required) - Delivery person name',
            orderId: 'string (required) - Order ID',
            pickedupDate: 'datetime (optional) - Picked up date',
            deliveredDate: 'datetime (optional) - Delivered date',
            deliveryStatus: 'string (required) - Delivery status (Picking, PickedUp, Delivering, Delivered)'
          }
        },
        {
          method: 'GET',
          path: '/order/:orderId',
          description: 'Get delivery details by order ID',
          parameters: {
            orderId: 'string (required) - Order ID'
          }
        },
        {
          method: 'PATCH',
          path: '/:orderId/status',
          description: 'Update delivery status',
          parameters: {
            orderId: 'string (required) - Order ID',
            newStatus: 'string (required) - New status (Picking, PickedUp, Delivering, Delivered)',
            statusChangedBy: 'string (required) - Who changed the status',
            changeReason: 'string (optional) - Reason for status change',
            location: 'string (optional) - Current location'
          }
        },
        {
          method: 'PATCH',
          path: '/:orderId/cancel',
          description: 'Cancel a delivery',
          parameters: {
            orderId: 'string (required) - Order ID',
            cancelReason: 'string (optional) - Reason for cancellation',
            cancelledBy: 'string (required) - Who cancelled the delivery'
          }
        },
        {
          method: 'GET',
          path: '/person/:deliveryPersonId',
          description: 'Get deliveries for a specific delivery person',
          parameters: {
            deliveryPersonId: 'string (required) - Delivery person ID',
            page: 'integer (optional) - Page number (default: 1)',
            limit: 'integer (optional) - Items per page (default: 20)',
            status: 'string (optional) - Filter by delivery status'
          }
        },
        {
          method: 'GET',
          path: '/statistics',
          description: 'Get delivery statistics',
          parameters: {
            deliveryPersonId: 'string (optional) - Filter by delivery person ID'
          }
        }
      ],
      deliveryStatuses: [
        'Picking - Delivery person is picking up the order',
        'PickedUp - Order has been picked up',
        'Delivering - Order is being delivered',
        'Delivered - Order has been delivered'
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

// Error handling middleware for delivery routes
router.use((error, req, res, next) => {
  console.error('Delivery route error:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: error.details
    });
  }

  if (error.code === '23505') {
    return res.status(409).json({
      success: false,
      message: 'Delivery record already exists for this order'
    });
  }

  if (error.code === '23503') {
    return res.status(400).json({
      success: false,
      message: 'Referenced delivery person does not exist'
    });
  }

  if (error.message.includes('Invalid status transition')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  if (error.message.includes('Delivery not found')) {
    return res.status(404).json({
      success: false,
      message: error.message
    });
  }

  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;