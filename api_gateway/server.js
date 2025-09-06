const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const ServiceRegistry = require('./config/serviceRegistry');
const dynamicRouter = require('./middleware/dynamicRouter');

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize service registry
const serviceRegistry = new ServiceRegistry();

// Security middleware
app.use(helmet());
app.use(cors());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.'
  }
});
app.use(limiter);

// Body parsing middleware - conditional parsing
app.use((req, res, next) => {
  // Only parse body for gateway management endpoints
  if (req.path.startsWith('/gateway')) {
    return express.json({ limit: '10mb' })(req, res, next);
  }
  next();
});

app.use((req, res, next) => {
  // Only parse URL encoded for gateway management endpoints  
  if (req.path.startsWith('/gateway')) {
    return express.urlencoded({ extended: true, limit: '10mb' })(req, res, next);
  }
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const timestamp = new Date().toISOString();
  const userAgent = req.get('User-Agent') || 'Unknown';
  console.log(`${timestamp} - ${req.method} ${req.originalUrl} - ${req.ip} - ${userAgent}`);
  next();
});

// Service management endpoints
app.post('/gateway/register', async (req, res) => {
  try {
    const serviceInfo = req.body;
    
    console.log(`📝 Received registration request:`, serviceInfo);
    
    // Validate required fields
    if (!serviceInfo.name || !serviceInfo.url) {
      return res.status(400).json({
        success: false,
        message: 'Service name and URL are required',
        required: ['name', 'url'],
        provided: Object.keys(serviceInfo)
      });
    }

    // Validate URL format
    try {
      new URL(serviceInfo.url);
    } catch (urlError) {
      return res.status(400).json({
        success: false,
        message: 'Invalid service URL format',
        error: 'URL must include protocol (http:// or https://)'
      });
    }

    const service = await serviceRegistry.registerService(serviceInfo);
    
    console.log(`✅ Service registered: ${service.name} -> ${service.url}`);
    
    res.status(201).json({
      success: true,
      message: 'Service registered successfully',
      service: {
        name: service.name,
        url: service.url,
        routes: service.routes || [],
        healthy: service.healthy,
        registeredAt: service.metadata?.registeredAt,
        preservePath: service.metadata?.preservePath,
        removePrefix: service.metadata?.removePrefix
      }
    });
  } catch (error) {
    console.error('❌ Service registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register service',
      error: error.message
    });
  }
});

app.delete('/gateway/register/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const success = await serviceRegistry.unregisterService(serviceName);
    
    if (success) {
      console.log(`✅ Service unregistered: ${serviceName}`);
      res.status(200).json({
        success: true,
        message: `Service ${serviceName} unregistered successfully`
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
  } catch (error) {
    console.error('❌ Service unregistration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unregister service',
      error: error.message
    });
  }
});

app.get('/gateway/services', async (req, res) => {
  try {
    const services = await serviceRegistry.getServices();
    const stats = await serviceRegistry.getServiceStats();
    
    res.status(200).json({
      success: true,
      data: {
        services: services.map(service => ({
          name: service.name,
          url: service.url,
          routes: service.routes || [],
          healthy: service.healthy,
          lastHealthCheck: service.lastHealthCheck,
          registeredAt: service.metadata?.registeredAt,
          preservePath: service.metadata?.preservePath,
          removePrefix: service.metadata?.removePrefix,
          metadata: service.metadata || {}
        })),
        stats
      }
    });
  } catch (error) {
    console.error('❌ Get services error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get services',
      error: error.message
    });
  }
});

// Gateway health check
app.get('/gateway/health', async (req, res) => {
  try {
    const stats = await serviceRegistry.getServiceStats();
    const healthChecks = await serviceRegistry.checkServicesHealth();
    
    res.status(200).json({
      success: true,
      gateway: {
        status: 'healthy',
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        pid: process.pid,
        version: process.version,
        env: process.env.NODE_ENV || 'development'
      },
      services: {
        ...stats,
        details: healthChecks
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Health check error:', error);
    res.status(200).json({
      success: true,
      gateway: {
        status: 'healthy',
        uptime: process.uptime(),
        error: 'Partial health check failure'
      },
      services: {
        error: 'Unable to check service health',
        message: error.message
      },
      timestamp: new Date().toISOString()
    });
  }
});

// Gateway info endpoint
app.get('/gateway/info', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      name: 'Express API Gateway',
      version: '1.0.0',
      port: PORT,
      nodeVersion: process.version,
      features: [
        'Dynamic Service Discovery',
        'Automatic Service Registration',
        'Health Monitoring',
        'Circuit Breaking',
        'Rate Limiting',
        'Dynamic Routing',
        'Request Timeout Handling',
        'CORS Support',
        'Security Headers',
        'Path Preservation',
        'Flexible Route Mapping'
      ],
      endpoints: {
        management: [
          'POST /gateway/register - Register a service',
          'DELETE /gateway/register/:name - Unregister a service',
          'GET /gateway/services - List all services',
          'GET /gateway/health - Gateway health check',
          'GET /gateway/info - Gateway information',
          'GET /gateway/debug - Debug service registry'
        ],
        dynamic: [
          'ALL /* - Dynamic routing to registered services'
        ]
      },
      limits: {
        requestBodySize: '10mb',
        rateLimit: '100 requests per 15 minutes per IP',
        requestTimeout: '30 seconds'
      }
    }
  });
});

// Debug endpoint to check service registry state
app.get('/gateway/debug', async (req, res) => {
  try {
    const services = await serviceRegistry.getServices();
    const stats = await serviceRegistry.getServiceStats();
    
    res.status(200).json({
      success: true,
      debug: {
        totalServices: services.length,
        services: services.map(service => ({
          name: service.name,
          url: service.url,
          routes: service.routes || [],
          healthy: service.healthy,
          circuitState: service.circuitState,
          lastHealthCheck: service.lastHealthCheck,
          consecutiveFailures: service.consecutiveFailures || 0,
          preservePath: service.metadata?.preservePath,
          removePrefix: service.metadata?.removePrefix,
          metadata: service.metadata || {},
          registeredAt: service.metadata?.registeredAt
        })),
        stats,
        circuitBreakers: require('./middleware/dynamicRouter').circuitBreakers ? 
          Array.from(require('./middleware/dynamicRouter').circuitBreakers.entries()).map(([name, state]) => ({
            service: name,
            ...state
          })) : [],
        gateway: {
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          pid: process.pid
        },
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('❌ Debug endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Debug endpoint failed',
      error: error.message
    });
  }
});

// Test endpoint to verify gateway is working
app.get('/gateway/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Gateway is working correctly',
    timestamp: new Date().toISOString(),
    requestInfo: {
      method: req.method,
      url: req.originalUrl,
      headers: req.headers,
      ip: req.ip
    }
  });
});

// Route testing endpoint
app.post('/gateway/test-route', async (req, res) => {
  try {
    const { path } = req.body;
    
    if (!path) {
      return res.status(400).json({
        success: false,
        message: 'Path is required',
        example: { path: '/api/auth/register' }
      });
    }
    
    const service = await serviceRegistry.findServiceByRoute(path);
    
    if (service) {
      res.status(200).json({
        success: true,
        message: 'Route mapping found',
        path: path,
        service: {
          name: service.name,
          url: service.url,
          routes: service.routes,
          healthy: service.healthy,
          preservePath: service.metadata?.preservePath,
          removePrefix: service.metadata?.removePrefix
        }
      });
    } else {
      const availableServices = await serviceRegistry.getHealthyServices();
      res.status(404).json({
        success: false,
        message: 'No service found for this route',
        path: path,
        availableServices: availableServices.map(s => ({
          name: s.name,
          routes: s.routes || [],
          url: s.url
        }))
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Route test failed',
      error: error.message
    });
  }
});

// Dynamic routing middleware - handles all requests to registered services
app.use(dynamicRouter(serviceRegistry));

// 404 handler for unmatched routes
app.use((req, res) => {
  console.log(`❌ Route not found: ${req.method} ${req.originalUrl}`);
  
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Check /gateway/services for available services or /gateway/info for documentation',
    availableEndpoints: [
      '/gateway/info',
      '/gateway/health', 
      '/gateway/services',
      '/gateway/debug',
      '/gateway/test',
      'POST /gateway/test-route'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('❌ Gateway error:', error);
  
  if (!res.headersSent) {
    const isDevelopment = process.env.NODE_ENV === 'development';
    
    res.status(500).json({
      success: false,
      message: 'Internal gateway error',
      error: isDevelopment ? error.message : 'Something went wrong',
      stack: isDevelopment ? error.stack : undefined,
      timestamp: new Date().toISOString()
    });
  }
});

// Start server and initialize health monitoring
const startServer = async () => {
  try {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Express API Gateway running on port ${PORT}`);
      console.log(`🌍 Gateway URL: http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/gateway/health`);
      console.log(`📋 Services: http://localhost:${PORT}/gateway/services`);
      console.log(`ℹ️  Info: http://localhost:${PORT}/gateway/info`);
      console.log(`🔧 Debug: http://localhost:${PORT}/gateway/debug`);
      console.log(`🧪 Test: http://localhost:${PORT}/gateway/test`);
      console.log(`🔗 Route Test: POST http://localhost:${PORT}/gateway/test-route`);
      
      // Start health monitoring after server is ready
      setTimeout(() => {
        console.log('🔍 Starting health checks...');
        serviceRegistry.startHealthChecks();
      }, 5000);
    });

    // Set server timeout
    server.timeout = 35000; // 35 seconds (slightly more than proxy timeout)
    
    return server;
  } catch (error) {
    console.error('❌ Failed to start Express API Gateway:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const gracefulShutdown = async () => {
  console.log('🔄 Shutting down Express API Gateway...');
  
  try {
    await serviceRegistry.cleanup();
    console.log('✅ Gateway shutdown complete');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Handle termination signals
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

// Start the server
startServer();