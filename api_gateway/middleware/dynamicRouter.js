const { createProxyMiddleware } = require('http-proxy-middleware');

// Circuit breaker states per service
const circuitBreakers = new Map();

// Initialize circuit breaker for service
const initCircuitBreaker = (serviceName) => {
  if (!circuitBreakers.has(serviceName)) {
    circuitBreakers.set(serviceName, {
      state: 'CLOSED', // CLOSED, OPEN, HALF_OPEN
      failureCount: 0,
      lastFailureTime: null,
      successCount: 0,
      failureThreshold: 5,
      resetTimeout: 60000, // 1 minute
      halfOpenMaxCalls: 3
    });
  }
  return circuitBreakers.get(serviceName);
};

// Update circuit breaker state based on response
const updateCircuitBreaker = (serviceName, success) => {
  const circuit = initCircuitBreaker(serviceName);
  const now = Date.now();

  if (success) {
    circuit.failureCount = 0;
    circuit.successCount++;
    
    if (circuit.state === 'HALF_OPEN' && circuit.successCount >= circuit.halfOpenMaxCalls) {
      circuit.state = 'CLOSED';
      circuit.successCount = 0;
      console.log(`🟢 Circuit breaker for ${serviceName}: HALF_OPEN -> CLOSED`);
    }
  } else {
    circuit.failureCount++;
    circuit.lastFailureTime = now;
    circuit.successCount = 0;
    
    if (circuit.state === 'CLOSED' && circuit.failureCount >= circuit.failureThreshold) {
      circuit.state = 'OPEN';
      console.log(`🔴 Circuit breaker for ${serviceName}: CLOSED -> OPEN (failures: ${circuit.failureCount})`);
    } else if (circuit.state === 'HALF_OPEN') {
      circuit.state = 'OPEN';
      console.log(`🔴 Circuit breaker for ${serviceName}: HALF_OPEN -> OPEN`);
    }
  }
};

// Check if circuit breaker allows request
const allowRequest = (serviceName) => {
  const circuit = initCircuitBreaker(serviceName);
  const now = Date.now();

  switch (circuit.state) {
    case 'CLOSED':
      return true;
      
    case 'OPEN':
      // Check if we should try to reset
      if (now - circuit.lastFailureTime >= circuit.resetTimeout) {
        circuit.state = 'HALF_OPEN';
        circuit.successCount = 0;
        console.log(`🟡 Circuit breaker for ${serviceName}: OPEN -> HALF_OPEN`);
        return true;
      }
      return false;
      
    case 'HALF_OPEN':
      return circuit.successCount < circuit.halfOpenMaxCalls;
      
    default:
      return true;
  }
};

// Create proxy middleware for a service
const createServiceProxy = (service) => {
  return createProxyMiddleware({
    target: service.url,
    changeOrigin: true,
    timeout: 30000, // 30 seconds
    proxyTimeout: 30000,
    secure: false, // Allow self-signed certificates
    followRedirects: true,
    // Important: Don't parse request body at gateway level
    parseReqBody: false,
    
    // Path rewrite to handle routing correctly
    pathRewrite: (path, req) => {
      // If preservePath is true or service has specific routes, keep the full path
      if (service.metadata?.preservePath === true || (service.routes && service.routes.length > 0)) {
        console.log(`🔄 Path rewrite (preserve): ${path} -> ${path}`);
        return path;
      }
      
      // For services without preservePath, remove service name from path
      const servicePath = service.name.replace('-service', '').replace('_service', '');
      const pathRegex = new RegExp(`^/${servicePath}(/.*)?$`);
      const match = path.match(pathRegex);
      
      if (match) {
        const newPath = match[1] || '/';
        console.log(`🔄 Path rewrite (remove prefix): ${path} -> ${newPath}`);
        return newPath;
      }
      
      // If no match, keep original path
      console.log(`🔄 Path rewrite (default): ${path} -> ${path}`);
      return path;
    },
    
    // Add headers for service identification
    onProxyReq: (proxyReq, req, res) => {
      // Get the correct proxy path from the proxyReq object
      const proxyPath = proxyReq.path || req.originalUrl;
      
      console.log(`🔄 Proxy request to ${service.name}:`);
      console.log(`   Original URL: ${req.originalUrl}`);
      console.log(`   Method: ${req.method}`);
      console.log(`   Target: ${service.url}`);
      console.log(`   Proxy Path: ${proxyPath}`);
      
      // Set gateway headers
      proxyReq.setHeader('X-Gateway-Service', service.name);
      proxyReq.setHeader('X-Gateway-Timestamp', new Date().toISOString());
      proxyReq.setHeader('X-Forwarded-For', req.ip || req.connection.remoteAddress);
      proxyReq.setHeader('X-Forwarded-Proto', req.protocol);
      proxyReq.setHeader('X-Forwarded-Host', req.get('host'));
      
      // Log the complete target URL
      const targetUrl = `${service.url}${proxyPath}`;
      console.log(`🎯 Final target URL: ${targetUrl}`);
    },
    
    // Handle successful responses
    onProxyRes: (proxyRes, req, res) => {
      console.log(`✅ Proxy response from ${service.name}: ${proxyRes.statusCode}`);
      
      // Update circuit breaker on success
      if (proxyRes.statusCode >= 200 && proxyRes.statusCode < 500) {
        updateCircuitBreaker(service.name, true);
      } else {
        updateCircuitBreaker(service.name, false);
      }
      
      // Add response headers
      res.setHeader('X-Gateway-Service', service.name);
      res.setHeader('X-Gateway-Response-Time', new Date().toISOString());
    },
    
    // Handle proxy errors
    onError: (err, req, res) => {
      console.error(`❌ Proxy error for ${service.name}:`, err.message);
      console.error(`   Error code: ${err.code}`);
      console.error(`   Request: ${req.method} ${req.originalUrl}`);
      console.error(`   Target: ${service.url}`);
      
      // Update circuit breaker on error
      updateCircuitBreaker(service.name, false);
      
      if (!res.headersSent) {
        let errorMessage = 'Service proxy error';
        let statusCode = 503;
        
        // Provide specific error messages based on error type
        switch (err.code) {
          case 'ECONNRESET':
            errorMessage = 'Connection reset by service';
            break;
          case 'ECONNREFUSED':
            errorMessage = 'Service connection refused';
            break;
          case 'ETIMEDOUT':
            errorMessage = 'Service request timeout';
            statusCode = 408;
            break;
          case 'ENOTFOUND':
            errorMessage = 'Service not found';
            statusCode = 502;
            break;
          default:
            errorMessage = `Service error: ${err.message}`;
        }
        
        res.status(statusCode).json({
          success: false,
          message: `Service ${service.name} is temporarily unavailable`,
          error: errorMessage,
          errorCode: err.code,
          timestamp: new Date().toISOString()
        });
      }
    },
    
    // Logging
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn'
  });
};

// Main dynamic router middleware
const dynamicRouter = (serviceRegistry) => {
  return async (req, res, next) => {
    try {
      const originalUrl = req.originalUrl;
      const path = req.originalUrl.split('?')[0]; // Remove query parameters

      // Skip gateway management routes
      if (path.startsWith('/gateway/')) {
        return next();
      }

      console.log(`🔍 Looking for service to handle: ${req.method} ${originalUrl}`);
      console.log(`🔍 Extracted path: "${path}"`);

      // Find service that can handle this route
      const service = await serviceRegistry.findServiceByRoute(path);
      
      if (!service) {
        console.log(`❌ No service found for route: ${path}`);
        const availableServices = await serviceRegistry.getHealthyServices();
        
        return res.status(404).json({
          success: false,
          message: 'No service available for this route',
          path: originalUrl,
          extractedPath: path,
          availableServices: availableServices.map(s => ({
            name: s.name,
            routes: s.routes || [],
            url: s.url
          }))
        });
      }

      console.log(`✅ Found service: ${service.name} (${service.url}) for route: ${path}`);
      console.log(`📋 Service config: preservePath=${service.metadata?.preservePath}, routes=${JSON.stringify(service.routes)}`);

      // Check circuit breaker
      if (!allowRequest(service.name)) {
        console.log(`🔴 Circuit breaker OPEN for ${service.name}, rejecting request`);
        return res.status(503).json({
          success: false,
          message: `Service ${service.name} is temporarily unavailable`,
          error: 'Circuit breaker is OPEN',
          retryAfter: '60 seconds'
        });
      }

      // Additional health check for critical requests
      if (!service.healthy) {
        console.log(`💔 Service ${service.name} is not healthy`);
        return res.status(503).json({
          success: false,
          message: `Service ${service.name} is currently unhealthy`,
          error: 'Service health check failed'
        });
      }

      // Create and use proxy for this service
      const proxy = createServiceProxy(service);
      
      // Add service info to request for logging
      req.serviceInfo = {
        name: service.name,
        url: service.url,
        healthy: service.healthy,
        routes: service.routes
      };

      // Use proxy middleware
      proxy(req, res, (error) => {
        if (error) {
          console.error(`❌ Proxy middleware error for ${service.name}:`, error);
          updateCircuitBreaker(service.name, false);
          
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Internal proxy error',
              error: error.message,
              service: service.name
            });
          }
        }
      });

    } catch (error) {
      console.error('❌ Dynamic router error:', error);
      
      if (!res.headersSent) {
        res.status(500).json({
          success: false,
          message: 'Internal routing error',
          error: error.message
        });
      }
    }
  };
};

// Middleware to add request timeout
const requestTimeout = (timeoutMs = 30000) => {
  return (req, res, next) => {
    const timeout = setTimeout(() => {
      if (!res.headersSent) {
        res.status(408).json({
          success: false,
          message: 'Request timeout',
          error: 'Request did not complete within the timeout period'
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

// Export the main router and utilities
module.exports = dynamicRouter;
module.exports.requestTimeout = requestTimeout;
module.exports.circuitBreakers = circuitBreakers;