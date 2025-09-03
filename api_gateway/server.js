const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const ServiceRegistry = require('./config/services');
const { 
  serviceDiscovery, 
  circuitBreaker, 
  requestTimeout, 
  requestLogger,
  initializeServiceRegistry 
} = require('./middleware/serviceDiscovery.js');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(cors());



// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Service registry instance
const serviceRegistry = new ServiceRegistry();

// Initialize services
const initializeServices = async () => {
  try {
    // Register auth service
    await serviceRegistry.registerService({
      name: 'auth-service',
      url: process.env.AUTH_SERVICE_URL || 'http://localhost:5051',
      health: process.env.AUTH_SERVICE_HEALTH || 'http://localhost:5051/health',
      routes: ['/api/auth']
    });

    // Register notification service
    await serviceRegistry.registerService({
      name: 'notification-service',
      url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5002',
      health: process.env.NOTIFICATION_SERVICE_HEALTH || 'http://localhost:5002/health',
      routes: ['/api/notifications']
    });

    console.log('Services registered successfully');
  } catch (error) {
    console.error('Failed to register services:', error);
  }
};

// Service registration endpoint
app.post('/register-service', async (req, res) => {
  try {
    const serviceInfo = req.body;
    
    if (!serviceInfo.name || !serviceInfo.url) {
      return res.status(400).json({
        success: false,
        message: 'Service name and URL are required'
      });
    }

    await serviceRegistry.registerService(serviceInfo);
    
    res.status(201).json({
      success: true,
      message: 'Service registered successfully',
      service: serviceInfo
    });
  } catch (error) {
    console.error('Service registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register service',
      error: error.message
    });
  }
});

// Service discovery endpoint
app.get('/services', async (req, res) => {
  try {
    const services = await serviceRegistry.getServices();
    
    res.status(200).json({
      success: true,
      message: 'Available services',
      data: {
        services: services,
        count: services.length
      }
    });
  } catch (error) {
    console.error('Service discovery error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get services'
    });
  }
});

// Health check for API Gateway
app.get('/health', async (req, res) => {
  try {
    const services = await serviceRegistry.getServices();
    const healthChecks = await serviceRegistry.checkServicesHealth();
    
    const totalServices = services.length;
    const healthyServices = healthChecks.filter(check => check.healthy).length;
    
    const isGatewayHealthy = totalServices > 0 && healthyServices === totalServices;
    
    res.status(isGatewayHealthy ? 200 : 503).json({
      success: isGatewayHealthy,
      message: isGatewayHealthy ? 'API Gateway is healthy' : 'Some services are unhealthy',
      data: {
        gateway: {
          status: 'running',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
          pid: process.pid
        },
        services: {
          total: totalServices,
          healthy: healthyServices,
          unhealthy: totalServices - healthyServices,
          details: healthChecks
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Gateway status endpoint
app.get('/gateway/status', async (req, res) => {
  try {
    const services = await serviceRegistry.getServices();
    
    res.status(200).json({
      success: true,
      message: 'API Gateway status',
      data: {
        gateway: {
          name: 'api-gateway',
          version: '1.0.0',
          status: 'running',
          port: PORT,
          uptime: process.uptime(),
          startTime: new Date(Date.now() - process.uptime() * 1000).toISOString()
        },
        configuration: {
          rateLimiting: {
            enabled: true,
            windowMs: 15 * 60 * 1000,
            maxRequests: 100
          },
          cors: {
            enabled: true,
            allowedOrigins: process.env.ALLOWED_ORIGINS || '*'
          },
          security: {
            helmet: true
          }
        },
        registeredServices: services.map(service => ({
          name: service.name,
          url: service.url,
          routes: service.routes,
          status: service.healthy ? 'healthy' : 'unhealthy',
          lastHealthCheck: service.lastHealthCheck
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Gateway status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get gateway status'
    });
  }
});

// Service proxy middleware
app.use('/api/auth', serviceDiscovery('auth-service'), createProxyMiddleware({
  target: process.env.AUTH_SERVICE_URL || 'http://localhost:5051',
  changeOrigin: true,
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Auth service proxy error:', err);
    res.status(503).json({
      success: false,
      message: 'Auth service unavailable',
      error: 'Service temporarily unavailable'
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.originalUrl} to auth-service`);
  }
}));

app.use('/api/notifications', serviceDiscovery('notification-service'), createProxyMiddleware({
  target: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:5002',
  changeOrigin: true,
  logLevel: 'debug',
  onError: (err, req, res) => {
    console.error('Notification service proxy error:', err);
    res.status(503).json({
      success: false,
      message: 'Notification service unavailable',
      error: 'Service temporarily unavailable'
    });
  },
  onProxyReq: (proxyReq, req, res) => {
    console.log(`Proxying ${req.method} ${req.originalUrl} to notification-service`);
  }
}));

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Gateway documentation',
    data: {
      name: 'Microservices API Gateway',
      version: '1.0.0',
      description: 'Central entry point for all microservices',
      baseUrl: `http://localhost:${PORT}`,
      endpoints: {
        gateway: [
          'GET /health - Gateway health check',
          'GET /gateway/status - Detailed gateway status',
          'GET /services - List registered services',
          'POST /register-service - Register a new service'
        ],
        services: [
          'ALL /api/auth/* - Authentication service routes',
          'ALL /api/notifications/* - Notification service routes'
        ]
      },
      features: [
        'Service Discovery',
        'Load Balancing',
        'Health Checks',
        'Rate Limiting',
        'CORS Support',
        'Security Headers',
        'Request Proxying'
      ]
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    availableRoutes: [
      '/health',
      '/gateway/status',
      '/services',
      '/api/auth/*',
      '/api/notifications/*'
    ]
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Gateway error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal gateway error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

// Start server
const startServer = async () => {
  try {
    await initializeServices();
    
    // Start health check interval
    setInterval(async () => {
      try {
        await serviceRegistry.checkServicesHealth();
      } catch (error) {
        console.error('Periodic health check error:', error);
      }
    }, 30000); // Check every 30 seconds
    
    app.listen(PORT, () => {
      console.log(`API Gateway running on port ${PORT}`);
      console.log(`Gateway health: http://localhost:${PORT}/health`);
      console.log(`Gateway status: http://localhost:${PORT}/gateway/status`);
      console.log(`Services: http://localhost:${PORT}/services`);
    });
  } catch (error) {
    console.error('Failed to start API Gateway:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('Shutting down API Gateway...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down API Gateway...');
  process.exit(0);
});

startServer();