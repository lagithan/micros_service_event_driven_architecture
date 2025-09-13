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
            INSERT INTO Order_Delivery_Table (
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
        FROM Order_Delivery_Table
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
        FROM Order_Delivery_Table
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
  'Picking': ['PickedUp', 'Delivering', 'Delivered', 'Cancelled'],
  'PickedUp': ['Delivering', 'Delivered', 'Cancelled'],
  'Delivering': ['Delivered', 'Cancelled'],
  'Delivered': [],
  'Cancelled': []
};

      if (!validTransitions[previousStatus] || !validTransitions[previousStatus].includes(newStatus)) {
        throw new Error(`Invalid status transition from ${previousStatus} to ${newStatus}`);
      }

      const updateQueries = [
        {
          text: `
  UPDATE Order_Delivery_Table
  SET 
    delivery_status = $2::VARCHAR,
    pickedup_date = CASE WHEN $2::VARCHAR = 'PickedUp' THEN CURRENT_TIMESTAMP ELSE pickedup_date END,
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
          COUNT(CASE WHEN delivery_status = 'Picking' THEN 1 END) as picking_deliveries,
          COUNT(CASE WHEN delivery_status = 'PickedUp' THEN 1 END) as pickedup_deliveries,
          COUNT(CASE WHEN delivery_status = 'Delivering' THEN 1 END) as delivering_deliveries,
          COUNT(CASE WHEN delivery_status = 'Delivered' THEN 1 END) as delivered_deliveries,
          COUNT(CASE WHEN delivery_status = 'Cancelled' THEN 1 END) as cancelled_deliveries,
          AVG(
            CASE 
              WHEN delivered_date IS NOT NULL AND pickedup_date IS NOT NULL 
              THEN EXTRACT(EPOCH FROM (delivered_date - pickedup_date))/3600 
            END
          ) as avg_delivery_time_hours
        FROM Order_Delivery_Table
        ${whereClause}
      `;
      const result = await query(queryText, params);
      return result.rows[0];
    } catch (error) {
      throw error;
    }
  }
}

module.exports = OrderDeliveryModel;