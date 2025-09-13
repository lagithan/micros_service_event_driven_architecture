const WarehouseEventHandler = require('../handlers/warehouseEventHandler');
const { OrderServiceClient } = require('../config/warehouseConfig');
const { getConsumerHealth } = require('../config/kafkaConsumer');

class WarehouseAdapterController {
  constructor() {
    this.eventHandler = new WarehouseEventHandler();
    this.orderServiceClient = new OrderServiceClient();
  }

  // Health check endpoint
  async healthCheck(req, res) {
    try {
      const kafkaHealth = getConsumerHealth();
      const orderServiceHealth = await this.orderServiceClient.testConnection();
      const wmsHealth = await this.eventHandler.testWMSConnection();
      
      const isHealthy = kafkaHealth.connected && orderServiceHealth && wmsHealth;
      
      res.status(isHealthy ? 200 : 503).json({
        success: isHealthy,
        message: isHealthy ? 'Warehouse adapter service is healthy' : 'Warehouse adapter service is unhealthy',
        data: {
          service: 'warehouse-adapter-service',
          status: isHealthy ? 'healthy' : 'unhealthy',
          checks: {
            kafka: kafkaHealth.connected,
            orderService: orderServiceHealth,
            wms: wmsHealth
          },
          kafka: kafkaHealth,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Health check error:', error);
      res.status(503).json({
        success: false,
        message: 'Service is unhealthy',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get service status and statistics
  async getStatus(req, res) {
    try {
      const kafkaHealth = getConsumerHealth();
      const statistics = this.eventHandler.getStatistics();
      
      res.status(200).json({
        success: true,
        message: 'Warehouse adapter service status',
        data: {
          service: 'warehouse-adapter-service',
          status: 'running',
          kafka: {
            connected: kafkaHealth.connected,
            subscribedTopics: kafkaHealth.subscribedTopics,
            groupId: kafkaHealth.groupId
          },
          wms: {
            host: process.env.WMS_HOST || 'localhost',
            port: process.env.WMS_PORT || 9999,
            connectionType: 'TCP/IP'
          },
          orderService: {
            baseUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:5003'
          },
          statistics: statistics,
          uptime: process.uptime(),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Get status error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get message history
  async getMessageHistory(req, res) {
    try {
      const { orderId, limit = 50 } = req.query;
      
      let history = this.eventHandler.getMessageHistory(orderId);
      
      // Apply limit
      if (history.length > parseInt(limit)) {
        history = history.slice(-parseInt(limit));
      }
      
      res.status(200).json({
        success: true,
        message: 'Message history retrieved successfully',
        data: {
          messages: history.reverse(), // Show newest first
          total: history.length,
          filteredBy: orderId ? `orderId: ${orderId}` : 'all orders',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Get message history error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get statistics
  async getStatistics(req, res) {
    try {
      const statistics = this.eventHandler.getStatistics();
      
      res.status(200).json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: {
          ...statistics,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Get statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Test WMS connection
  async testWMSConnection(req, res) {
    try {
      const result = await this.eventHandler.testWMSConnection();
      
      res.status(200).json({
        success: result,
        message: result ? 'WMS connection test successful' : 'WMS connection test failed',
        data: {
          wmsHost: process.env.WMS_HOST || 'localhost',
          wmsPort: process.env.WMS_PORT || 9999,
          connectionType: 'TCP/IP',
          testResult: result,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('WMS connection test error:', error);
      res.status(500).json({
        success: false,
        message: 'WMS connection test failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Test Order Service connection
  async testOrderServiceConnection(req, res) {
    try {
      const result = await this.orderServiceClient.testConnection();
      
      res.status(200).json({
        success: result,
        message: result ? 'Order Service connection test successful' : 'Order Service connection test failed',
        data: {
          orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:5003',
          testResult: result,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Order Service connection test error:', error);
      res.status(500).json({
        success: false,
        message: 'Order Service connection test failed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Manual message send (for testing)
  async sendTestMessage(req, res) {
    try {
      const { message, messageId } = req.body;
      
      if (!message) {
        return res.status(400).json({
          success: false,
          message: 'Message content is required'
        });
      }

      const result = await this.eventHandler.tcpManager.sendToWMS(
        message, 
        messageId || `manual_test_${Date.now()}`
      );

      res.status(200).json({
        success: true,
        message: 'Test message sent successfully',
        data: {
          sentMessage: message,
          result: result,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Send test message error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test message',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Clear old message history
  async clearHistory(req, res) {
    try {
      const { hoursToKeep = 24 } = req.query;
      
      this.eventHandler.clearOldHistory(parseInt(hoursToKeep));
      
      res.status(200).json({
        success: true,
        message: `Message history older than ${hoursToKeep} hours cleared successfully`,
        data: {
          clearedBefore: new Date(Date.now() - parseInt(hoursToKeep) * 60 * 60 * 1000).toISOString(),
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Clear history error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to clear message history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Simulate warehouse event (for testing)
  async simulateWarehouseEvent(req, res) {
    try {
      const { eventType, orderData } = req.body;
      
      if (!eventType || !orderData) {
        return res.status(400).json({
          success: false,
          message: 'eventType and orderData are required'
        });
      }

      console.log(`🧪 Simulating warehouse event: ${eventType}`);

      let result;
      switch (eventType) {
        case 'ORDER_CREATED':
          result = await this.eventHandler.handleOrderCreated(orderData);
          break;
        case 'ORDER_STATUS_UPDATED':
          result = await this.eventHandler.handleOrderStatusUpdated(orderData);
          break;
        case 'ORDER_CANCELLED':
          result = await this.eventHandler.handleOrderCancelled(orderData);
          break;
        default:
          throw new Error(`Unknown event type: ${eventType}`);
      }

      res.status(200).json({
        success: true,
        message: `Warehouse event ${eventType} simulated successfully`,
        data: {
          eventType,
          orderData,
          result,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      console.error('Simulate warehouse event error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to simulate warehouse event',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Get service information
  async getServiceInfo(req, res) {
    try {
      res.status(200).json({
        success: true,
        service: 'warehouse-adapter-service',
        version: '1.0.0',
        description: 'Translates Kafka events into TCP/IP messages for WMS integration',
        capabilities: [
          'Kafka event consumption',
          'TCP/IP message translation',
          'WMS communication',
          'Order Service integration',
          'Message history tracking'
        ],
        endpoints: {
          health: 'GET /health',
          status: 'GET /api/warehouse/status',
          history: 'GET /api/warehouse/history',
          statistics: 'GET /api/warehouse/statistics',
          testWMS: 'GET /api/warehouse/test/wms',
          testOrderService: 'GET /api/warehouse/test/order-service',
          sendTest: 'POST /api/warehouse/test/send',
          clearHistory: 'DELETE /api/warehouse/history',
          simulate: 'POST /api/warehouse/simulate'
        },
        kafkaTopics: {
          consumed: [
            'order-events',
            'order-status-events'
          ]
        },
        tcpMessageFormats: {
          ORDER_CREATED: 'NEW_ORDER|OrderNumber|TrackingNumber|Sender|Receiver|Status',
          ORDER_STATUS_UPDATE: 'ORDER_UPDATE|OrderNumber|TrackingNumber|PrevStatus|NewStatus|Location',
          ORDER_CANCELLED: 'ORDER_CANCEL|OrderNumber|TrackingNumber|Reason',
          WAREHOUSE_ASSIGN: 'WAREHOUSE_ASSIGN|OrderNumber|TrackingNumber|Location'
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Get service info error:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
}

module.exports = WarehouseAdapterController;