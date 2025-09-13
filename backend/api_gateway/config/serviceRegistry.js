const axios = require('axios');

class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.healthCheckInterval = 30000; // 30 seconds
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
    this.healthCheckTimer = null;
  }

  // Register a new service
  async registerService(serviceInfo) {
    try {
      const { name, url, health, routes = [], metadata = {}, preservePath = false, removePrefix = true } = serviceInfo;
      
      console.log(`📝 Registering service: ${name}`);
      console.log(`   URL: ${url}`);
      console.log(`   Routes: ${JSON.stringify(routes)}`);
      console.log(`   Preserve Path: ${preservePath}`);
      console.log(`   Remove Prefix: ${removePrefix}`);
      
      if (!name || !url) {
        throw new Error('Service name and URL are required');
      }

      // Clean URL format
      const cleanUrl = url.replace(/\/$/, ''); // Remove trailing slash
      const healthUrl = health || `${cleanUrl}/health`;

      console.log(`   Health URL: ${healthUrl}`);

      const service = {
        name,
        url: cleanUrl,
        health: healthUrl,
        routes: Array.isArray(routes) ? routes : [routes].filter(Boolean),
        metadata: {
          ...metadata,
          registeredAt: new Date().toISOString(),
          version: metadata.version || '1.0.0',
          preservePath: preservePath || metadata.preservePath || false,
          removePrefix: removePrefix !== undefined ? removePrefix : (metadata.removePrefix !== undefined ? metadata.removePrefix : true)
        },
        lastHealthCheck: null,
        healthy: false,
        retryCount: 0,
        consecutiveFailures: 0,
        circuitState: 'CLOSED' // CLOSED, OPEN, HALF_OPEN
      };

      console.log(`🩺 Performing initial health check for ${name}...`);
      
      // Perform initial health check
      const isHealthy = await this.performHealthCheck(service);
      service.healthy = isHealthy;
      service.lastHealthCheck = new Date().toISOString();

      this.services.set(name, service);
      
      console.log(`✅ Service registered: ${name} at ${cleanUrl}`);
      console.log(`   Healthy: ${isHealthy}`);
      console.log(`   Routes: ${JSON.stringify(service.routes)}`);
      console.log(`   Circuit State: ${service.circuitState}`);
      console.log(`   Path Config: preservePath=${service.metadata.preservePath}, removePrefix=${service.metadata.removePrefix}`);
      
      return service;
    } catch (error) {
      console.error(`❌ Failed to register service ${serviceInfo.name}:`, error.message);
      throw error;
    }
  }

  // Unregister a service
  async unregisterService(serviceName) {
    try {
      if (this.services.has(serviceName)) {
        this.services.delete(serviceName);
        console.log(`🗑️  Service unregistered: ${serviceName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`❌ Failed to unregister service ${serviceName}:`, error.message);
      throw error;
    }
  }

  // Get all registered services
  async getServices() {
    return Array.from(this.services.values());
  }

  // Get a specific service by name
  async getService(serviceName) {
    return this.services.get(serviceName) || null;
  }

  // Get healthy services only
  async getHealthyServices() {
    const services = Array.from(this.services.values());
    return services.filter(service => service.healthy && service.circuitState !== 'OPEN');
  }

  // Find service by route pattern
  async findServiceByRoute(requestPath) {
    const services = Array.from(this.services.values());
    
    // Remove leading slash for consistent matching
    const cleanPath = requestPath.replace(/^\/+/, '');
    
    console.log(`🔍 Finding service for path: "${cleanPath}"`);
    
    for (const service of services) {
      // Skip unhealthy services or those with open circuit
      if (!service.healthy || service.circuitState === 'OPEN') {
        console.log(`⏭️  Skipping ${service.name}: healthy=${service.healthy}, circuit=${service.circuitState}`);
        continue;
      }

      console.log(`🔍 Checking service: ${service.name}, routes: ${JSON.stringify(service.routes)}`);

      // Check if service has defined routes
      if (service.routes && service.routes.length > 0) {
        for (const route of service.routes) {
          const cleanRoute = route.replace(/^\/+/, '').replace(/\/+$/, '');
          
          console.log(`   🔍 Checking route: "${cleanRoute}" against path: "${cleanPath}"`);
          
          // Check if the path starts with the route pattern
          // For "api/auth" route, it should match "api/auth", "api/auth/", "api/auth/register", etc.
          if (cleanPath === cleanRoute || cleanPath.startsWith(cleanRoute + '/')) {
            console.log(`   ✅ Route match found: ${cleanRoute} matches ${cleanPath}`);
            return service;
          }
        }
      } else {
        // If no specific routes defined, use service name as route
        const servicePath = service.name.replace('-service', '').replace('_service', '');
        console.log(`   🔍 Checking service name route: "${servicePath}" against path: "${cleanPath}"`);
        
        if (cleanPath.startsWith(servicePath)) {
          console.log(`   ✅ Service name match found: ${servicePath} matches ${cleanPath}`);
          return service;
        }
      }
    }
    
    console.log(`❌ No service found for path: ${cleanPath}`);
    return null;
  }

  // Perform health check on a single service
  async performHealthCheck(service) {
    try {
      const response = await axios.get(service.health, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Express-API-Gateway-Health-Check/1.0'
        },
        validateStatus: (status) => status >= 200 && status < 300
      });

      return true;
    } catch (error) {
      console.error(`💔 Health check failed for ${service.name}: ${error.message}`);
      return false;
    }
  }

  // Check health of all services
  async checkServicesHealth() {
    const healthChecks = [];
    
    for (const [serviceName, service] of this.services) {
      try {
        const isHealthy = await this.performHealthCheck(service);
        
        const wasHealthy = service.healthy;
        service.healthy = isHealthy;
        service.lastHealthCheck = new Date().toISOString();
        
        if (isHealthy) {
          service.retryCount = 0;
          service.consecutiveFailures = 0;
          
          // Reset circuit breaker if it was open or half-open
          if (service.circuitState === 'HALF_OPEN' || service.circuitState === 'OPEN') {
            service.circuitState = 'CLOSED';
            console.log(`🔄 Circuit breaker for ${serviceName}: ${service.circuitState}`);
          }
          
          if (!wasHealthy) {
            console.log(`💚 Service ${serviceName} is now healthy`);
          }
        } else {
          service.consecutiveFailures++;
          
          if (wasHealthy) {
            console.warn(`💛 Service ${serviceName} is now unhealthy`);
          }
          
          // Circuit breaker logic
          if (service.consecutiveFailures >= this.maxRetries) {
            service.circuitState = 'OPEN';
            console.log(`🔴 Circuit breaker OPEN for ${serviceName} (failures: ${service.consecutiveFailures})`);
          }
          
          // Retry logic for failed services
          if (service.consecutiveFailures <= this.maxRetries && service.circuitState !== 'OPEN') {
            console.log(`🔄 Retrying health check for ${serviceName} (attempt ${service.consecutiveFailures}/${this.maxRetries})`);
            
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            
            const retryResult = await this.performHealthCheck(service);
            if (retryResult) {
              service.healthy = true;
              service.consecutiveFailures = 0;
              console.log(`✅ Service ${serviceName} recovered on retry`);
            }
          }
        }
        
        healthChecks.push({
          serviceName,
          url: service.url,
          healthy: service.healthy,
          lastCheck: service.lastHealthCheck,
          consecutiveFailures: service.consecutiveFailures,
          circuitState: service.circuitState,
          response: isHealthy ? 'OK' : 'Failed'
        });
        
      } catch (error) {
        console.error(`❌ Error checking health of ${serviceName}:`, error.message);
        
        service.healthy = false;
        service.consecutiveFailures++;
        service.lastHealthCheck = new Date().toISOString();
        service.circuitState = 'OPEN';
        
        healthChecks.push({
          serviceName,
          url: service.url,
          healthy: false,
          lastCheck: service.lastHealthCheck,
          consecutiveFailures: service.consecutiveFailures,
          circuitState: service.circuitState,
          response: error.message
        });
      }
    }
    
    return healthChecks;
  }

  // Get service statistics
  async getServiceStats() {
    const services = Array.from(this.services.values());
    const totalServices = services.length;
    const healthyServices = services.filter(service => service.healthy).length;
    const unhealthyServices = totalServices - healthyServices;
    const openCircuits = services.filter(service => service.circuitState === 'OPEN').length;
    
    return {
      total: totalServices,
      healthy: healthyServices,
      unhealthy: unhealthyServices,
      openCircuits,
      healthRate: totalServices > 0 ? ((healthyServices / totalServices) * 100).toFixed(2) : '0.00',
      lastUpdate: new Date().toISOString()
    };
  }

  // Start periodic health checks
  startHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    
    this.healthCheckTimer = setInterval(async () => {
      try {
        await this.checkServicesHealth();
      } catch (error) {
        console.error('❌ Periodic health check error:', error.message);
      }
    }, this.healthCheckInterval);
    
    console.log(`🩺 Started periodic health checks (interval: ${this.healthCheckInterval}ms)`);
  }

  // Stop periodic health checks
  stopHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      console.log('🛑 Stopped periodic health checks');
    }
  }

  // Get service for load balancing
  async getServiceForRequest(serviceName) {
    const service = this.services.get(serviceName);
    
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    if (!service.healthy) {
      throw new Error(`Service ${serviceName} is not healthy`);
    }
    
    if (service.circuitState === 'OPEN') {
      throw new Error(`Service ${serviceName} circuit breaker is OPEN`);
    }
    
    return service;
  }

  // Export service registry state
  async exportState() {
    const services = Array.from(this.services.values());
    return {
      timestamp: new Date().toISOString(),
      totalServices: services.length,
      services: services.map(service => ({
        name: service.name,
        url: service.url,
        healthy: service.healthy,
        lastHealthCheck: service.lastHealthCheck,
        routes: service.routes,
        metadata: service.metadata,
        circuitState: service.circuitState
      }))
    };
  }

  // Cleanup method
  async cleanup() {
    this.stopHealthChecks();
    this.services.clear();
    console.log('🧹 Service registry cleaned up');
  }
}

module.exports = ServiceRegistry;