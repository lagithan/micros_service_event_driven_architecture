const { TCPMessageFormatter, TCPConnectionManager, OrderServiceClient } = require('../config/warehouseConfig');
const { notifyOrderReachedWarehouse } = require('../config/kafkaProducer');

class WarehouseEventHandler {
  constructor() {
    this.tcpManager = new TCPConnectionManager();
    this.orderServiceClient = new OrderServiceClient();
    this.messageHistory = new Map(); // Track sent messages
  }

  // Handle ORDER_CREATED event
  async handleOrderCreated(eventData) {
    try {
      console.log('🆕 Processing ORDER_CREATED event:', eventData.orderId);
      
      // Format TCP message
      const tcpMessage = TCPMessageFormatter.formatOrderCreated({
        orderId: eventData.orderId,
        orderNumber: eventData.orderNumber,
        trackingNumber: eventData.trackingNumber,
        senderName: eventData.senderName,
        receiverName: eventData.receiverName,
        orderStatus: eventData.orderStatus
      });
      
      console.log('📝 Formatted TCP message:', tcpMessage);
      
      // Send to WMS via TCP/IP
      const result = await this.tcpManager.sendToWMS(tcpMessage, `order_created_${eventData.orderId}`);
      
      if (result.success) {
        console.log('✅ ORDER_CREATED message sent to WMS successfully');
        
        // Store message in history
        this.messageHistory.set(eventData.orderId, {
          type: 'ORDER_CREATED',
          message: tcpMessage,
          timestamp: new Date().toISOString(),
          result: result
        });
        
        // Log the successful TCP transmission
        console.log('📊 WMS Integration Summary:', {
          event: 'ORDER_CREATED',
          orderId: eventData.orderId,
          orderNumber: eventData.orderNumber,
          trackingNumber: eventData.trackingNumber,
          tcpMessage: tcpMessage,
          wmsResponse: result.response,
          timestamp: result.timestamp
        });
        
      } else {
        console.error('❌ Failed to send ORDER_CREATED message to WMS');
        // Could implement retry logic or dead letter queue here
      }
      
    } catch (error) {
      console.error('❌ Error handling ORDER_CREATED event:', error);
      throw error;
    }
  }

  // Handle ORDER_STATUS_UPDATED event
  async handleOrderStatusUpdated(eventData) {
    try {
      console.log('🔄 Processing ORDER_STATUS_UPDATED event:', eventData.orderId);
      console.log('📋 Status change:', `${eventData.previousStatus} → ${eventData.newStatus}`);
      
      // Format TCP message
      const tcpMessage = TCPMessageFormatter.formatOrderStatusUpdate({
        orderNumber: eventData.orderNumber,
        trackingNumber: eventData.trackingNumber,
        previousStatus: eventData.previousStatus,
        newStatus: eventData.newStatus,
        location: eventData.location
      });
      
      console.log('📝 Formatted TCP message:', tcpMessage);
      
      // Send to WMS via TCP/IP
      const result = await this.tcpManager.sendToWMS(tcpMessage, `status_update_${eventData.orderId}_${Date.now()}`);
      
      if (result.success) {
        console.log('✅ ORDER_STATUS_UPDATED message sent to WMS successfully');
        
        // Store message in history
        this.messageHistory.set(`${eventData.orderId}_${eventData.newStatus}`, {
          type: 'ORDER_STATUS_UPDATED',
          message: tcpMessage,
          timestamp: new Date().toISOString(),
          result: result
        });
        
        // Special handling for warehouse-related status updates
        if (this.isWarehouseStatus(eventData.newStatus)) {
          console.log('🏭 Processing warehouse-related status update...');
          await this.handleWarehouseStatusUpdate(eventData);
        }
        
        // Log the successful TCP transmission
        console.log('📊 WMS Integration Summary:', {
          event: 'ORDER_STATUS_UPDATED',
          orderId: eventData.orderId,
          orderNumber: eventData.orderNumber,
          trackingNumber: eventData.trackingNumber,
          statusChange: `${eventData.previousStatus} → ${eventData.newStatus}`,
          tcpMessage: tcpMessage,
          wmsResponse: result.response,
          timestamp: result.timestamp
        });
        
      } else {
        console.error('❌ Failed to send ORDER_STATUS_UPDATED message to WMS');
      }
      
    } catch (error) {
      console.error('❌ Error handling ORDER_STATUS_UPDATED event:', error);
      throw error;
    }
  }

  // Handle ORDER_CANCELLED event
  async handleOrderCancelled(eventData) {
    try {
      console.log('❌ Processing ORDER_CANCELLED event:', eventData.orderId);
      
      // Format TCP message
      const tcpMessage = TCPMessageFormatter.formatOrderCancelled({
        orderNumber: eventData.orderNumber,
        trackingNumber: eventData.trackingNumber,
        cancelReason: eventData.cancelReason
      });
      
      console.log('📝 Formatted TCP message:', tcpMessage);
      
      // Send to WMS via TCP/IP
      const result = await this.tcpManager.sendToWMS(tcpMessage, `order_cancelled_${eventData.orderId}`);
      
      if (result.success) {
        console.log('✅ ORDER_CANCELLED message sent to WMS successfully');
        
        // Store message in history
        this.messageHistory.set(`cancelled_${eventData.orderId}`, {
          type: 'ORDER_CANCELLED',
          message: tcpMessage,
          timestamp: new Date().toISOString(),
          result: result
        });
        
        // Log the successful TCP transmission
        console.log('📊 WMS Integration Summary:', {
          event: 'ORDER_CANCELLED',
          orderId: eventData.orderId,
          orderNumber: eventData.orderNumber,
          trackingNumber: eventData.trackingNumber,
          cancelReason: eventData.cancelReason,
          tcpMessage: tcpMessage,
          wmsResponse: result.response,
          timestamp: result.timestamp
        });
        
      } else {
        console.error('❌ Failed to send ORDER_CANCELLED message to WMS');
      }
      
    } catch (error) {
      console.error('❌ Error handling ORDER_CANCELLED event:', error);
      throw error;
    }
  }

  // Handle warehouse-specific status updates
  async handleWarehouseStatusUpdate(eventData) {
    try {
      const { newStatus, orderId, orderNumber } = eventData;
      
      console.log(`🏭 Handling warehouse status update: ${newStatus} for order ${orderId}`);
      
      // Simulate WMS acknowledgment and processing
      if (newStatus === 'Inwarehouse') {
        console.log('📦 Order arrived at warehouse - simulating WMS processing...');
        
        // Send Kafka notification to order service immediately
        console.log('📨 Sending Kafka notification: Order reached at warehouse');
        try {
          const kafkaResult = await notifyOrderReachedWarehouse(orderId, {
            orderNumber: orderNumber,
            warehouseLocation: 'Main Warehouse',
            receivedBy: 'Warehouse Staff',
            trackingNumber: eventData.trackingNumber
          });
          
          if (kafkaResult.success) {
            console.log('✅ Kafka notification sent successfully to order service');
          } else {
            console.error('❌ Failed to send Kafka notification:', kafkaResult.error);
          }
        } catch (kafkaError) {
          console.error('❌ Error sending Kafka notification:', kafkaError);
        }
        
        // Simulate WMS processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // After WMS acknowledgment, update Order Service
        console.log('🔄 WMS acknowledged order arrival - updating Order Service...');
        
        try {
          await this.orderServiceClient.updateOrderStatus(orderNumber, {
            newStatus: 'Inwarehouse',
            statusChangedBy: 'warehouse-adapter',
            changeReason: 'Confirmed arrival at warehouse by WMS',
            location: 'Main Warehouse'
          });
          
          console.log(`✅ Order ${orderId} status confirmed as Inwarehouse in Order Service`);
          
        } catch (apiError) {
          console.error(`❌ Failed to update Order Service for order ${orderId}:`, apiError.message);
          
          // Could implement retry logic or alert mechanisms here
          console.warn(`⚠️  Order ${orderId} status update failed - may need manual intervention`);
        }
      }
      
      // Handle other warehouse statuses
      else if (newStatus === 'Pickedup_from_warehouse') {
        console.log('🚚 Order picked up by driver from warehouse - notifying WMS...');
        
        // Send warehouse assignment message
        const warehouseMessage = TCPMessageFormatter.formatWarehouseAssignment({
          orderNumber: eventData.orderNumber,
          trackingNumber: eventData.trackingNumber,
          warehouseLocation: 'Main Warehouse'
        });
        
        await this.tcpManager.sendToWMS(warehouseMessage, `warehouse_assign_${orderId}`);
        console.log('📡 Warehouse assignment message sent to WMS');
      }
      
    } catch (error) {
      console.error('❌ Error handling warehouse status update:', error);
      throw error;
    }
  }

  // Check if status is warehouse-related
  isWarehouseStatus(status) {
    const warehouseStatuses = ['Inwarehouse', 'Pickedup_from_warehouse'];
    return warehouseStatuses.includes(status);
  }

  // Get message history
  getMessageHistory(orderId = null) {
    if (orderId) {
      const orderMessages = [];
      for (const [key, value] of this.messageHistory.entries()) {
        if (key.includes(orderId.toString())) {
          orderMessages.push({ key, ...value });
        }
      }
      return orderMessages;
    }
    
    return Array.from(this.messageHistory.entries()).map(([key, value]) => ({ key, ...value }));
  }

  // Get statistics
  getStatistics() {
    const history = Array.from(this.messageHistory.values());
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentMessages = history.filter(msg => new Date(msg.timestamp) > oneHourAgo);
    
    return {
      totalMessages: history.length,
      recentMessages: recentMessages.length,
      messagesByType: {
        ORDER_CREATED: history.filter(m => m.type === 'ORDER_CREATED').length,
        ORDER_STATUS_UPDATED: history.filter(m => m.type === 'ORDER_STATUS_UPDATED').length,
        ORDER_CANCELLED: history.filter(m => m.type === 'ORDER_CANCELLED').length
      },
      successRate: history.length > 0 ? 
        (history.filter(m => m.result.success).length / history.length * 100).toFixed(2) + '%' : '0%',
      lastMessageTime: history.length > 0 ? 
        Math.max(...history.map(m => new Date(m.timestamp).getTime())) : null
    };
  }

  // Clear old message history (cleanup)
  clearOldHistory(hoursToKeep = 24) {
    const cutoffTime = new Date(Date.now() - hoursToKeep * 60 * 60 * 1000);
    
    for (const [key, value] of this.messageHistory.entries()) {
      if (new Date(value.timestamp) < cutoffTime) {
        this.messageHistory.delete(key);
      }
    }
    
    console.log(`🧹 Cleaned up message history older than ${hoursToKeep} hours`);
  }

  // Test WMS connection
  async testWMSConnection() {
    try {
      console.log('🧪 Testing WMS connection...');
      
      const testMessage = 'TEST_CONNECTION|HEALTH_CHECK';
      const result = await this.tcpManager.sendToWMS(testMessage, 'test_connection');
      
      if (result.success) {
        console.log('✅ WMS connection test successful');
        return true;
      } else {
        console.error('❌ WMS connection test failed');
        return false;
      }
      
    } catch (error) {
      console.error('❌ WMS connection test error:', error);
      return false;
    }
  }
}

module.exports = WarehouseEventHandler;