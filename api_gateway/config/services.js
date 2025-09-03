const axios = require('axios');

class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.healthCheckInterval = 30000; // 30 seconds
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second
  }

  // Register a new service
  async registerService(serviceInfo) {
    try {
      const { name, url, health, routes = [], metadata = {} } = serviceInfo;
      
      if (!name || !url) {
        throw new Error('Service name and URL are required');
      }

      const service = {
        name,
        url,
        health: health || `${url}/health`,
        routes,
        metadata,
        registeredAt: new Date().toISOString(),
        lastHealthCheck: null,
        healthy: false,
        retryCount: 0,
        consecutiveFailures: 0
      };

      // Perform initial health check
      const isHealthy = await this.performHealthCheck(service);
      service.healthy = isHealthy;
      service.lastHealthCheck = new Date().toISOString();

      this.services.set(name, service);
      
      console.log(`Service registered: ${name} at ${url} (healthy: ${isHealthy})`);
      
      return service;
    } catch (error) {
      console.error(`Failed to register service ${serviceInfo.name}:`, error);
      throw error;
    }
  }

  // Unregister a service
  async unregisterService(serviceName) {
    try {
      if (this.services.has(serviceName)) {
        this.services.delete(serviceName);
        console.log(`Service unregistered: ${serviceName}`);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`Failed to unregister service ${serviceName}:`, error);
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
    return services.filter(service => service.healthy);
  }

  // Perform health check on a single service
  async performHealthCheck(service) {
    try {
      const response = await axios.get(service.health, {
        timeout: 5000, // 5 seconds timeout
        headers: {
          'User-Agent': 'API-Gateway-Health-Check/1.0'
        }
      });

      return response.status >= 200 && response.status < 300;
    } catch (error) {
      console.error(`Health check failed for ${service.name}:`, error.message);
      return false;
    }
  }

  // Check health of all services
  async checkServicesHealth() {
    const healthChecks = [];
    
    for (const [serviceName, service] of this.services) {
      try {
        const isHealthy = await this.performHealthCheck(service);
        
        // Update service status
        const wasHealthy = service.healthy;
        service.healthy = isHealthy;
        service.lastHealthCheck = new Date().toISOString();
        
        if (isHealthy) {
          service.retryCount = 0;
          service.consecutiveFailures = 0;
          
          if (!wasHealthy) {
            console.log(`Service ${serviceName} is now healthy`);
          }
        } else {
          service.consecutiveFailures++;
          
          if (wasHealthy) {
            console.warn(`Service ${serviceName} is now unhealthy`);
          }
          
          // Retry logic for failed services
          if (service.consecutiveFailures <= this.maxRetries) {
            console.log(`Retrying health check for ${serviceName} (attempt ${service.consecutiveFailures}/${this.maxRetries})`);
            
            // Wait before retry
            await new Promise(resolve => setTimeout(resolve, this.retryDelay));
            
            const retryResult = await this.performHealthCheck(service);
            if (retryResult) {
              service.healthy = true;
              service.consecutiveFailures = 0;
              console.log(`Service ${serviceName} recovered on retry`);
            }
          }
        }
        
        healthChecks.push({
          serviceName,
          url: service.url,
          healthy: service.healthy,
          lastCheck: service.lastHealthCheck,
          consecutiveFailures: service.consecutiveFailures,
          response: isHealthy ? 'OK' : 'Failed'
        });
        
      } catch (error) {
        console.error(`Error checking health of ${serviceName}:`, error);
        
        service.healthy = false;
        service.consecutiveFailures++;
        service.lastHealthCheck = new Date().toISOString();
        
        healthChecks.push({
          serviceName,
          url: service.url,
          healthy: false,
          lastCheck: service.lastHealthCheck,
          consecutiveFailures: service.consecutiveFailures,
          response: error.message
        });
      }
    }
    
    return healthChecks;
  }

  // Get service for load balancing (round-robin)
  async getServiceForLoadBalancing(serviceName) {
    const service = this.services.get(serviceName);
    
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }
    
    if (!service.healthy) {
      throw new Error(`Service ${serviceName} is not healthy`);
    }
    
    return service;
  }

  // Update service metadata
  async updateServiceMetadata(serviceName, metadata) {
    try {
      const service = this.services.get(serviceName);
      
      if (!service) {
        throw new Error(`Service ${serviceName} not found`);
      }
      
      service.metadata = { ...service.metadata, ...metadata };
      service.updatedAt = new Date().toISOString();
      
      console.log(`Updated metadata for service: ${serviceName}`);
      
      return service;
    } catch (error) {
      console.error(`Failed to update metadata for service ${serviceName}:`, error);
      throw error;
    }
  }

  // Get service statistics
  async getServiceStats() {
    const services = Array.from(this.services.values());
    const totalServices = services.length;
    const healthyServices = services.filter(service => service.healthy).length;
    const unhealthyServices = totalServices - healthyServices;
    
    return {
      total: totalServices,
      healthy: healthyServices,
      unhealthy: unhealthyServices,
      healthRate: totalServices > 0 ? ((healthyServices / totalServices) * 100).toFixed(2) : 0,
      lastUpdate: new Date().toISOString()
    };
  }

  // Find services by route pattern
  async findServiceByRoute(route) {
    const services = Array.from(this.services.values());
    
    for (const service of services) {
      if (service.routes && service.routes.length > 0) {
        for (const serviceRoute of service.routes) {
          if (route.startsWith(serviceRoute)) {
            return service;
          }
        }
      }
    }
    
    return null;
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
        console.error('Periodic health check error:', error);
      }
    }, this.healthCheckInterval);
    
    console.log(`Started periodic health checks (interval: ${this.healthCheckInterval}ms)`);
  }

  // Stop periodic health checks
  stopHealthChecks() {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = null;
      console.log('Stopped periodic health checks');
    }
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
        registeredAt: service.registeredAt,
        routes: service.routes,
        metadata: service.metadata
      }))
    };
  }

  // Import service registry state
  async importState(state) {
    try {
      this.services.clear();
      
      for (const serviceData of state.services) {
        const service = {
          ...serviceData,
          retryCount: 0,
          consecutiveFailures: 0
        };
        
        this.services.set(service.name, service);
      }
      
      console.log(`Imported ${state.services.length} services from state`);
      
      // Perform health checks after import
      await this.checkServicesHealth();
      
      return true;
    } catch (error) {
      console.error('Failed to import service registry state:', error);
      throw error;
    }
  }

  // Cleanup method
  async cleanup() {
    this.stopHealthChecks();
    this.services.clear();
    console.log('Service registry cleaned up');
  }
}

module.exports = ServiceRegistry;