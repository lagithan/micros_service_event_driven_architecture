const { query, transaction } = require('../config/database');

class OrderDeliveryModel {
  // Generate delivery ID
  static generateDeliveryId() {
    const prefix = 'DEL';
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}${timestamp}${random}`;
  }

  // Create a new delivery record
  static async createDelivery(deliveryData) {
    const {
      deliveryPersonId,
      deliveryPersonName,
      orderId,
      pickedupDate,
      deliveredDate,
      deliveryStatus
    } = deliveryData;

    try {
      const queries = [
        {
          text: `
            INSERT INTO order_delivery_table (
              delivery_person_id,
              delivery_person_name,
              order_id,
              pickedup_date,
              delivered_date,
              delivery_status
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
          `,
          params: [
            deliveryPersonId,
            deliveryPersonName,
            orderId,
            pickedupDate,
            deliveredDate,
            deliveryStatus
          ]
        }
      ];

      const results = await transaction(queries);
      return results[0].rows[0];
    } catch (error) {
      if (error.code === '23505') {
        throw new Error('Delivery record already exists for this order');
      }
      throw error;
    }
  }

  // Find delivery by order ID
  static async findByOrderId(orderId) {
    try {
      const queryText = `
        SELECT 
          id, delivery_person_id, delivery_person_name, order_id,
          pickedup_date, delivered_date, delivery_status
        FROM order_delivery_table
        WHERE order_id = $1
      `;
      const result = await query(queryText, [orderId]);
      return result.rows[0] || null;
    } catch (error) {
      throw error;
    }
  }

  // Find deliveries by delivery person ID
  static async findByPersonId(deliveryPersonId, limit = 50, offset = 0) {
    try {
      const queryText = `
        SELECT 
          id, delivery_person_id, delivery_person_name, order_id,
          pickedup_date, delivered_date, delivery_status
        FROM order_delivery_table
        WHERE delivery_person_id = $1
        ORDER BY pickedup_date DESC
        LIMIT $2 OFFSET $3
      `;
      const result = await query(queryText, [deliveryPersonId, limit, offset]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Update delivery status
  static async updateDeliveryStatus(orderId, newStatus, statusChangedBy, changeReason = null, location = null) {
    try {
      const currentDelivery = await this.findByOrderId(orderId);
      if (!currentDelivery) {
        throw new Error('Delivery not found');
      }

      const previousStatus = currentDelivery.delivery_status;
      const validTransitions = {
        'Pending': ['Selected_for_pickup', 'Cancelled'],
        'Selected_for_pickup': ['Pickedup_from_client', 'Cancelled'],
        'Pickedup_from_client': ['Inwarehouse', 'Cancelled'],
        'Inwarehouse': ['Pickedup_from_warehouse', 'Cancelled'],
        'Pickedup_from_warehouse': ['Delivered', 'Cancelled'],
        'Delivered': [],
        'Cancelled': []
      };

      if (!validTransitions[previousStatus] || !validTransitions[previousStatus].includes(newStatus)) {
        throw new Error(`Invalid status transition from ${previousStatus} to ${newStatus}`);
      }

      const updateQueries = [
        {
          text: `
  UPDATE order_delivery_table
  SET 
    delivery_status = $2::VARCHAR,
    pickedup_date = CASE WHEN $2::VARCHAR = 'Pickedup_from_client' THEN CURRENT_TIMESTAMP ELSE pickedup_date END,
    delivered_date = CASE WHEN $2::VARCHAR = 'Delivered' THEN CURRENT_TIMESTAMP ELSE delivered_date END
  WHERE order_id = $1
  RETURNING *
`,
          params: [orderId, newStatus]
        }
      ];

      const results = await transaction(updateQueries);
      return results[0].rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Cancel delivery
  static async cancelDelivery(orderId, cancelReason, cancelledBy) {
    try {
      const currentDelivery = await this.findByOrderId(orderId);
      if (!currentDelivery) {
        throw new Error('Delivery not found');
      }

      if (currentDelivery.delivery_status === 'Delivered') {
        throw new Error('Cannot cancel delivered delivery');
      }

      if (currentDelivery.delivery_status === 'Cancelled') {
        throw new Error('Delivery is already cancelled');
      }

      return await this.updateDeliveryStatus(orderId, 'Cancelled', cancelledBy, cancelReason);
    } catch (error) {
      throw error;
    }
  }

  // Get delivery statistics for a delivery person
  static async getDeliveryStatistics(deliveryPersonId = null) {
    try {
      let whereClause = '';
      let params = [];
      let paramIndex = 1;

      if (deliveryPersonId) {
        whereClause = `WHERE delivery_person_id = $${paramIndex}`;
        params.push(deliveryPersonId);
        paramIndex++;
      }

      const queryText = `
        SELECT 
          COUNT(*) as total_deliveries,
          COUNT(CASE WHEN delivery_status = 'Pending' THEN 1 END) as pending_deliveries,
          COUNT(CASE WHEN delivery_status = 'Selected_for_pickup' THEN 1 END) as selected_for_pickup_deliveries,
          COUNT(CASE WHEN delivery_status = 'Pickedup_from_client' THEN 1 END) as pickedup_from_client_deliveries,
          COUNT(CASE WHEN delivery_status = 'Inwarehouse' THEN 1 END) as inwarehouse_deliveries,
          COUNT(CASE WHEN delivery_status = 'Pickedup_from_warehouse' THEN 1 END) as pickedup_from_warehouse_deliveries,
          COUNT(CASE WHEN delivery_status = 'Delivered' THEN 1 END) as delivered_deliveries,
          COUNT(CASE WHEN delivery_status = 'Cancelled' THEN 1 END) as cancelled_deliveries,
          AVG(
            CASE 
              WHEN delivered_date IS NOT NULL AND pickedup_date IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (delivered_date - pickedup_date))/3600 
            END
          ) as avg_delivery_time_hours
        FROM order_delivery_table
        ${whereClause}
      `;
      const result = await query(queryText, params);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Get available orders for pickup (orders not yet assigned to any delivery person)
  static async getAvailableOrders() {
    try {
      const queryText = `
        SELECT 
          o.id,
          o.order_id,
          o.sender_name,
          o.receiver_name,
          o.receiver_phone,
          o.pickup_address,
          o.destination_address,
          o.order_status,
          o.package_details,
          o.special_instructions,
          o.estimated_delivery_date,
          o.created_at,
          o.user_id,
          o.client_id,
          o.driver_id
        FROM orders o
        LEFT JOIN order_delivery_table odt ON o.order_id = odt.order_id
        WHERE odt.order_id IS NULL 
          AND o.order_status = 'Pending'
        ORDER BY o.created_at ASC
      `;
      
      const result = await query(queryText);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Get order details with delivery information
  static async getOrderWithDeliveryDetails(orderId) {
    try {
      const queryText = `
        SELECT 
          o.id as order_db_id,
          o.order_id,
          o.sender_name,
          o.receiver_name,
          o.receiver_phone,
          o.pickup_address,
          o.destination_address,
          o.order_status,
          o.package_details,
          o.special_instructions,
          o.estimated_delivery_date,
          o.created_at as order_created_at,
          o.user_id,
          o.client_id,
          o.driver_id,
          odt.id as delivery_id,
          odt.delivery_person_id,
          odt.delivery_person_name,
          odt.pickedup_date,
          odt.delivered_date,
          odt.delivery_status
        FROM orders o
        LEFT JOIN order_delivery_table odt ON o.order_id = odt.order_id
        WHERE o.order_id = $1
      `;
      
      const result = await query(queryText, [orderId]);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }

  // Assign order to delivery person and update order status
  static async assignOrderToDeliveryPerson(orderId, deliveryPersonId, deliveryPersonName) {
    try {
      const queries = [
        // Update the order in orders table - change status to 'Selected_for_pickup' and set driver details
        {
          text: `
            UPDATE orders 
            SET order_status = 'Selected_for_pickup',
                driver_id = $1,
                actual_pickup_date = CURRENT_TIMESTAMP,
                updated_at = CURRENT_TIMESTAMP
            WHERE order_id = $2::varchar
            RETURNING *
          `,
          params: [parseInt(deliveryPersonId), orderId.toString()]
        },
        // Create delivery record in order_delivery_table
        {
          text: `
            INSERT INTO order_delivery_table (
              delivery_person_id,
              delivery_person_name,
              order_id,
              delivery_status
            )
            VALUES ($1, $2, $3::varchar, 'Selected_for_pickup')
            RETURNING *
          `,
          params: [parseInt(deliveryPersonId), deliveryPersonName, orderId.toString()]
        }
      ];

      const results = await transaction(queries);
      return {
        orderUpdate: results[0].rows[0],
        deliveryRecord: results[1].rows[0]
      };
    } catch (error) {
      throw error;
    }
  }

  // Update delivery status and handle pickup/delivery dates
  static async updateDeliveryStatusWithDates(orderId, newStatus, statusChangedBy, notes = null) {
    try {
      let queries = [];
      
      // Update delivery record
      let updateDeliveryQuery = `
        UPDATE order_delivery_table 
        SET delivery_status = $1
      `;
      let deliveryParams = [newStatus];
      
      // Handle pickup date for Pickedup_from_client status
      if (newStatus === 'Pickedup_from_client') {
        updateDeliveryQuery += `, pickedup_date = CURRENT_TIMESTAMP`;
      }
      
      // Handle delivery date for Delivered status
      if (newStatus === 'Delivered') {
        updateDeliveryQuery += `, delivered_date = CURRENT_TIMESTAMP`;
      }
      
      updateDeliveryQuery += ` WHERE order_id = $${deliveryParams.length + 1} RETURNING *`;
      deliveryParams.push(orderId);
      
      queries.push({
        text: updateDeliveryQuery,
        params: deliveryParams
      });
      
      // Also update the orders table status to match
      let orderStatus = newStatus;
      if (newStatus === 'Pending') orderStatus = 'Pending';
      else if (newStatus === 'Selected_for_pickup') orderStatus = 'Selected_for_pickup';
      else if (newStatus === 'Pickedup_from_client') orderStatus = 'Pickedup_from_client';
      else if (newStatus === 'Inwarehouse') orderStatus = 'Inwarehouse';
      else if (newStatus === 'Pickedup_from_warehouse') orderStatus = 'Pickedup_from_warehouse';
      else if (newStatus === 'Delivered') orderStatus = 'Delivered';
      
      // Update actual pickup/delivery dates in orders table
      let updateOrderQuery = `
        UPDATE orders 
        SET order_status = $1
      `;
      let orderParams = [orderStatus];
      
      if (newStatus === 'Pickedup_from_client') {
        updateOrderQuery += `, actual_pickup_date = CURRENT_TIMESTAMP`;
      }
      
      if (newStatus === 'Delivered') {
        updateOrderQuery += `, actual_delivery_date = CURRENT_TIMESTAMP`;
      }
      
      updateOrderQuery += ` WHERE order_id = $${orderParams.length + 1}`;
      orderParams.push(orderId);
      
      queries.push({
        text: updateOrderQuery,
        params: orderParams
      });

      const results = await transaction(queries);
      return results[0].rows[0]; // Return the delivery record
    } catch (error) {
      throw error;
    }
  }

  // Update order and delivery status with proper workflow
  static async updateOrderDeliveryStatus(orderId, newStatus, deliveryPersonId = null) {
    try {
      console.log('🔍 updateOrderDeliveryStatus called with:', { orderId, newStatus, deliveryPersonId });
      
      const queries = [];
      
      // Map delivery status to order status (new 6-stage workflow)
      const statusMapping = {
        'Pending': 'Pending',
        'Selected_for_pickup': 'Selected_for_pickup',
        'Pickedup_from_client': 'Pickedup_from_client', 
        'Inwarehouse': 'Inwarehouse',
        'Pickedup_from_warehouse': 'Pickedup_from_warehouse',
        'Delivered': 'Delivered'
      };
      
      const orderStatus = statusMapping[newStatus] || newStatus;
      
      // Check if delivery record exists
      const checkDeliveryQuery = `SELECT * FROM order_delivery_table WHERE order_id = $1`;
      const existingDelivery = await query(checkDeliveryQuery, [orderId]);
      
      if (existingDelivery.rows.length === 0) {
        console.log('📦 No delivery record found for order:', orderId);
        console.log('⚠️  This order may have been created before the new workflow.');
        
        // Create a basic delivery record with the current driver
        const driverId = deliveryPersonId || 1;
        const driverName = `Driver ${driverId}`;
        
        const insertDeliveryQuery = `
          INSERT INTO order_delivery_table (
            delivery_person_id, 
            delivery_person_name, 
            order_id, 
            delivery_status
          ) 
          VALUES ($1, $2, $3, $4) 
          RETURNING *
        `;
        
        queries.push({
          text: insertDeliveryQuery,
          params: [driverId, driverName, orderId, newStatus]
        });
        
        console.log('✅ Will create delivery record for order:', orderId);
      } else {
        console.log('📦 Found existing delivery record, updating status...');
        // Update existing delivery record
        let updateDeliveryQuery = `
          UPDATE order_delivery_table 
          SET delivery_status = $1
        `;
        let deliveryParams = [newStatus];
        
        // Handle specific status transitions with new workflow
        if (newStatus === 'Pickedup_from_client') {
          updateDeliveryQuery += `, pickedup_date = CURRENT_TIMESTAMP`;
        }
        
        if (newStatus === 'Delivered') {
          updateDeliveryQuery += `, delivered_date = CURRENT_TIMESTAMP`;
        }
        
        updateDeliveryQuery += ` WHERE order_id = $${deliveryParams.length + 1} RETURNING *`;
        deliveryParams.push(orderId);
        
        queries.push({
          text: updateDeliveryQuery,
          params: deliveryParams
        });
      }
      
      // Update order status in orders table
      let updateOrderQuery = `
        UPDATE orders 
        SET order_status = $1,
            updated_at = CURRENT_TIMESTAMP
      `;
      let orderParams = [orderStatus];
      
      // Set actual pickup date when status becomes Pickedup_from_client
      if (newStatus === 'Pickedup_from_client') {
        updateOrderQuery += `, actual_pickup_date = CURRENT_TIMESTAMP`;
      }
      
      // Set actual delivery date when delivered
      if (newStatus === 'Delivered') {
        updateOrderQuery += `, actual_delivery_date = CURRENT_TIMESTAMP`;
      }
      
      updateOrderQuery += ` WHERE order_id = $${orderParams.length + 1} RETURNING *`;
      orderParams.push(orderId);
      
      queries.push({
        text: updateOrderQuery,
        params: orderParams
      });

      const results = await transaction(queries);
      
      console.log('✅ Transaction completed successfully');
      
      return {
        deliveryRecord: results[0].rows[0],
        orderRecord: results[1].rows[0]
      };
    } catch (error) {
      console.error('❌ updateOrderDeliveryStatus error:', error);
      throw error;
    }
  }

  // Helper method to get driver info for creating delivery records
  static async getDriverInfoForOrder(orderId, deliveryPersonId = null) {
    try {
      if (deliveryPersonId) {
        // Try to get driver name from auth service or use ID as name
        return {
          deliveryPersonId: parseInt(deliveryPersonId),
          deliveryPersonName: `Driver ${deliveryPersonId}`
        };
      } else {
        // Get driver info from orders table if it was assigned
        const orderQuery = `SELECT driver_id FROM orders WHERE order_id = $1`;
        const orderResult = await query(orderQuery, [orderId]);
        
        if (orderResult.rows.length > 0 && orderResult.rows[0].driver_id) {
          return {
            deliveryPersonId: orderResult.rows[0].driver_id,
            deliveryPersonName: `Driver ${orderResult.rows[0].driver_id}`
          };
        }
      }
      
      // Fallback to default driver
      return {
        deliveryPersonId: 1,
        deliveryPersonName: 'Default Driver'
      };
    } catch (error) {
      console.error('Error getting driver info:', error);
      return {
        deliveryPersonId: 1,
        deliveryPersonName: 'Default Driver'
      };
    }
  }

  // Get deliveries assigned to a specific delivery person
  static async getMyDeliveries(deliveryPersonId) {
    try {
      const queryText = `
        SELECT 
          o.order_id,
          o.sender_name,
          o.receiver_name,
          o.receiver_phone,
          o.pickup_address,
          o.destination_address,
          o.package_details,
          o.special_instructions,
          o.estimated_delivery_date,
          o.actual_pickup_date,
          o.actual_delivery_date,
          o.order_status,
          o.driver_id,
          o.cash_paid,
          odt.delivery_person_id,
          odt.delivery_person_name,
          odt.delivery_status,
          odt.pickedup_date,
          odt.delivered_date
        FROM orders o
        INNER JOIN order_delivery_table odt ON o.order_id = odt.order_id
        WHERE odt.delivery_person_id = $1
        AND odt.delivery_status IN ('Selected_for_pickup', 'Pickedup_from_client', 'Inwarehouse', 'Pickedup_from_warehouse', 'Delivered')
        ORDER BY o.created_at DESC
      `;
      
      const result = await query(queryText, [parseInt(deliveryPersonId)]);
      return result.rows;
    } catch (error) {
      throw error;
    }
  }

  // Update cash payment status
  static async updateCashPaymentStatus(orderId, cashPaid) {
    try {
      const queryText = `
        UPDATE orders 
        SET cash_paid = $1,
            updated_at = CURRENT_TIMESTAMP
        WHERE order_id = $2::varchar
        RETURNING *
      `;
      
      const result = await query(queryText, [cashPaid, orderId.toString()]);
      
      if (result.rows.length === 0) {
        throw new Error('Order not found');
      }
      
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = OrderDeliveryModel;