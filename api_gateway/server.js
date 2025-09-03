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
    res.status(500).json({
      success: false,
      message: 'Failed to register service',
      error: error.message
    });
  }
});

// Service deregistration endpoint
app.delete('/register-service/:serviceName', async (req, res) => {
  try {
    const { serviceName } = req.params;
    const success = await serviceRegistry.unregisterService(serviceName);
    if (success) {
      res.status(200).json({
        success: true,
        message: 'Service deregistered successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        message: 'Service not found'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to deregister service',
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
    res.status(200).json({
      success: true,
      message: 'API Gateway is healthy',
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
    res.status(200).json({
      success: true,
      message: 'API Gateway is healthy (service check failed)',
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
          selfRegistration: true,
          healthCheckInterval: 30000,
          circuitBreakerEnabled: true
        },
        registeredServices: services.map(service => ({
          name: service.name,
          url: service.url,
          routes: service.routes,
          status: service.healthy ? 'healthy' : 'unhealthy',
          lastHealthCheck: service.lastHealthCheck,
          registeredAt: service.registeredAt
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to get gateway status'
    });
  }
});

// Dynamic route handling
app.use('/api/*', async (req, res, next) => {
  try {
    const path = req.path;
    const service = await serviceRegistry.findServiceByRoute(path);
    if (!service) {
      return res.status(404).json({
        success: false,
        message: 'No service available for this route',
        requestedRoute: path
      });
    }
    if (!service.healthy) {
      return res.status(503).json({
        success: false,
        message: 'Service is currently unavailable',
        service: service.name
      });
    }
    const proxy = createProxyMiddleware({
      target: service.url,
      changeOrigin: true,
      logLevel: 'error',
      onError: (err, req, res) => {
        if (!res.headersSent) {
          res.status(503).json({
            success: false,
            message: `${service.name} service unavailable`,
            error: 'Service temporarily unavailable'
          });
        }
      },
      onProxyReq: (proxyReq, req, res) => {
        proxyReq.setHeader('X-Gateway-Service', service.name);
        proxyReq.setHeader('X-Gateway-Timestamp', new Date().toISOString());
      }
    });
    proxy(req, res, next);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal routing error',
      error: error.message
    });
  }
});

// API documentation endpoint
app.get('/api/docs', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API Gateway documentation',
    data: {
      name: 'Microservices API Gateway',
      version: '1.0.0',
      description: 'Central entry point for all microservices with dynamic service discovery',
      baseUrl: `http://localhost:${PORT}`,
      features: [
        'Dynamic Service Discovery',
        'Self-Service Registration',
        'Health Monitoring',
        'Circuit Breaking',
        'Dynamic Routing'
      ],
      endpoints: {
        management: [
          'GET /health - Gateway health check',
          'GET /gateway/status - Detailed gateway status',
          'GET /services - List registered services',
          'POST /register-service - Register a new service',
          'DELETE /register-service/:name - Deregister a service'
        ],
        services: [
          'ALL /api/* - Dynamic routing to registered services'
        ]
      },
      registration: {
        endpoint: 'POST /register-service',
        format: {
          name: 'string (required)',
          url: 'string (required)',
          health: 'string (optional)',
          routes: 'array (optional)',
          metadata: 'object (optional)'
        }
      }
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    requestedUrl: req.originalUrl,
    suggestion: 'Check /api/docs for available endpoints'
  });
});

// Global error handler
app.use((error, req, res, next) => {
  if (!res.headersSent) {
    res.status(500).json({
      success: false,
      message: 'Internal gateway error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Start server
const startServer = async () => {
  try {
    app.listen(PORT, () => {});
    setTimeout(() => {
      setInterval(async () => {
        try {
          const healthChecks = await serviceRegistry.checkServicesHealth();
          const unhealthyServices = healthChecks.filter(check => !check.healthy);
          if (unhealthyServices.length > 0) {
            console.error(`Unhealthy services detected: ${unhealthyServices.map(s => s.serviceName).join(', ')}`);
          }
        } catch (error) {
          console.error('Periodic health check error:', error);
        }
      }, 30000);
    }, 30000);
  } catch (error) {
    console.error('Failed to start API Gateway:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGINT', async () => {
  await serviceRegistry.cleanup();
  process.exit(0);
});
process.on('SIGTERM', async () => {
  await serviceRegistry.cleanup();
  process.exit(0);
});

startServer();