const { query, transaction } = require('../config/database');

class OrderModel {
  // Generate tracking number
  static generateTrackingNumber() {
    const prefix = 'ST'; // Swift Track
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  // Generate order ID
  static generateOrderId() {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD${timestamp}${random}`;
  }

  // Create a new order
  static async createOrder(orderData) {
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
    } = orderData;

    try {
      const orderId = this.generateOrderId();
      const trackingNumber = this.generateTrackingNumber();
      
      const queries = [
        // Insert order
        {
          text: `
            INSERT INTO orders (
              order_id, sender_name, receiver_name, receiver_phone,
              pickup_address, destination_address, user_id, client_id,
              package_details, special_instructions, estimated_delivery_date,
              tracking_number, order_status, created_at, updated_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            RETURNING *
          `,
          params: [
            orderId, senderName, receiverName, receiverPhone,
            pickupAddress, destinationAddress, userId, clientId,
            packageDetails, specialInstructions, estimatedDeliveryDate,
            trackingNumber, 'Pending'
          ]
        },
        // Insert initial status history
        {
          text: `
            INSERT INTO order_status_history (
              order_id, previous_status, new_status, status_changed_by, 
              change_reason, changed_at
            )
            VALUES (
              (SELECT id FROM orders WHERE order_id = $1), 
              NULL, $2, $3, $4, CURRENT_TIMESTAMP
            )
            RETURNING *
          `,
          params: [orderId, 'Pending', 'system', 'Order created']
        }
      ];

      const results = await transaction(queries);
      const order = results[0].rows[0];
      
      return {
        ...order,
        orderNumber: order.order_id,
        trackingNumber: order.tracking_number
      };
    } catch (error) {
      if (error.code === '23505') { // Unique constraint violation
        throw new Error('Order ID or tracking number already exists');
      }
      throw error;
    }
  }

  // Find order by ID
  static async findById(id) {
    try {
      const queryText = `
        SELECT 
          id, order_id, sender_name, receiver_name, receiver_phone,
          pickup_address, destination_address, order_status, user_id,
          client_id, driver_id, package_details, special_instructions,
          estimated_delivery_date, actual_pickup_date, actual_delivery_date,
          tracking_number, created_at, updated_at
        FROM orders 
        WHERE id = $1
      `;
      
      const result = await query(queryText, [id]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find order by order ID
  static async findByOrderId(orderId) {
    try {
      const queryText = `
        SELECT 
          id, order_id, sender_name, receiver_name, receiver_phone,
          pickup_address, destination_address, order_status, user_id,
          client_id, driver_id, package_details, special_instructions,
          estimated_delivery_date, actual_pickup_date, actual_delivery_date,
          tracking_number, created_at, updated_at
        FROM orders 
        WHERE order_id = $1
      `;
      
      const result = await query(queryText, [orderId]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find order by tracking number
  static async findByTrackingNumber(trackingNumber) {
    try {
      const queryText = `
        SELECT 
          id, order_id, sender_name, receiver_name, receiver_phone,
          pickup_address, destination_address, order_status, user_id,
          client_id, driver_id, package_details, special_instructions,
          estimated_delivery_date, actual_pickup_date, actual_delivery_date,
          tracking_number, created_at, updated_at
        FROM orders 
        WHERE tracking_number = $1
      `;
      
      const result = await query(queryText, [trackingNumber]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find orders by user ID
  static async findByUserId(userId, limit = 50, offset = 0) {
    try {
      const queryText = `
        SELECT 
          id, order_id, sender_name, receiver_name, receiver_phone,
          pickup_address, destination_address, order_status, user_id,
          client_id, driver_id, package_details, special_instructions,
          estimated_delivery_date, actual_pickup_date, actual_delivery_date,
          tracking_number, created_at, updated_at
        FROM orders 
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await query(queryText, [userId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Find orders by client ID
  static async findByClientId(clientId, limit = 50, offset = 0) {
    try {
      const queryText = `
        SELECT 
          id, order_id, sender_name, receiver_name, receiver_phone,
          pickup_address, destination_address, order_status, user_id,
          client_id, driver_id, package_details, special_instructions,
          estimated_delivery_date, actual_pickup_date, actual_delivery_date,
          tracking_number, created_at, updated_at
        FROM orders 
        WHERE client_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await query(queryText, [clientId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Find orders by driver ID
  static async findByDriverId(driverId, limit = 50, offset = 0) {
    try {
      const queryText = `
        SELECT 
          id, order_id, sender_name, receiver_name, receiver_phone,
          pickup_address, destination_address, order_status, user_id,
          client_id, driver_id, package_details, special_instructions,
          estimated_delivery_date, actual_pickup_date, actual_delivery_date,
          tracking_number, created_at, updated_at
        FROM orders 
        WHERE driver_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await query(queryText, [driverId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Update order status
  static async updateOrderStatus(orderId, newStatus, statusChangedBy, changeReason = null, location = null, driverId = null) {
    try {
      const currentOrder = await this.findByOrderId(orderId);
      if (!currentOrder) {
        throw new Error('Order not found');
      }

      const previousStatus = currentOrder.order_status;
      
      // Validate status transition
      const validTransitions = {
        'Pending': ['PickedUp', 'Cancelled'],
        'PickedUp': ['OnWarehouse', 'Delivered', 'Cancelled'],
        'OnWarehouse': ['Delivered', 'Cancelled'],
        'Delivered': [], // Final state
        'Cancelled': [] // Final state
      };

      if (!validTransitions[previousStatus].includes(newStatus)) {
        throw new Error(`Invalid status transition from ${previousStatus} to ${newStatus}`);
      }

      const updateQueries = [
        // Update order
        {
          text: `
            UPDATE orders 
            SET 
              order_status = $2, 
              driver_id = COALESCE($3, driver_id),
              actual_pickup_date = CASE WHEN $2 = 'PickedUp' THEN CURRENT_TIMESTAMP ELSE actual_pickup_date END,
              actual_delivery_date = CASE WHEN $2 = 'Delivered' THEN CURRENT_TIMESTAMP ELSE actual_delivery_date END,
              updated_at = CURRENT_TIMESTAMP
            WHERE order_id = $1
            RETURNING *
          `,
          params: [orderId, newStatus, driverId]
        },
        // Insert status history
        {
          text: `
            INSERT INTO order_status_history (
              order_id, previous_status, new_status, status_changed_by, 
              change_reason, location, changed_at
            )
            VALUES (
              (SELECT id FROM orders WHERE order_id = $1), 
              $2, $3, $4, $5, $6, CURRENT_TIMESTAMP
            )
            RETURNING *
          `,
          params: [orderId, previousStatus, newStatus, statusChangedBy, changeReason, location]
        }
      ];

      const results = await transaction(updateQueries);
      return results[0].rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get order status history
  static async getOrderStatusHistory(orderId) {
    try {
      const queryText = `
        SELECT 
          osh.id, osh.previous_status, osh.new_status, osh.status_changed_by,
          osh.change_reason, osh.location, osh.changed_at,
          o.order_id, o.tracking_number
        FROM order_status_history osh
        JOIN orders o ON osh.order_id = o.id
        WHERE o.order_id = $1
        ORDER BY osh.changed_at ASC
      `;
      
      const result = await query(queryText, [orderId]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get orders by status
  static async findByStatus(status, limit = 50, offset = 0) {
    try {
      const queryText = `
        SELECT 
          id, order_id, sender_name, receiver_name, receiver_phone,
          pickup_address, destination_address, order_status, user_id,
          client_id, driver_id, package_details, special_instructions,
          estimated_delivery_date, actual_pickup_date, actual_delivery_date,
          tracking_number, created_at, updated_at
        FROM orders 
        WHERE order_status = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      
      const result = await query(queryText, [status, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Cancel order
  static async cancelOrder(orderId, cancelReason, cancelledBy) {
    try {
      const currentOrder = await this.findByOrderId(orderId);
      if (!currentOrder) {
        throw new Error('Order not found');
      }

      if (currentOrder.order_status === 'Delivered') {
        throw new Error('Cannot cancel delivered order');
      }

      if (currentOrder.order_status === 'Cancelled') {
        throw new Error('Order is already cancelled');
      }

      return await this.updateOrderStatus(orderId, 'Cancelled', cancelledBy, cancelReason);
    } catch (error) {
      throw error;
    }
  }

  // Get order statistics
  static async getOrderStatistics(userId = null, clientId = null, driverId = null) {
    try {
      let whereClause = '';
      let params = [];
      let paramIndex = 1;

      if (userId) {
        whereClause = `WHERE user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      } else if (clientId) {
        whereClause = `WHERE client_id = $${paramIndex}`;
        params.push(clientId);
        paramIndex++;
      } else if (driverId) {
        whereClause = `WHERE driver_id = $${paramIndex}`;
        params.push(driverId);
        paramIndex++;
      }

      const queryText = `
        SELECT 
          COUNT(*) as total_orders,
          COUNT(CASE WHEN order_status = 'Pending' THEN 1 END) as pending_orders,
          COUNT(CASE WHEN order_status = 'PickedUp' THEN 1 END) as picked_up_orders,
          COUNT(CASE WHEN order_status = 'OnWarehouse' THEN 1 END) as warehouse_orders,
          COUNT(CASE WHEN order_status = 'Delivered' THEN 1 END) as delivered_orders,
          COUNT(CASE WHEN order_status = 'Cancelled' THEN 1 END) as cancelled_orders,
          AVG(
            CASE 
              WHEN actual_delivery_date IS NOT NULL AND created_at IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (actual_delivery_date - created_at))/3600 
            END
          ) as avg_delivery_time_hours
        FROM orders 
        ${whereClause}
      `;
      
      const result = await query(queryText, params);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Delete order (soft delete by marking as cancelled)
  static async deleteOrder(orderId, deletedBy) {
    try {
      return await this.cancelOrder(orderId, 'Order deleted', deletedBy);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = OrderModel;