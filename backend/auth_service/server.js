const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const authRoutes = require('./routes/authRoutes');
const clientRoutes = require('./routes/clientRoutes');
const driverRoutes = require('./routes/driverRoutes');
const { connectDatabase } = require('./config/database');
const { initKafka } = require('./config/kafka');

const app = express();
const PORT = process.env.PORT || 5001;
const GATEWAY_URL = 'http://localhost:5000';
const SERVICE_NAME = 'auth-service';

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
    message: 'Auth service is healthy',
    service: 'auth-service',
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
    service: 'auth-service',
    version: '1.0.0',
    description: 'Authentication and user management service',
    endpoints: {
      health: 'GET /health',
      info: 'GET /info',
      auth: {
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        check: 'GET /api/auth/check'
      },
      client: {
        register: 'POST /api/client/register',
        profile: 'POST /api/client/profile'
      },
      driver: {
        register: 'POST /api/driver/register',
        profile: 'POST /api/driver/profile'
      }
    },
    timestamp: new Date().toISOString()
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/client', clientRoutes);
app.use('/api/driver', driverRoutes);


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
        routes: ['api/auth', 'api/client', 'api/driver'], // FIXED: Removed leading slash for consistent matching
        metadata: {
          version: '1.0.0',
          description: 'Authentication and user management service',
          preservePath: true, // CRITICAL: This ensures /api/auth/register -> http://localhost:5001/api/auth/register
          removePrefix: false, // Don't remove any path prefix
          capabilities: [
            'user-registration',
            'user-authentication', 
            'session-management',
            'profile-management'
          ],
          registeredAt: new Date().toISOString(),
          registeredBy: 'self-registration',
          acceptsAllMethods: true, // Accepts ALL HTTP methods (GET, POST, PUT, DELETE, etc.)
          routePattern: '/api/{auth,client,driver}/*', // Handles all sub-paths under /api/auth/, /api/client/, /api/driver/
          note: 'This service dynamically handles all requests to /api/auth/*, /api/client/*, /api/driver/* with any HTTP method'
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
        console.log(`🔗 Service handles: ${GATEWAY_URL}/api/{auth,client,driver}/* (ALL methods)`);
        console.log(`📍 Path mapping: /api/auth/* -> http://localhost:${PORT}/api/auth/*`);
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
      const testRoutes = ['/api/auth/register', '/api/auth/login', '/api/auth/profile'];
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

// Graceful deregistration on shutdown
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
    console.log(`📊 Connecting to database...`);
    try {
      await connectDatabase();
      console.log(`✅ Database connected successfully`);
    } catch (error) {
      console.warn(`⚠️  Database connection failed: ${error.message}`);
      console.warn(`⚠️  Service will continue running without database functionality`);
    }
    
    console.log(`📨 Initializing Kafka...`);
    try {
      await initKafka();
      console.log(`✅ Kafka connected successfully`);
    } catch (error) {
      console.warn(`⚠️  Kafka connection failed: ${error.message}`);
      console.warn(`⚠️  Service will continue running without event publishing`);
    }
    
    // Start the server
    const server = app.listen(PORT, async () => {
      console.log(`✅ ${SERVICE_NAME} running on port ${PORT}`);
      console.log(`🩺 Health check: http://localhost:${PORT}/health`);
      console.log(`ℹ️  Service info: http://localhost:${PORT}/info`);
      console.log(`📍 Routes: http://localhost:${PORT}/api/auth/*`);
      
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

startServer();