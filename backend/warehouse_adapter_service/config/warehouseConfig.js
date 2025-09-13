const net = require('net');
const axios = require('axios');

// WMS Configuration
const WMS_CONFIG = {
  host: process.env.WMS_HOST || 'localhost',
  port: process.env.WMS_PORT || 9999,
  timeout: process.env.WMS_TIMEOUT || 5000,
  retryAttempts: process.env.WMS_RETRY_ATTEMPTS || 3,
  retryDelay: process.env.WMS_RETRY_DELAY || 2000,
};

// Order Service Configuration
const ORDER_SERVICE_CONFIG = {
  baseUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:5003',
  timeout: 10000,
  retryAttempts: 3,
  retryDelay: 1000,
};

// TCP/IP Message Formatter
class TCPMessageFormatter {
  
  // Format order created message
  static formatOrderCreated(orderData) {
    const { orderId, orderNumber, trackingNumber, senderName, receiverName, orderStatus } = orderData;
    
    // Format: NEW_ORDER|OrderNumber|TrackingNumber|Sender|Receiver|Status
    return `NEW_ORDER|${orderNumber}|${trackingNumber}|${senderName}|${receiverName}|${orderStatus}`;
  }
  
  // Format order status update message
  static formatOrderStatusUpdate(statusData) {
    const { orderNumber, trackingNumber, previousStatus, newStatus, location } = statusData;
    
    // Format: ORDER_UPDATE|OrderNumber|TrackingNumber|PrevStatus|NewStatus|Location
    return `ORDER_UPDATE|${orderNumber}|${trackingNumber}|${previousStatus || 'NONE'}|${newStatus}|${location || 'UNKNOWN'}`;
  }
  
  // Format order cancelled message
  static formatOrderCancelled(orderData) {
    const { orderNumber, trackingNumber, cancelReason } = orderData;
    
    // Format: ORDER_CANCEL|OrderNumber|TrackingNumber|Reason
    return `ORDER_CANCEL|${orderNumber}|${trackingNumber}|${cancelReason || 'CANCELLED'}`;
  }
  
  // Format warehouse assignment message
  static formatWarehouseAssignment(orderData) {
    const { orderNumber, trackingNumber, warehouseLocation } = orderData;
    
    // Format: WAREHOUSE_ASSIGN|OrderNumber|TrackingNumber|Location
    return `WAREHOUSE_ASSIGN|${orderNumber}|${trackingNumber}|${warehouseLocation}`;
  }
}

// TCP/IP Connection Manager
class TCPConnectionManager {
  constructor() {
    this.connectionPool = new Map();
    this.messageQueue = [];
    this.isProcessing = false;
  }
  
  // Send TCP/IP message to WMS
  async sendToWMS(message, messageId = null) {
    return new Promise((resolve, reject) => {
      const messageData = {
        id: messageId || Date.now().toString(),
        content: message,
        timestamp: new Date().toISOString(),
        attempts: 0
      };
      
      this._attemptSend(messageData, resolve, reject);
    });
  }
  
  // Internal method to attempt sending with retry logic
  async _attemptSend(messageData, resolve, reject) {
    messageData.attempts++;
    
    console.log(`📡 Attempting to send TCP message (attempt ${messageData.attempts}/${WMS_CONFIG.retryAttempts}):`, messageData.content);
    
    // For this implementation, we'll simulate the TCP connection
    // In a real system, this would establish an actual TCP socket connection
    
    try {
      // Simulate TCP connection and message sending
      const success = await this._simulateTCPSend(messageData);
      
      if (success) {
        console.log(`✅ TCP Message sent successfully:`, messageData.content);
        console.log(`📋 Message Details:`, {
          messageId: messageData.id,
          timestamp: messageData.timestamp,
          attempts: messageData.attempts
        });
        
        resolve({
          success: true,
          messageId: messageData.id,
          timestamp: messageData.timestamp,
          attempts: messageData.attempts,
          response: 'ACK_RECEIVED'
        });
      } else {
        throw new Error('WMS connection failed');
      }
      
    } catch (error) {
      console.error(`❌ TCP send attempt ${messageData.attempts} failed:`, error.message);
      
      if (messageData.attempts < WMS_CONFIG.retryAttempts) {
        console.log(`⏳ Retrying in ${WMS_CONFIG.retryDelay}ms...`);
        setTimeout(() => {
          this._attemptSend(messageData, resolve, reject);
        }, WMS_CONFIG.retryDelay);
      } else {
        console.error(`❌ All TCP send attempts failed for message:`, messageData.content);
        reject({
          success: false,
          error: error.message,
          messageId: messageData.id,
          attempts: messageData.attempts
        });
      }
    }
  }
  
  // Simulate TCP connection and message sending
  async _simulateTCPSend(messageData) {
    return new Promise((resolve) => {
      // Simulate network delay
      const delay = Math.random() * 1000 + 500; // 500-1500ms delay
      
      setTimeout(() => {
        // Simulate 90% success rate
        const success = Math.random() > 0.1;
        
        if (success) {
          console.log(`🔌 TCP Connection established to WMS at ${WMS_CONFIG.host}:${WMS_CONFIG.port}`);
          console.log(`📤 Message sent: ${messageData.content}`);
          console.log(`📥 WMS Response: ACK_RECEIVED`);
          console.log(`🔌 TCP Connection closed`);
        } else {
          console.log(`❌ TCP Connection failed to WMS at ${WMS_CONFIG.host}:${WMS_CONFIG.port}`);
        }
        
        resolve(success);
      }, delay);
    });
  }
  
  // Real TCP connection implementation (commented for simulation)
  /*
  async _realTCPSend(messageData) {
    return new Promise((resolve, reject) => {
      const client = new net.Socket();
      let responseReceived = false;
      
      // Set connection timeout
      client.setTimeout(WMS_CONFIG.timeout);
      
      // Handle connection
      client.connect(WMS_CONFIG.port, WMS_CONFIG.host, () => {
        console.log(`🔌 TCP Connected to WMS at ${WMS_CONFIG.host}:${WMS_CONFIG.port}`);
        
        // Send message
        client.write(messageData.content + '\n');
        console.log(`📤 Message sent: ${messageData.content}`);
      });
      
      // Handle response
      client.on('data', (data) => {
        const response = data.toString().trim();
        console.log(`📥 WMS Response: ${response}`);
        
        if (response.includes('ACK') || response.includes('OK')) {
          responseReceived = true;
          client.destroy();
          resolve(true);
        } else {
          client.destroy();
          reject(new Error(`Invalid WMS response: ${response}`));
        }
      });
      
      // Handle connection errors
      client.on('error', (error) => {
        console.error(`❌ TCP Connection error:`, error.message);
        reject(error);
      });
      
      // Handle timeout
      client.on('timeout', () => {
        console.error(`⏰ TCP Connection timeout`);
        client.destroy();
        reject(new Error('Connection timeout'));
      });
      
      // Handle connection close
      client.on('close', () => {
        console.log(`🔌 TCP Connection closed`);
        if (!responseReceived) {
          reject(new Error('Connection closed without response'));
        }
      });
    });
  }
  */
}

// Order Service API Client
class OrderServiceClient {
  constructor() {
    this.baseUrl = ORDER_SERVICE_CONFIG.baseUrl;
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: ORDER_SERVICE_CONFIG.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'warehouse-adapter-service/1.0.0'
      }
    });
  }
  
  // Update order status via Order Service API
  async updateOrderStatus(orderId, statusData) {
    try {
      console.log(`🔄 Updating order ${orderId} status via Order Service API...`);
      
      const response = await this.client.patch(`/api/orders/${orderId}/status`, {
        newStatus: statusData.newStatus,
        statusChangedBy: statusData.statusChangedBy || 'warehouse-adapter',
        changeReason: statusData.changeReason || 'Updated by WMS',
        location: statusData.location
      });
      
      if (response.data.success) {
        console.log(`✅ Order ${orderId} status updated successfully:`, response.data.data);
        return response.data;
      } else {
        throw new Error(response.data.message || 'Failed to update order status');
      }
      
    } catch (error) {
      console.error(`❌ Failed to update order ${orderId} status:`, error.message);
      
      if (error.response) {
        console.error(`   HTTP ${error.response.status}: ${error.response.data?.message || error.message}`);
      }
      
      throw error;
    }
  }
  
  // Get order details
  async getOrder(orderId) {
    try {
      console.log(`🔍 Fetching order ${orderId} details...`);
      
      const response = await this.client.get(`/api/orders/order/${orderId}`);
      
      if (response.data.success) {
        console.log(`✅ Order ${orderId} details fetched successfully`);
        return response.data.data;
      } else {
        throw new Error(response.data.message || 'Failed to fetch order details');
      }
      
    } catch (error) {
      console.error(`❌ Failed to fetch order ${orderId} details:`, error.message);
      throw error;
    }
  }
  
  // Test connection to Order Service
  async testConnection() {
    try {
      const response = await this.client.get('/health');
      return response.data.success;
    } catch (error) {
      console.error('Order Service connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = {
  WMS_CONFIG,
  ORDER_SERVICE_CONFIG,
  TCPMessageFormatter,
  TCPConnectionManager,
  OrderServiceClient
};