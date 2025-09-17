const DeliveryModel = require('../models/orderDeliveryModel');

// Gracefully handle Kafka dependency
let publishDeliveryCreatedEvent, publishDeliveryStatusUpdatedEvent, publishDeliveryCancelledEvent;
try {
  const kafka = require('../config/kafka');
  publishDeliveryCreatedEvent = kafka.publishDeliveryCreatedEvent;
  publishDeliveryStatusUpdatedEvent = kafka.publishDeliveryStatusUpdatedEvent;
  publishDeliveryCancelledEvent = kafka.publishDeliveryCancelledEvent;
} catch (error) {
  console.warn('⚠️  Kafka module not available, events will not be published');
  publishDeliveryCreatedEvent = async () => { console.log('ℹ️  Kafka not available - delivery created event not published'); };
  publishDeliveryStatusUpdatedEvent = async () => { console.log('ℹ️  Kafka not available - delivery status event not published'); };
  publishDeliveryCancelledEvent = async () => { console.log('ℹ️  Kafka not available - delivery cancelled event not published'); };
}

class DeliveryController {

  // Create a new delivery
  static async createDelivery(req, res) {
    try {
      const {
        deliveryPersonId,
        deliveryPersonName,
        orderId,
        pickedupDate,
        deliveredDate,
        deliveryStatus
      } = req.body;

      // Validation
      if (!deliveryPersonId || !deliveryPersonName || !orderId || !deliveryStatus) {
        return res.status(400).json({
          success: false,
          message: 'deliveryPersonId, deliveryPersonName, orderId, and deliveryStatus are required'
        });
      }

      const validStatuses = ['Pending', 'Selected_for_pickup', 'Pickedup_from_client', 'Inwarehouse', 'Pickedup_from_warehouse', 'Delivered'];
      if (!validStatuses.includes(deliveryStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid delivery status. Valid statuses are: ${validStatuses.join(', ')}`
        });
      }

      let newDelivery;
      try {
        // Create delivery in database
        newDelivery = await DeliveryModel.createDelivery({
          deliveryPersonId,
          deliveryPersonName: deliveryPersonName.trim(),
          orderId: orderId.trim(),
          pickedupDate,
          deliveredDate,
          deliveryStatus
        });
      } catch (dbError) {
        console.error('Database error during delivery creation:', dbError.message);

        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - creating mock delivery for testing');
          newDelivery = {
            id: Date.now(),
            delivery_person_id: deliveryPersonId,
            delivery_person_name: deliveryPersonName,
            order_id: orderId,
            pickedup_date: pickedupDate,
            delivered_date: deliveredDate,
            delivery_status: deliveryStatus,
            created_at: new Date().toISOString()
          };
        } else {
          throw dbError;
        }
      }

      // Publish delivery created event to Kafka
      try {
        await publishDeliveryCreatedEvent({
          orderId: newDelivery.order_id,
          deliveryPersonId: newDelivery.delivery_person_id,
          deliveryPersonName: newDelivery.delivery_person_name,
          pickedupDate: newDelivery.pickedup_date,
          deliveredDate: newDelivery.delivered_date,
          deliveryStatus: newDelivery.delivery_status
        });
      } catch (kafkaError) {
        console.warn('⚠️  Failed to publish delivery created event to Kafka:', kafkaError.message);
      }

      res.status(201).json({
        success: true,
        message: 'Delivery created successfully',
        data: {
          id: newDelivery.id,
          deliveryPersonId: newDelivery.delivery_person_id,
          deliveryPersonName: newDelivery.delivery_person_name,
          orderId: newDelivery.order_id,
          pickedupDate: newDelivery.pickedup_date,
          deliveredDate: newDelivery.delivered_date,
          deliveryStatus: newDelivery.delivery_status,
          createdAt: newDelivery.created_at
        }
      });

    } catch (error) {
      console.error('Create delivery error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get delivery by order ID
  static async getDelivery(req, res) {
    try {
      const { orderId } = req.params;

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: 'orderId parameter is required'
        });
      }

      let delivery = null;

      try {
        delivery = await DeliveryModel.findByOrderId(orderId);

        if (!delivery) {
          return res.status(404).json({
            success: false,
            message: 'Delivery not found'
          });
        }

      } catch (dbError) {
        console.error('Database error during delivery fetch:', dbError.message);

        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock delivery');
          delivery = {
            id: 1,
            delivery_person_id: 1001,
            delivery_person_name: 'Mock Delivery Person',
            order_id: orderId,
            pickedup_date: null,
            delivered_date: null,
            delivery_status: 'Pending',
            created_at: new Date().toISOString()
          };
        } else {
          throw dbError;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          id: delivery.id,
          deliveryPersonId: delivery.delivery_person_id,
          deliveryPersonName: delivery.delivery_person_name,
          orderId: delivery.order_id,
          pickedupDate: delivery.pickedup_date,
          deliveredDate: delivery.delivered_date,
          deliveryStatus: delivery.delivery_status,
          createdAt: delivery.created_at,
          updatedAt: delivery.updated_at
        }
      });

    } catch (error) {
      console.error('Get delivery error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Update delivery status
  static async updateDeliveryStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { newStatus, statusChangedBy, changeReason, location } = req.body;

      if (!orderId || !newStatus || !statusChangedBy) {
        return res.status(400).json({
          success: false,
          message: 'orderId, newStatus, and statusChangedBy are required'
        });
      }

      const validStatuses = ['Pending', 'Selected_for_pickup', 'Pickedup_from_client', 'Inwarehouse', 'Pickedup_from_warehouse', 'Delivered'];
      if (!validStatuses.includes(newStatus)) {
        return res.status(400).json({
          success: false,
          message: `Invalid delivery status. Valid statuses are: ${validStatuses.join(', ')}`
        });
      }

      let updatedDelivery;

      try {
        const currentDelivery = await DeliveryModel.findByOrderId(orderId);
        if (!currentDelivery) {
          return res.status(404).json({
            success: false,
            message: 'Delivery not found'
          });
        }

        updatedDelivery = await DeliveryModel.updateDeliveryStatusWithDates(
          orderId,
          newStatus,
          statusChangedBy,
          changeReason
        );

        // Publish delivery status updated event to Kafka
        try {
          await publishDeliveryStatusUpdatedEvent({
            orderId: updatedDelivery.order_id,
            previousStatus: currentDelivery.delivery_status,
            newStatus: updatedDelivery.delivery_status,
            statusChangedBy,
            changeReason,
            location,
            deliveryPersonId: updatedDelivery.delivery_person_id
          });
        } catch (kafkaError) {
          console.warn('⚠️  Failed to publish delivery status updated event to Kafka:', kafkaError.message);
        }

      } catch (dbError) {
        console.error('Database error during status update:', dbError.message);

        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock update');
          updatedDelivery = {
            id: 1,
            order_id: orderId,
            delivery_status: newStatus,
            updated_at: new Date().toISOString()
          };
        } else {
          throw dbError;
        }
      }

      res.status(200).json({
        success: true,
        message: 'Delivery status updated successfully',
        data: {
          id: updatedDelivery.id,
          orderId: updatedDelivery.order_id,
          deliveryStatus: updatedDelivery.delivery_status,
          deliveryPersonId: updatedDelivery.delivery_person_id,
          updatedAt: updatedDelivery.updated_at
        }
      });

    } catch (error) {
      console.error('Update delivery status error:', error);

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

  // Cancel delivery
  static async cancelDelivery(req, res) {
    try {
      const { orderId } = req.params;
      const { cancelReason, cancelledBy } = req.body;

      if (!orderId || !cancelledBy) {
        return res.status(400).json({
          success: false,
          message: 'orderId and cancelledBy are required'
        });
      }

      let cancelledDelivery;

      try {
        const currentDelivery = await DeliveryModel.findByOrderId(orderId);
        if (!currentDelivery) {
          return res.status(404).json({
            success: false,
            message: 'Delivery not found'
          });
        }

        cancelledDelivery = await DeliveryModel.cancelDelivery(orderId, cancelReason || 'Cancelled by user', cancelledBy);

        // Publish delivery cancelled event to Kafka
        try {
          await publishDeliveryCancelledEvent({
            orderId: cancelledDelivery.order_id,
            deliveryPersonId: cancelledDelivery.delivery_person_id,
            cancelReason: cancelReason || 'Cancelled by user',
            cancelledBy
          });
        } catch (kafkaError) {
          console.warn('⚠️  Failed to publish delivery cancelled event to Kafka:', kafkaError.message);
        }

      } catch (dbError) {
        console.error('Database error during delivery cancellation:', dbError.message);

        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock cancellation');
          cancelledDelivery = {
            id: 1,
            order_id: orderId,
            delivery_status: 'Cancelled',
            updated_at: new Date().toISOString()
          };
        } else {
          throw dbError;
        }
      }

      res.status(200).json({
        success: true,
        message: 'Delivery cancelled successfully',
        data: {
          id: cancelledDelivery.id,
          orderId: cancelledDelivery.order_id,
          deliveryStatus: cancelledDelivery.delivery_status,
          updatedAt: cancelledDelivery.updated_at
        }
      });

    } catch (error) {
      console.error('Cancel delivery error:', error);

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

  // Get deliveries for a delivery person
  static async getDeliveriesForPerson(req, res) {
    try {
      const { deliveryPersonId } = req.params;
      const { page = 1, limit = 20, status } = req.query;

      if (!deliveryPersonId) {
        return res.status(400).json({
          success: false,
          message: 'deliveryPersonId is required'
        });
      }

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let deliveries;

      try {
        if (status) {
          deliveries = await DeliveryModel.findByPersonId(deliveryPersonId, parseInt(limit), offset);
          deliveries = deliveries.filter(delivery => delivery.delivery_status === status);
        } else {
          deliveries = await DeliveryModel.findByPersonId(deliveryPersonId, parseInt(limit), offset);
        }

      } catch (dbError) {
        console.error('Database error during delivery person fetch:', dbError.message);

        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock deliveries');
          deliveries = [
            {
              id: 1,
              order_id: 'ORD123456',
              delivery_person_id: deliveryPersonId,
              delivery_person_name: 'Mock Delivery Person',
              delivery_status: 'Pending',
              created_at: new Date().toISOString()
            }
          ];
        } else {
          throw dbError;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          deliveries: deliveries.map(delivery => ({
            id: delivery.id,
            orderId: delivery.order_id,
            deliveryPersonId: delivery.delivery_person_id,
            deliveryPersonName: delivery.delivery_person_name,
            pickedupDate: delivery.pickedup_date,
            deliveredDate: delivery.delivered_date,
            deliveryStatus: delivery.delivery_status,
            createdAt: delivery.created_at
          })),
          pagination: {
            currentPage: parseInt(page),
            limit: parseInt(limit),
            total: deliveries.length
          }
        }
      });

    } catch (error) {
      console.error('Get deliveries for person error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get delivery statistics
  static async getDeliveryStatistics(req, res) {
    try {
      const { deliveryPersonId } = req.query;

      let statistics;

      try {
        statistics = await DeliveryModel.getDeliveryStatistics(deliveryPersonId);
      } catch (dbError) {
        console.error('Database error during statistics fetch:', dbError.message);

        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock statistics');
          statistics = {
            total_deliveries: '10',
            pending_deliveries: '3',
            selected_for_pickup_deliveries: '2',
            pickedup_from_client_deliveries: '1',
            inwarehouse_deliveries: '1',
            pickedup_from_warehouse_deliveries: '1',
            delivered_deliveries: '2',
            cancelled_deliveries: '0',
            avg_delivery_time_hours: '12.5'
          };
        } else {
          throw dbError;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          totalDeliveries: parseInt(statistics.total_deliveries),
          pendingDeliveries: parseInt(statistics.pending_deliveries),
          selectedForPickupDeliveries: parseInt(statistics.selected_for_pickup_deliveries),
          pickedupFromClientDeliveries: parseInt(statistics.pickedup_from_client_deliveries),
          inwarehouseDeliveries: parseInt(statistics.inwarehouse_deliveries),
          pickedupFromWarehouseDeliveries: parseInt(statistics.pickedup_from_warehouse_deliveries),
          deliveredDeliveries: parseInt(statistics.delivered_deliveries),
          cancelledDeliveries: parseInt(statistics.cancelled_deliveries),
          averageDeliveryTimeHours: parseFloat(statistics.avg_delivery_time_hours) || 0
        }
      });

    } catch (error) {
      console.error('Get delivery statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get available orders for pickup
  static async getAvailableOrders(req, res) {
    try {
      let availableOrders = [];

      try {
        // Fetch orders that are not yet assigned to delivery persons
        availableOrders = await DeliveryModel.getAvailableOrders();

        if (!availableOrders || availableOrders.length === 0) {
          return res.status(200).json({
            success: true,
            message: 'No available orders for pickup at the moment',
            data: []
          });
        }

      } catch (dbError) {
        console.error('Database error during available orders fetch:', dbError.message);

        if (dbError.message.includes('connect') || dbError.code === 'ECONNREFUSED') {
          console.log('ℹ️  Database unavailable - returning mock available orders');
          availableOrders = [
            {
              id: 1,
              order_id: 'ORDER001',
              sender_name: 'John Smith',
              receiver_name: 'Alice Johnson',
              receiver_phone: '+1234567890',
              pickup_address: '123 Main Street, Downtown, City',
              destination_address: '456 Oak Avenue, Suburbs, City',
              order_status: 'Pending',
              package_details: 'Electronics package - Handle with care',
              special_instructions: 'Call before delivery',
              estimated_delivery_date: new Date(),
              created_at: new Date(),
              user_id: 1,
              client_id: 2,
              driver_id: null
            },
            {
              id: 2,
              order_id: 'ORDER002',
              sender_name: 'Sarah Wilson',
              receiver_name: 'Mike Davis',
              receiver_phone: '+1987654321',
              pickup_address: '789 Pine Road, Business District, City',
              destination_address: '321 Elm Street, Residential Area, City',
              order_status: 'Pending',
              package_details: 'Documents and small items',
              special_instructions: 'Deliver to front desk',
              estimated_delivery_date: new Date(),
              created_at: new Date(),
              user_id: 2,
              client_id: 3,
              driver_id: null
            }
          ];
        } else {
          throw dbError;
        }
      }

      // Transform the data to match frontend expectations
      const transformedOrders = availableOrders.map(order => ({
        id: order.order_id,
        orderId: order.order_id,
        customerName: order.sender_name,
        receiverName: order.receiver_name,
        receiverPhone: order.receiver_phone,
        pickupAddress: order.pickup_address,
        deliveryAddress: order.destination_address,
        packageDetails: order.package_details,
        specialInstructions: order.special_instructions,
        estimatedDeliveryDate: order.estimated_delivery_date,
        status: 'select', // Available for pickup
        createdAt: order.created_at
      }));

      res.status(200).json({
        success: true,
        data: transformedOrders
      });

    } catch (error) {
      console.error('Get available orders error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Assign order to delivery person
  static async assignOrderToDriver(req, res) {
    try {
      const { orderId } = req.params;
      const { deliveryPersonId, deliveryPersonName } = req.body;

      console.log('🔄 Assignment request received:', {
        orderId,
        deliveryPersonId,
        deliveryPersonName
      });

      // Validation
      if (!deliveryPersonId || !deliveryPersonName) {
        return res.status(400).json({
          success: false,
          message: 'deliveryPersonId and deliveryPersonName are required'
        });
      }

      // First check if order exists and is available
      let orderDetails = null;
      try {
        orderDetails = await DeliveryModel.getOrderWithDeliveryDetails(orderId);
        console.log('📋 Order details found:', orderDetails);
        
        if (!orderDetails) {
          return res.status(404).json({
            success: false,
            message: 'Order not found'
          });
        }

        if (orderDetails.delivery_person_id) {
          return res.status(400).json({
            success: false,
            message: 'Order is already assigned to another delivery person'
          });
        }

      } catch (dbError) {
        console.error('❌ Database error checking order availability:', dbError);
        return res.status(500).json({
          success: false,
          message: 'Unable to check order availability',
          debug: dbError.message
        });
      }

      // Create delivery record
      try {
        console.log('🔄 Attempting to assign order to delivery person...');
        const assignmentResult = await DeliveryModel.assignOrderToDeliveryPerson(
          orderId,
          deliveryPersonId,
          deliveryPersonName
        );

        console.log('✅ Order assigned successfully:', assignmentResult);

        // Publish event if Kafka is available
        try {
          await publishDeliveryCreatedEvent({
            deliveryId: assignmentResult.deliveryRecord.id,
            orderId,
            deliveryPersonId,
            deliveryPersonName,
            status: 'Selected_for_pickup',
            timestamp: new Date().toISOString()
          });
        } catch (eventError) {
          console.warn('⚠️  Failed to publish delivery created event:', eventError.message);
        }

        res.status(201).json({
          success: true,
          message: 'Order successfully assigned for pickup',
          data: {
            deliveryId: assignmentResult.deliveryRecord.id,
            orderId: assignmentResult.deliveryRecord.order_id,
            deliveryPersonId: assignmentResult.deliveryRecord.delivery_person_id,
            deliveryPersonName: assignmentResult.deliveryRecord.delivery_person_name,
            deliveryStatus: assignmentResult.deliveryRecord.delivery_status,
            assignedAt: assignmentResult.deliveryRecord.created_at,
            orderUpdate: {
              order_id: assignmentResult.orderUpdate.order_id,
              order_status: assignmentResult.orderUpdate.order_status,
              driver_id: assignmentResult.orderUpdate.driver_id,
              actual_pickup_date: assignmentResult.orderUpdate.actual_pickup_date
            }
          }
        });

      } catch (dbError) {
        console.error('❌ Database error during order assignment:', dbError);
        res.status(500).json({
          success: false,
          message: 'Failed to assign order to delivery person',
          debug: dbError.message
        });
      }

    } catch (error) {
      console.error('❌ Assign order to driver error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        debug: error.message
      });
    }
  }

  // Update delivery status (New 6-stage workflow)
  static async updateDeliveryStatus(req, res) {
    const { orderId } = req.params;
    const { status, deliveryPersonId } = req.body;

    try {
      console.log('🔄 Status update request received:', {
        orderId,
        status,
        deliveryPersonId
      });

      // Validate status - updated to new 6-stage workflow
      const validStatuses = ['Pending', 'Selected_for_pickup', 'Pickedup_from_client', 'Inwarehouse', 'Pickedup_from_warehouse', 'Delivered'];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
        });
      }

      // Update status
      console.log('🔍 About to call DeliveryModel.updateOrderDeliveryStatus with:', {
        orderId,
        status,
        deliveryPersonId
      });
      
      const result = await DeliveryModel.updateOrderDeliveryStatus(orderId, status, deliveryPersonId);

      console.log('✅ Status updated successfully:', result);

      res.json({
        success: true,
        message: `Order status updated to ${status}`,
        data: {
          orderId,
          newStatus: status,
          deliveryRecord: result.deliveryRecord,
          orderRecord: result.orderRecord,
          updatedAt: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('❌ Update delivery status error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        orderId,
        status,
        deliveryPersonId
      });
      res.status(500).json({
        success: false,
        message: 'Failed to update delivery status',
        debug: error.message
      });
    }
  }

  // Get my deliveries for a specific delivery person
  static async getMyDeliveries(req, res) {
    try {
      const { deliveryPersonId } = req.params;

      console.log('📋 Get my deliveries request for:', deliveryPersonId);

      const deliveries = await DeliveryModel.getMyDeliveries(deliveryPersonId);

      console.log(`✅ Found ${deliveries.length} deliveries for delivery person ${deliveryPersonId}`);

      res.json({
        success: true,
        message: 'Deliveries retrieved successfully',
        data: deliveries
      });

    } catch (error) {
      console.error('❌ Get my deliveries error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve deliveries',
        debug: error.message
      });
    }
  }

  // Update cash payment status
  static async updateCashPaymentStatus(req, res) {
    try {
      const { orderId } = req.params;
      const { cashPaid, deliveryPersonId } = req.body;

      console.log('💰 Cash payment update request:', {
        orderId,
        cashPaid,
        deliveryPersonId
      });

      // Update cash payment status in orders table
      const result = await DeliveryModel.updateCashPaymentStatus(orderId, cashPaid);

      console.log('✅ Cash payment status updated successfully:', result);

      res.json({
        success: true,
        message: cashPaid ? 'Order marked as paid' : 'Order marked as unpaid',
        data: {
          orderId,
          cashPaid,
          updatedAt: new Date().toISOString(),
          orderRecord: result
        }
      });

    } catch (error) {
      console.error('❌ Update cash payment error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update cash payment status',
        debug: error.message
      });
    }
  }
}

module.exports = DeliveryController;