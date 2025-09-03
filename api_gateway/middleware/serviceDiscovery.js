const ServiceRegistry = require('../config/services');

// Global service registry instance
let globalServiceRegistry = null;

// Initialize service registry
const initializeServiceRegistry = () => {
  if (!globalServiceRegistry) {
    globalServiceRegistry = new ServiceRegistry();
  }
  return globalServiceRegistry;
};

// Service discovery middleware
const serviceDiscovery = (serviceName, options = {}) => {
  return async (req, res, next) => {
    try {
      const registry = globalServiceRegistry || initializeServiceRegistry();
      
      // Log incoming request
      console.log(`Service discovery: Looking for ${serviceName} to handle ${req.method} ${req.originalUrl}`);
      
      // Find the requested service
      const service = await registry.getService(serviceName);
      
      if (!service) {
        console.error(`Service ${serviceName} not found in registry`);
        return res.status(503).json({
          success: false,
          message: `Service ${serviceName} not available`,
          error: 'Service not registered'
        });
      }
      
      // Check if service is healthy
      if (!service.healthy) {
        console.warn(`Service ${serviceName} is not healthy`);
        
        // Optional: Try to perform a fresh health check
        if (options.recheckHealth !== false) {
          const isHealthy = await registry.performHealthCheck(service);
          service.healthy = isHealthy;
          service.lastHealthCheck = new Date().toISOString();
          
          if (!isHealthy) {
            return res.status(503).json({
              success: false,
              message: `Service ${serviceName} is unhealthy`,
              error: 'Service health check failed'
            });
          }
        } else {
          return res.status(503).json({
            success: false,
            message: `Service ${serviceName} is unhealthy`,
            error: 'Service marked as unhealthy'
          });
        }
      }
      
      // Add service information to request for proxy middleware
      req.serviceInfo = {
        name: service.name,
        url: service.url,
        healthy: service.healthy,
        lastHealthCheck: service.lastHealthCheck,
        metadata: service.metadata
      };
      
      // Add service discovery headers
      req.headers['x-gateway-service'] = service.name;
      req.headers['x-gateway-target'] = service.url;
      req.headers['x-gateway-timestamp'] = new Date().toISOString();
      
      console.log(`Service discovery: Found ${serviceName} at ${service.url}`);
      
      next();
      
    } catch (error) {
      console.error('Service discovery error:', error);
      res.status(500).json({
        success: false,
        message: 'Service discovery failed',
        error: error.message
      });
    }
  };
};

// Circuit breaker middleware
const circuitBreaker = (serviceName, options = {}) => {
  const {
    failureThreshold = 5,
    resetTimeout = 60000, // 1 minute
    monitoringWindow = 300000 // 5 minutes
  } = options;
  
  const circuits = new Map();
  
  return async (req, res, next) => {
    try {
      const registry = globalServiceRegistry || initializeServiceRegistry();
      const service = await registry.getService(serviceName);
      
      if (!service) {
        return res.status(503).json({
          success: false,
          message: `Service ${serviceName} not available`,
          error: 'Service not registered'
        });
      }
      
      // Initialize circuit for this service if it doesn't exist
      if (!circuits.has(serviceName)) {
        circuits.set(serviceName, {
          state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
          failureCount: 0,
          lastFailureTime: null,
          successCount: 0
        });
      }
      
      const circuit = circuits.get(serviceName);
      const now = Date.now();
      
      // Check circuit state
      switch (circuit.state) {
        case 'OPEN':
          // Check if we should try to reset
          if (now - circuit.lastFailureTime >= resetTimeout) {
            circuit.state = 'HALF_OPEN';
            circuit.successCount = 0;
            console.log(`Circuit breaker for ${serviceName}: OPEN -> HALF_OPEN`);
          } else {
            return res.status(503).json({
              success: false,
              message: `Service ${serviceName} circuit breaker is OPEN`,
              error: 'Circuit breaker protection active'
            });
          }
          break;
          
        case 'HALF_OPEN':
          // Allow limited requests through
          break;
          
        case 'CLOSED':
        default:
          // Normal operation
          break;
      }
      
      // Add circuit breaker info to request
      req.circuitInfo = {
        serviceName,
        state: circuit.state,
        failureCount: circuit.failureCount,
        successCount: circuit.successCount
      };
      
      // Intercept response to track success/failure
      const originalSend = res.send;
      const originalJson = res.json;
      
      const trackResponse = (statusCode) => {
        if (statusCode >= 200 && statusCode < 400) {
          // Success
          circuit.failureCount = 0;
          circuit.successCount++;
          
          if (circuit.state === 'HALF_OPEN' && circuit.successCount >= 3) {
            circuit.state = 'CLOSED';
            console.log(`Circuit breaker for ${serviceName}: HALF_OPEN -> CLOSED`);
          }
        } else {
          // Failure
          circuit.failureCount++;
          circuit.lastFailureTime = now;
          circuit.successCount = 0;
          
          if (circuit.failureCount >= failureThreshold) {
            circuit.state = 'OPEN';
            console.log(`Circuit breaker for ${serviceName}: -> OPEN (failures: ${circuit.failureCount})`);
          }
        }
      };
      
      res.send = function(data) {
        trackResponse(this.statusCode);
        return originalSend.call(this, data);
      };
      
      res.json = function(data) {
        trackResponse(this.statusCode);
        return originalJson.call(this, data);
      };
      
      next();
      
    } catch (error) {
      console.error('Circuit breaker error:', error);
      res.status(500).json({
        success: false,
        message: 'Circuit breaker failed',
        error: error.message
      });
    }
  };
};

// Load balancer middleware (for when multiple instances of same service exist)
const loadBalancer = (serviceName, algorithm = 'round-robin') => {
  const counters = new Map();
  
  return async (req, res, next) => {
    try {
      const registry = globalServiceRegistry || initializeServiceRegistry();
      
      // For this simple implementation, we'll just use the primary service
      // In a real scenario, you'd have multiple instances of the same service
      const service = await registry.getServiceForLoadBalancing(serviceName);
      
      if (!service) {
        return res.status(503).json({
          success: false,
          message: `No healthy instances of ${serviceName} available`,
          error: 'Load balancing failed'
        });
      }
      
      // Initialize counter for round-robin
      if (!counters.has(serviceName)) {
        counters.set(serviceName, 0);
      }
      
      // Add load balancer info to request
      req.loadBalancerInfo = {
        serviceName,
        algorithm,
        selectedInstance: service.url,
        timestamp: new Date().toISOString()
      };
      
      next();
      
    } catch (error) {
      console.error('Load balancer error:', error);
      res.status(500).json({
        success: false,
        message: 'Load balancing failed',
        error: error.message
      });
    }
  };
};

// Request timeout middleware
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout',
          error: 'Service did not respond within the timeout period'
        });
      }
    }, timeoutMs);
    
    // Clear timeout when response is sent
    const originalSend = res.send;
    const originalJson = res.json;
    
    res.send = function(data) {
      clearTimeout(timeout);
      return originalSend.call(this, data);
    };
    
    res.json = function(data) {
      clearTimeout(timeout);
      return originalJson.call(this, data);
    };
    
    next();
  };
};

// Request logging middleware
const requestLogger = (req, res, next) => {
  const startTime = Date.now();
  
  // Log request
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${req.ip}`);
  
  // Log response
  const originalSend = res.send;
  const originalJson = res.json;
  
  const logResponse = () => {
    const duration = Date.now() - startTime;
    const serviceInfo = req.serviceInfo ? ` -> ${req.serviceInfo.name}` : '';
    console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl} - ${res.statusCode} - ${duration}ms${serviceInfo}`);
  };
  
  res.send = function(data) {
    logResponse();
    return originalSend.call(this, data);
  };
  
  res.json = function(data) {
    logResponse();
    return originalJson.call(this, data);
  };
  
  next();
};

// Health check aggregator
const healthCheckAggregator = async (req, res, next) => {
  try {
    const registry = globalServiceRegistry || initializeServiceRegistry();
    const healthChecks = await registry.checkServicesHealth();
    
    req.healthStatus = {
      services: healthChecks,
      timestamp: new Date().toISOString()
    };
    
    next();
  } catch (error) {
    console.error('Health check aggregator error:', error);
    next(error);
  }
};

// Export middleware functions and utilities
module.exports = {
  serviceDiscovery,
  circuitBreaker,
  loadBalancer,
  requestTimeout,
  requestLogger,
  healthCheckAggregator,
  initializeServiceRegistry,
  getServiceRegistry: () => globalServiceRegistry
};