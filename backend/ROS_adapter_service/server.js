const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 5008;
const GATEWAY_URL = 'http://localhost:5000';
const SERVICE_NAME = 'ros-adapter-service';

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

// Mock route data generator
const generateMockRoute = (address, scenario = 'warehouse') => {
  let routes, instructions;

  if (scenario === 'client') {
    // Routes for pickup from client (don't mention warehouse)
    routes = [
      `Head north on Main St -> Turn right on ${address} St -> Turn left on Oak Ave -> Arrive at ${address}`,
      `Take Highway 101 -> Exit at ${address} Blvd -> Continue straight -> Turn right -> Arrive at ${address}`,
      `Go south on Central Ave -> Turn left on ${address} Rd -> Pass the park -> Turn right -> Arrive at ${address}`,
      `Follow GPS route via ${address} Way -> Navigate through downtown -> Turn left at the signal -> Arrive at ${address}`,
      `Take the express route -> Turn right on ${address} Circle -> Follow the roundabout -> Exit second right -> Arrive at ${address}`
    ];

    instructions = [
      "Start navigation to pickup location",
      `Navigate to ${address}`,
      "Follow optimal route provided",
      "Collect package from client",
      "Return to warehouse after pickup"
    ];
  } else {
    // Routes from warehouse (for delivery)
    routes = [
      `Start at warehouse -> Head north on Main St -> Turn right on ${address} St -> Turn left on Oak Ave -> Arrive at ${address}`,
      `Start at warehouse -> Take Highway 101 -> Exit at ${address} Blvd -> Continue straight -> Turn right -> Arrive at ${address}`,
      `Start at warehouse -> Go south on Central Ave -> Turn left on ${address} Rd -> Pass the park -> Turn right -> Arrive at ${address}`,
      `Start at warehouse -> Follow GPS route via ${address} Way -> Navigate through downtown -> Turn left at the signal -> Arrive at ${address}`,
      `Start at warehouse -> Take the express route -> Turn right on ${address} Circle -> Follow the roundabout -> Exit second right -> Arrive at ${address}`
    ];

    instructions = [
      "Start navigation from warehouse",
      `Navigate to ${address}`,
      "Follow optimal route provided",
      "Update delivery status upon arrival"
    ];
  }

  const randomRoute = routes[Math.floor(Math.random() * routes.length)];
  const estimatedTime = Math.floor(Math.random() * 30) + 10; // 10-40 minutes
  const distance = (Math.random() * 15 + 5).toFixed(1); // 5-20 km

  return {
    success: true,
    address: address,
    scenario: scenario,
    route: randomRoute,
    estimatedTime: `${estimatedTime} minutes`,
    distance: `${distance} km`,
    instructions: instructions,
    timestamp: new Date().toISOString()
  };
};

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'ROS adapter service is healthy',
    service: SERVICE_NAME,
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
    service: SERVICE_NAME,
    version: '1.0.0',
    description: 'ROS adapter service for route planning and navigation',
    endpoints: {
      health: 'GET /health',
      info: 'GET /info',
      routes: {
        getRoute: 'POST /api/ros/route',
        getRouteByAddress: 'GET /api/ros/route/:address'
      }
    },
    capabilities: [
      'Route planning',
      'Navigation assistance',
      'Address-based routing',
      'Mock data generation'
    ],
    timestamp: new Date().toISOString()
  });
});

// Main route endpoint - accepts POST with address and scenario
app.post('/api/ros/route', (req, res) => {
  try {
    const { address, scenario } = req.body;

    if (!address) {
      return res.status(400).json({
        success: false,
        message: 'Address is required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate scenario parameter
    const validScenarios = ['client', 'warehouse'];
    const routeScenario = validScenarios.includes(scenario) ? scenario : 'warehouse';

    console.log(`🗺️ Generating route for address: ${address}, scenario: ${routeScenario}`);
    const routeData = generateMockRoute(address, routeScenario);

    res.status(200).json(routeData);
  } catch (error) {
    console.error('Error generating route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate route',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Alternative GET endpoint for route by address parameter
app.get('/api/ros/route/:address', (req, res) => {
  try {
    const { address } = req.params;

    console.log(`🗺️ Generating route for address: ${address}`);
    const routeData = generateMockRoute(address);

    res.status(200).json(routeData);
  } catch (error) {
    console.error('Error generating route:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate route',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

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
        routes: ['api/ros'],
        metadata: {
          version: '1.0.0',
          description: 'ROS adapter service for route planning and navigation',
          preservePath: true,
          removePrefix: false,
          capabilities: [
            'route-planning',
            'navigation-assistance',
            'address-routing',
            'mock-data-generation'
          ],
          registeredAt: new Date().toISOString(),
          registeredBy: 'self-registration',
          acceptsAllMethods: true,
          routePattern: '/api/ros/*',
          note: 'This service handles route planning and navigation requests'
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
        console.log(`🔗 Service handles: ${GATEWAY_URL}/api/ros/* (ALL methods)`);
        console.log(`📍 Path mapping: /api/ros/* -> http://localhost:${PORT}/api/ros/*`);
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

    // Start the server
    const server = app.listen(PORT, async () => {
      console.log(`✅ ${SERVICE_NAME} running on port ${PORT}`);
      console.log(`🩺 Health check: http://localhost:${PORT}/health`);
      console.log(`ℹ️  Service info: http://localhost:${PORT}/info`);
      console.log(`📍 Routes: http://localhost:${PORT}/api/ros/*`);

      // Wait a moment for server to be fully ready
      setTimeout(async () => {
        // Test gateway connectivity first
        const gatewayReachable = await testGatewayConnection();

        if (gatewayReachable) {
          console.log(`🔄 Registering with gateway...`);
          await selfRegister();
        } else {
          console.log(`⚠️  Gateway not reachable. Service will run independently.`);
          console.log(`ℹ️  Start the gateway and restart this service to enable gateway integration.`);
        }
      }, 1000);
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
console.log('🗺️ ===============================================');
console.log('🗺️ ROS ADAPTER SERVICE');
console.log('🗺️ Route Planning & Navigation');
console.log('🗺️ ===============================================');

startServer();