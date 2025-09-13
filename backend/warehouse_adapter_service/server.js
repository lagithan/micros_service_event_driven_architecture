const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const warehouseRoutes = require('./routes/warehouseRoutes');
const { initKafkaConsumer, startKafkaConsumer } = require('./config/kafkaConsumer');
const WarehouseEventHandler = require('./handlers/warehouseEventHandler');

const app = express();
const PORT = process.env.PORT || 5004;
const GATEWAY_URL = 'http://localhost:5000';
const SERVICE_NAME = 'warehouse-adapter-service';

// Middleware
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${req.ip}`);
  next();
});

// Health check endpoint for service discovery
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Warehouse adapter service is healthy',
    service: 'warehouse-adapter-service',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Service info endpoint
app.get('/info', (req, res) => {
  res.status(200).json({
    success: true,
    service: 'warehouse-adapter-service',
    version: '1.0.0',
    description: 'Translates Kafka events into TCP/IP messages for WMS integration',
    endpoints: {
      health: 'GET /health',
      info: 'GET /info',
      warehouse: {
        status: 'GET /api/warehouse/status',
        history: 'GET /api/warehouse/history',
        statistics: 'GET /api/warehouse/statistics',
        testWMS: 'GET /api/warehouse/test/wms',
        testOrderService: 'GET /api/warehouse/test/order-service',
        sendTest: 'POST /api/warehouse/test/send',
        simulate: 'POST /api/warehouse/simulate'
      }
    },
    capabilities: [
      'Kafka event consumption',
      'TCP/IP message translation',
      'WMS communication',
      'Order Service integration'
    ],
    timestamp: new Date().toISOString()
  });
});

// Warehouse adapter routes
app.use('/api/warehouse', warehouseRoutes);

// Initialize event handler
const eventHandler = new WarehouseEventHandler();

// Kafka event handlers
const kafkaEventHandlers = {
  onOrderCreated: async (eventData) => {
    try {
      console.log('🆕 Received ORDER_CREATED event from Kafka');
      await eventHandler.handleOrderCreated(eventData);
    } catch (error) {
      console.error('❌ Error handling ORDER_CREATED event:', error);
    }
  },

  onOrderStatusUpdated: async (eventData) => {
    try {
      console.log('🔄 Received ORDER_STATUS_UPDATED event from Kafka');
      await eventHandler.handleOrderStatusUpdated(eventData);
    } catch (error) {
      console.error('❌ Error handling ORDER_STATUS_UPDATED event:', error);
    }
  },

  onOrderCancelled: async (eventData) => {
    try {
      console.log('❌ Received ORDER_CANCELLED event from Kafka');
      await eventHandler.handleOrderCancelled(eventData);
    } catch (error) {
      console.error('❌ Error handling ORDER_CANCELLED event:', error);
    }
  }
};

// Self-registration with Express API Gateway
const selfRegister = async (maxRetries = 5, delayMs = 3000) => {
  let attempts = 0;
  
  const tryRegister = async () => {
    attempts++;
    try {
      const serviceInfo = {
        name: SERVICE_NAME,
        url: `http://localhost:${PORT}`,
        health: `http://localhost:${PORT}/health`,
        routes: ['api/warehouse'],
        metadata: {
          version: '1.0.0',
          description: 'Warehouse Management System adapter for TCP/IP message translation',
          preservePath: true,
          removePrefix: false,
          capabilities: [
            'kafka-event-consumption',
            'tcp-ip-translation',
            'wms-integration',
            'message-history-tracking'
          ],
          registeredAt: new Date().toISOString(),
          registeredBy: 'self-registration',
          acceptsAllMethods: true,
          routePattern: '/api/warehouse/*',
          note: 'This service handles Kafka event consumption and WMS TCP/IP communication'
        }
      };

      console.log(`🔄 Attempting to register with gateway (attempt ${attempts}/${maxRetries})...`);
      console.log(`📋 Registration config:`, {
        name: serviceInfo.name,
        url: serviceInfo.url,
        routes: serviceInfo.routes,
        preservePath: serviceInfo.metadata.preservePath,
        removePrefix: serviceInfo.metadata.removePrefix
      });
      
      const response = await axios.post(`${GATEWAY_URL}/gateway/register`, serviceInfo, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': `${SERVICE_NAME}/1.0.0`
        }
      });

      if (response.status === 201) {
        console.log(`✅ Successfully registered with Express API Gateway!`);
        console.log(`🔗 Service handles: ${GATEWAY_URL}/api/warehouse/* (ALL methods)`);
        console.log(`📍 Path mapping: /api/warehouse/* -> http://localhost:${PORT}/api/warehouse/*`);
        console.log(`🔧 Configuration: preservePath=true, removePrefix=false`);
        console.log(`📋 Response:`, response.data);
        return true;
      }
    } catch (error) {
      console.error(`❌ Registration attempt ${attempts} failed:`);
      
      if (error.response) {
        console.error(`   HTTP ${error.response.status}: ${error.response.data?.message || error.message}`);
        console.error(`   Details:`, error.response.data);
      } else if (error.request) {
        console.error(`   Network error: ${error.message}`);
        console.error(`   Is the gateway running at ${GATEWAY_URL}?`);
      } else {
        console.error(`   Error: ${error.message}`);
      }
      
      if (attempts < maxRetries) {
        console.log(`⏳ Retrying in ${delayMs / 1000} seconds...`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        return tryRegister();
      } else {
        console.error(`❌ Failed to register with Express API Gateway after ${maxRetries} attempts`);
        console.log(`ℹ️  Service will continue running but may not be accessible through the gateway`);
        console.log(`🔧 Manual registration command:`);
        console.log(`   curl -X POST ${GATEWAY_URL}/gateway/register \\`);
        console.log(`        -H "Content-Type: application/json" \\`);
        console.log(`        -d '${JSON.stringify(serviceInfo, null, 8)}'`);
      }
    }
    return false;
  };
  
  return tryRegister();
};

// Test gateway connectivity
const testGatewayConnection = async () => {
  try {
    console.log(`🔍 Testing gateway connectivity...`);
    const response = await axios.get(`${GATEWAY_URL}/gateway/health`, {
      timeout: 5000
    });
    
    if (response.status === 200) {
      console.log(`✅ Gateway is reachable at ${GATEWAY_URL}`);
      return true;
    }
  } catch (error) {
    console.error(`❌ Cannot reach gateway at ${GATEWAY_URL}:`, error.message);
    return false;
  }
};

// Periodic health beacon to ensure gateway knows we're alive
const startHealthBeacon = () => {
  setInterval(async () => {
    try {
      // Check if we're still registered
      const response = await axios.get(`${GATEWAY_URL}/gateway/services`, {
        timeout: 5000
      });
      
      const services = response.data?.data?.services || [];
      const isRegistered = services.some(service => service.name === SERVICE_NAME);
      
      if (!isRegistered) {
        console.log(`⚠️  Not registered with gateway, attempting re-registration...`);
        await selfRegister(2, 1000);
      } else {
        console.log(`💚 Health beacon: Still registered with gateway`);
      }
    } catch (error) {
      // Gateway might be down, ignore this check
      console.log(`⚠️  Unable to reach gateway for health beacon: ${error.message}`);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes
};

// Verify registration after startup
const verifyRegistration = async () => {
  try {
    console.log(`🔍 Verifying registration with gateway...`);
    const response = await axios.get(`${GATEWAY_URL}/gateway/services`, {
      timeout: 5000
    });
    
    const services = response.data?.data?.services || [];
    const ourService = services.find(service => service.name === SERVICE_NAME);
    
    if (ourService) {
      console.log(`✅ Registration verified!`);
      console.log(`📋 Service config:`, {
        name: ourService.name,
        url: ourService.url,
        routes: ourService.routes,
        healthy: ourService.healthy,
        preservePath: ourService.preservePath,
        removePrefix: ourService.removePrefix
      });
      
      // Test route mapping
      const testRoutes = ['/api/warehouse/status', '/api/warehouse/health'];
      console.log(`🧪 Testing route mappings...`);
      
      for (const route of testRoutes) {
        try {
          const testResponse = await axios.post(`${GATEWAY_URL}/gateway/test-route`, 
            { path: route }, 
            { timeout: 3000 }
          );
          
          if (testResponse.data.success) {
            console.log(`   ✅ Route ${route} -> ${testResponse.data.service.name}`);
          } else {
            console.log(`   ❌ Route ${route} not mapped`);
          }
        } catch (testError) {
          console.log(`   ⚠️  Route test failed for ${route}: ${testError.message}`);
        }
      }
    } else {
      console.log(`❌ Service not found in gateway registry`);
      console.log(`📋 Available services:`, services.map(s => s.name));
    }
  } catch (error) {
    console.log(`⚠️  Could not verify registration: ${error.message}`);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log(`🔄 Shutting down ${SERVICE_NAME}...`);
  
  try {
    // Attempt to deregister from gateway
    console.log(`🔄 Deregistering from gateway...`);
    await axios.delete(`${GATEWAY_URL}/gateway/register/${SERVICE_NAME}`, {
      timeout: 5000
    });
    console.log(`✅ Successfully deregistered from gateway`);
  } catch (error) {
    console.log(`⚠️  Failed to deregister from gateway: ${error.message}`);
  }
  
  console.log(`✅ ${SERVICE_NAME} shutdown complete`);
  process.exit(0);
};

// Start server
const startServer = async () => {
  try {
    console.log(`🚀 Starting ${SERVICE_NAME}...`);
    
    // Initialize dependencies (with graceful degradation)
    console.log(`📨 Initializing Kafka consumer...`);
    try {
      await initKafkaConsumer();
      console.log(`✅ Kafka consumer initialized successfully`);
      
      // Start consuming Kafka messages
      console.log(`📥 Starting Kafka message consumption...`);
      await startKafkaConsumer(kafkaEventHandlers);
      console.log(`✅ Kafka consumer started successfully`);
      
    } catch (error) {
      console.warn(`⚠️  Kafka consumer initialization failed: ${error.message}`);
      console.warn(`⚠️  Service will continue running without event processing`);
    }
    
    // Start the server
    const server = app.listen(PORT, async () => {
      console.log(`✅ ${SERVICE_NAME} running on port ${PORT}`);
      console.log(`🩺 Health check: http://localhost:${PORT}/health`);
      console.log(`ℹ️  Service info: http://localhost:${PORT}/info`);
      console.log(`📍 Routes: http://localhost:${PORT}/api/warehouse/*`);
      console.log(`🏭 WMS TCP/IP: ${process.env.WMS_HOST || 'localhost'}:${process.env.WMS_PORT || 9999}`);
      console.log(`📡 Order Service: ${process.env.ORDER_SERVICE_URL || 'http://localhost:5003'}`);
      
      // Start message history cleanup job
      console.log(`🧹 Starting periodic message history cleanup...`);
      setInterval(() => {
        try {
          eventHandler.clearOldHistory(72); // Keep 3 days of history
        } catch (error) {
          console.error('Error in cleanup job:', error);
        }
      }, 6 * 60 * 60 * 1000); // Run every 6 hours
      
      // Wait a moment for server to be fully ready
      setTimeout(async () => {
        // Test gateway connectivity first
        const gatewayReachable = await testGatewayConnection();
        
        if (gatewayReachable) {
          console.log(`🔄 Registering with gateway...`);
          const registered = await selfRegister();
          
          if (registered) {
            // Verify registration worked correctly
            setTimeout(async () => {
              await verifyRegistration();
            }, 2000);
            
            // Start health beacon after initial registration
            setTimeout(() => {
              console.log(`🩺 Starting health beacon...`);
              startHealthBeacon();
            }, 60000); // Start beacon after 1 minute
          }
        } else {
          console.log(`⚠️  Gateway not reachable. Service will run independently.`);
          console.log(`ℹ️  Start the gateway and restart this service to enable gateway integration.`);
        }
        
        // Test WMS connection
        console.log(`🧪 Testing WMS connection...`);
        try {
          const wmsTestResult = await eventHandler.testWMSConnection();
          if (wmsTestResult) {
            console.log(`✅ WMS connection test successful`);
          } else {
            console.warn(`⚠️  WMS connection test failed - check WMS configuration`);
          }
        } catch (error) {
          console.warn(`⚠️  WMS connection test error: ${error.message}`);
        }
        
        // Test Order Service connection
        console.log(`🧪 Testing Order Service connection...`);
        try {
          const orderServiceTestResult = await eventHandler.orderServiceClient.testConnection();
          if (orderServiceTestResult) {
            console.log(`✅ Order Service connection test successful`);
          } else {
            console.warn(`⚠️  Order Service connection test failed - check service configuration`);
          }
        } catch (error) {
          console.warn(`⚠️  Order Service connection test error: ${error.message}`);
        }
        
      }, 1000); // Wait 1 second for server to be fully ready
    });
    
    // Set server timeout
    server.timeout = 35000;
    
    return server;
    
  } catch (error) {
    console.error(`❌ Failed to start ${SERVICE_NAME}:`, error);
    process.exit(1);
  }
};

// Signal handlers for graceful shutdown
process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown();
});

// Log startup banner
console.log('🏭 ===============================================');
console.log('🏭 WAREHOUSE ADAPTER SERVICE');
console.log('🏭 Kafka Events → TCP/IP Messages → WMS');
console.log('🏭 ===============================================');

startServer();