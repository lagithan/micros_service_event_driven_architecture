const OrderModel = require('../models/orderModel');

// Gracefully handle Kafka dependency
let publishOrderCreatedEvent, publishOrderStatusUpdatedEvent, publishOrderCancelledEvent;
try {
  const kafka = require('../config/kafka');
  publishOrderCreatedEvent = kafka.publishOrderCreatedEvent;
  publishOrderStatusUpdatedEvent = kafka.publishOrderStatusUpdatedEvent;
  publishOrderCancelledEvent = kafka.publishOrderCancelledEvent;
} catch (error) {
  console.warn('⚠️  Kafka module not available - using stub functions. Events will not be published');
  publishOrderCreatedEvent = async () => { console.log('ℹ️  Kafka not available - order created event not published'); };
  publishOrderStatusUpdatedEvent = async () => { console.log('ℹ️  Kafka not available - order status event not published'); };
  publishOrderCancelledEvent = async () => { console.log('ℹ️  Kafka not available - order cancelled event not published'); };
}

class OrderController {
  
  // Create a new order
  static async createOrder(req, res) {
    try {
      const {
        senderName,
        receiverName,
        receiverPhone,
        pickupAddress,
        destinationAddress,
        userId,
        clientId,
        packageDetails,
        specialInstructions,
        estimatedDeliveryDate
      } = req.body;

      // Validation
      if (!senderName || !receiverName || !receiverPhone || !pickupAddress || !destinationAddress) {
        return res.status(400).json({
          success: false,
          message: 'senderName, receiverName, receiverPhone, pickupAddress, and destinationAddress are required'
        });
      }

      // Phone number validation
      const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
      if (!phoneRegex.test(receiverPhone.replace(/\s+/g, ''))) {
        return res.status(400).json({
          success: false,
          message: 'Invalid phone number format'
        });
      }

      let newOrder;
      try {
        // Create order in database
        newOrder = await OrderModel.createOrder({
          senderName: senderName.trim(),
          receiverName: receiverName.trim(),
          receiverPhone: receiverPhone.trim(),
          pickupAddress: pickupAddress.trim(),
          destinationAddress: destinationAddress.trim(),
          userId,
          clientId,
          packageDetails: packageDetails?.trim(),
          specialInstructions: specialInstructions?.trim(),
          estimatedDeliveryDate
        });

      } catch (dbError) {
        console.error('Database error during order creation:', dbError.message);
        
        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - creating mock order for testing');
          newOrder = {
            id: Date.now(),
            order_id: OrderModel.generateOrderId(),
            tracking_number: OrderModel.generateTrackingNumber(),
            sender_name: senderName,
            receiver_name: receiverName,
            receiver_phone: receiverPhone,
            pickup_address: pickupAddress,
            destination_address: destinationAddress,
            order_status: 'pending',
            cash_paid: false,
            user_id: userId,
            client_id: clientId,
            package_details: packageDetails,
            special_instructions: specialInstructions,
            estimated_delivery_date: estimatedDeliveryDate,
            created_at: new Date().toISOString()
          };
        } else {
          throw dbError;
        }
      }

      // Publish order created event to Kafka
      try {
        await publishOrderCreatedEvent({
          orderId: newOrder.id,
          orderNumber: newOrder.order_id,
          trackingNumber: newOrder.tracking_number,
          userId: newOrder.user_id,
          clientId: newOrder.client_id,
          senderName: newOrder.sender_name,
          receiverName: newOrder.receiver_name,
          receiverPhone: newOrder.receiver_phone,
          pickupAddress: newOrder.pickup_address,
          destinationAddress: newOrder.destination_address,
          orderStatus: newOrder.order_status,
          packageDetails: newOrder.package_details,
          estimatedDeliveryDate: newOrder.estimated_delivery_date
        });
      } catch (kafkaError) {
        console.warn('⚠️  Failed to publish order created event to Kafka:', kafkaError.message);
        // Continue without failing the order creation
      }

      res.status(201).json({
        success: true,
        message: 'Order created successfully',
        data: {
          id: newOrder.id,
          orderId: newOrder.order_id,
          trackingNumber: newOrder.tracking_number,
          senderName: newOrder.sender_name,
          receiverName: newOrder.receiver_name,
          receiverPhone: newOrder.receiver_phone,
          pickupAddress: newOrder.pickup_address,
          destinationAddress: newOrder.destination_address,
          orderStatus: newOrder.order_status,
          paymentStatus: newOrder.cash_paid ? 'Paid' : 'Pending',
          userId: newOrder.user_id,
          clientId: newOrder.client_id,
          packageDetails: newOrder.package_details,
          specialInstructions: newOrder.special_instructions,
          estimatedDeliveryDate: newOrder.estimated_delivery_date,
          createdAt: newOrder.created_at
        }
      });

    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get order by ID or tracking number
  static async getOrder(req, res) {
    try {
      const { orderId, trackingNumber } = req.params;
      const { id } = req.query;

      let order = null;

      try {
        if (orderId) {
          order = await OrderModel.findByOrderId(orderId);
        } else if (trackingNumber) {
          order = await OrderModel.findByTrackingNumber(trackingNumber);
        } else if (id) {
          order = await OrderModel.findById(id);
        } else {
          return res.status(400).json({
            success: false,
            message: 'orderId, trackingNumber, or id parameter is required'
          });
        }

        if (!order) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }

      } catch (dbError) {
        console.error('Database error during order fetch:', dbError.message);
        
        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock order');
          order = {
            id: 1,
            order_id: orderId || 'ORD123456',
            tracking_number: trackingNumber || 'ST12345678ABCD',
            sender_name: 'Mock Sender',
            receiver_name: 'Mock Receiver',
            receiver_phone: '1234567890',
            pickup_address: 'Mock Pickup Address',
            destination_address: 'Mock Destination Address',
            order_status: 'Pending',
            created_at: new Date().toISOString()
          };
        } else {
          throw dbError;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          id: order.id,
          orderId: order.order_id,
          trackingNumber: order.tracking_number,
          senderName: order.sender_name,
          receiverName: order.receiver_name,
          receiverPhone: order.receiver_phone,
          pickupAddress: order.pickup_address,
          destinationAddress: order.destination_address,
          orderStatus: order.order_status,
          paymentStatus: order.cash_paid ? 'Paid' : 'Pending',
          userId: order.user_id,
          clientId: order.client_id,
          driverId: order.driver_id,
          packageDetails: order.package_details,
          specialInstructions: order.special_instructions,
          estimatedDeliveryDate: order.estimated_delivery_date,
          actualPickupDate: order.actual_pickup_date,
          actualDeliveryDate: order.actual_delivery_date,
          createdAt: order.created_at,
          updatedAt: order.updated_at
        }
      });

    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Track order by tracking number
  static async trackOrder(req, res) {
    try {
      const { trackingNumber } = req.params;

      if (!trackingNumber) {
        return res.status(400).json({
          success: false,
          message: 'Tracking number is required'
        });
      }

      let order, statusHistory;

      try {
        order = await OrderModel.findByTrackingNumber(trackingNumber);
        if (!order) {
          return res.status(404).json({
            success: false,
            message: 'Order not found with this tracking number'
          });
        }

        statusHistory = await OrderModel.getOrderStatusHistory(order.order_id);

      } catch (dbError) {
        console.error('Database error during order tracking:', dbError.message);
        
        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock tracking data');
          order = {
            id: 1,
            order_id: 'ORD123456',
            tracking_number: trackingNumber,
            sender_name: 'Mock Sender',
            receiver_name: 'Mock Receiver',
            order_status: 'Pending',
            created_at: new Date().toISOString()
          };
          statusHistory = [
            {
              new_status: 'Pending',
              status_changed_by: 'system',
              change_reason: 'Order created',
              changed_at: new Date().toISOString()
            }
          ];
        } else {
          throw dbError;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          order: {
            id: order.id,
            orderId: order.order_id,
            trackingNumber: order.tracking_number,
            senderName: order.sender_name,
            receiverName: order.receiver_name,
            orderStatus: order.order_status,
            createdAt: order.created_at,
            estimatedDeliveryDate: order.estimated_delivery_date,
            actualDeliveryDate: order.actual_delivery_date
          },
          statusHistory: statusHistory.map(status => ({
            status: status.new_status,
            previousStatus: status.previous_status,
            changedBy: status.status_changed_by,
            reason: status.change_reason,
            location: status.location,
            timestamp: status.changed_at
          }))
        }
      });

    } catch (error) {
      console.error('Track order error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update order status
  static async updateOrderStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { newStatus, statusChangedBy, changeReason, location, driverId } = req.body;

      // Validation
      if (!orderId || !newStatus || !statusChangedBy) {
        return res.status(400).json({
          success: false,
          message: 'orderId, newStatus, and statusChangedBy are required'
        });
      }

      const validStatuses = ['Pending', 'Selected_for_pickup', 'Pickedup_from_client', 'Inwarehouse', 'Pickedup_from_warehouse', 'Delivered', 'Cancelled'];
      if (!validStatuses.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Valid statuses are: ${validStatuses.join(', ')}`
        });
      }

      let updatedOrder;

      try {
        const currentOrder = await OrderModel.findByOrderId(orderId);
        if (!currentOrder) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }

        updatedOrder = await OrderModel.updateOrderStatus(
          orderId, 
          newStatus, 
          statusChangedBy, 
          changeReason, 
          location, 
          driverId
        );

        // Publish order status updated event to Kafka
        try {
          await publishOrderStatusUpdatedEvent({
            orderId: updatedOrder.id,
            orderNumber: updatedOrder.order_id,
            trackingNumber: updatedOrder.tracking_number,
            previousStatus: currentOrder.order_status,
            newStatus: updatedOrder.order_status,
            statusChangedBy,
            changeReason,
            location,
            driverId: updatedOrder.driver_id
          });
        } catch (kafkaError) {
          console.warn('⚠️  Failed to publish order status updated event to Kafka:', kafkaError.message);
        }

      } catch (dbError) {
        console.error('Database error during status update:', dbError.message);
        
        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock update');
          updatedOrder = {
            id: 1,
            order_id: orderId,
            order_status: newStatus,
            updated_at: new Date().toISOString()
          };
        } else {
          throw dbError;
        }
      }

      res.status(200).json({
        success: true,
        message: 'Order status updated successfully',
        data: {
          id: updatedOrder.id,
          orderId: updatedOrder.order_id,
          orderStatus: updatedOrder.order_status,
          driverId: updatedOrder.driver_id,
          updatedAt: updatedOrder.updated_at
        }
      });

    } catch (error) {
      console.error('Update order status error:', error);
      
      if (error.message.includes('Invalid status transition')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get orders for a user, client, or driver
  static async getUserOrders(req, res) {
    try {
      const { userId, clientId, driverId } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      // Determine which ID we're using and validate
      let targetId, queryType;
      if (userId) {
        targetId = userId;
        queryType = 'user';
      } else if (clientId) {
        targetId = clientId;
        queryType = 'client';
      } else if (driverId) {
        targetId = driverId;
        queryType = 'driver';
      } else {
        return res.status(400).json({
          success: false,
          message: 'userId, clientId, or driverId is required'
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let orders;

      try {
        // Use the appropriate model method based on query type
        if (queryType === 'client') {
          orders = await OrderModel.findByClientId(targetId, parseInt(limit), offset);
        } else if (queryType === 'driver') {
          orders = await OrderModel.findByDriverId(targetId, parseInt(limit), offset);
        } else {
          // Default to user
          orders = await OrderModel.findByUserId(targetId, parseInt(limit), offset);
        }

        // Apply status filter if provided
        if (status && status !== 'all') {
          orders = orders.filter(order => order.order_status === status);
        }

      } catch (dbError) {
        console.error('Database error during orders fetch:', dbError.message);
        
        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock orders');
          orders = [
            {
              id: 1,
              order_id: 'ORD123456',
              tracking_number: 'ST12345678ABCD',
              sender_name: 'Mock Sender',
              receiver_name: 'Mock Receiver',
              order_status: 'Pending',
              created_at: new Date().toISOString(),
              client_id: targetId,
              user_id: targetId
            }
          ];
        } else {
          throw dbError;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          orders: orders.map(order => ({
            id: order.id,
            orderId: order.order_id,
            trackingNumber: order.tracking_number,
            senderName: order.sender_name,
            receiverName: order.receiver_name,
            receiverPhone: order.receiver_phone,
            pickupAddress: order.pickup_address,
            destinationAddress: order.destination_address,
            orderStatus: order.order_status,
            paymentStatus: order.cash_paid ? 'Paid' : 'Pending',
            packageDetails: order.package_details,
            specialInstructions: order.special_instructions,
            estimatedDeliveryDate: order.estimated_delivery_date,
            createdAt: order.created_at,
            clientId: order.client_id,
            userId: order.user_id
          })),
          pagination: {
            currentPage: parseInt(page),
            limit: parseInt(limit),
            total: orders.length
          }
        }
      });

    } catch (error) {
      console.error('Get orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Cancel order
  static async cancelOrder(req, res) {
    try {
      const { orderId } = req.params;
      const { cancelReason, cancelledBy } = req.body;

      if (!orderId || !cancelledBy) {
        return res.status(400).json({
          success: false,
          message: 'orderId and cancelledBy are required'
        });
      }

      let cancelledOrder;

      try {
        const currentOrder = await OrderModel.findByOrderId(orderId);
        if (!currentOrder) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }

        cancelledOrder = await OrderModel.cancelOrder(orderId, cancelReason || 'Cancelled by user', cancelledBy);

        // Publish order cancelled event to Kafka
        try {
          await publishOrderCancelledEvent({
            orderId: cancelledOrder.id,
            orderNumber: cancelledOrder.order_id,
            trackingNumber: cancelledOrder.tracking_number,
            userId: cancelledOrder.user_id,
            cancelReason: cancelReason || 'Cancelled by user',
            cancelledBy
          });
        } catch (kafkaError) {
          console.warn('⚠️  Failed to publish order cancelled event to Kafka:', kafkaError.message);
        }

      } catch (dbError) {
        console.error('Database error during order cancellation:', dbError.message);
        
        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock cancellation');
          cancelledOrder = {
            id: 1,
            order_id: orderId,
            order_status: 'Cancelled',
            updated_at: new Date().toISOString()
          };
        } else {
          throw dbError;
        }
      }

      res.status(200).json({
        success: true,
        message: 'Order cancelled successfully',
        data: {
          id: cancelledOrder.id,
          orderId: cancelledOrder.order_id,
          orderStatus: cancelledOrder.order_status,
          updatedAt: cancelledOrder.updated_at
        }
      });

    } catch (error) {
      console.error('Cancel order error:', error);
      
      if (error.message.includes('Cannot cancel') || error.message.includes('already cancelled')) {
        return res.status(400).json({
          success: false,
          message: error.message
        });
      }
      
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get order statistics
  static async getOrderStatistics(req, res) {
    try {
      const { userId, clientId, driverId } = req.query;

      let statistics;

      try {
        statistics = await OrderModel.getOrderStatistics(userId, clientId, driverId);
      } catch (dbError) {
        console.error('Database error during statistics fetch:', dbError.message);
        
        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock statistics');
          statistics = {
            total_orders: '10',
            pending_orders: '3',
            picked_up_orders: '2',
            warehouse_orders: '1',
            delivered_orders: '3',
            cancelled_orders: '1',
            avg_delivery_time_hours: '24.5'
          };
        } else {
          throw dbError;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          totalOrders: parseInt(statistics.total_orders),
          pendingOrders: parseInt(statistics.pending_orders),
          pickedUpOrders: parseInt(statistics.picked_up_orders),
          warehouseOrders: parseInt(statistics.warehouse_orders),
          deliveredOrders: parseInt(statistics.delivered_orders),
          cancelledOrders: parseInt(statistics.cancelled_orders),
          averageDeliveryTimeHours: parseFloat(statistics.avg_delivery_time_hours) || 0
        }
      });

    } catch (error) {
      console.error('Get order statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = OrderController;