// src/lib/api.ts

const API_CONFIG = {
  BASE_URL: 'http://localhost:5000',
  AUTH_SERVICE_URL: 'http://localhost:5001',
  TIMEOUT: 10000,
};

export interface Client {
  id?: string | number;
  businessName: string;
  email: string;
  phoneNo?: string;
  businessType?: string;
  city?: string;
  address?: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user?: {
      id: string | number;
      email: string;
      username?: string;
      userType?: string;
      createdAt?: string;
    };
    profile?: Client;
    token?: string;
  };
  error?: string;
}

export interface Order {
  id: string | number;
  orderId: string;
  trackingNumber: string;
  senderName: string;
  receiverName: string;
  receiverPhone: string;
  pickupAddress: string;
  destinationAddress: string;
  orderStatus: string;
  userId?: number;
  clientId?: number;
  packageDetails?: string;
  specialInstructions?: string;
  estimatedDeliveryDate?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateOrderRequest {
  senderName: string;
  receiverName: string;
  receiverPhone: string;
  pickupAddress: string;
  destinationAddress: string;
  userId?: number;
  clientId?: number;
  packageDetails?: string;
  specialInstructions?: string;
  estimatedDeliveryDate?: string;
}

export interface OrderResponse {
  success: boolean;
  message: string;
  data?: Order;
  error?: string;
}

export interface OrdersListResponse {
  success: boolean;
  message?: string;
  data?: {
    orders: Order[];
    pagination?: {
      currentPage: number;
      limit: number;
      total: number;
    };
  };
  error?: string;
}

export interface OrderStatistics {
  success: boolean;
  data?: {
    totalOrders: number;
    pendingOrders: number;
    pickedUpOrders: number;
    warehouseOrders: number;
    deliveredOrders: number;
    cancelledOrders: number;
    averageDeliveryTimeHours: number;
  };
  error?: string;
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}

// ---------------- Token Manager ----------------
class TokenManager {
  private static readonly TOKEN_KEY = 'authToken';
  private static readonly CLIENT_KEY = 'clientData';

  static getToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.CLIENT_KEY);
    localStorage.removeItem('isAuthenticated');
  }

  static getClient(): Client | null {
    if (typeof window === 'undefined') return null;
    const clientData = localStorage.getItem(this.CLIENT_KEY);
    return clientData ? JSON.parse(clientData) : null;
  }

  static setClient(client: Client): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.CLIENT_KEY, JSON.stringify(client));
    localStorage.setItem('isAuthenticated', 'true');
  }

  static isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!this.getToken() || localStorage.getItem('isAuthenticated') === 'true';
  }
}

// ---------------- HTTP Client ----------------
class HttpClient {
  private static async request<T>(
    url: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = TokenManager.getToken();

    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

    try {
      const response = await fetch(url, { ...config, signal: controller.signal });
      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // If we can't parse the error response, use the status text
          errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      if (error instanceof Error && error.message.includes('fetch')) {
        throw new Error('Network error - please check your connection');
      }
      
      throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
  }

  static get<T>(url: string, options?: RequestInit) {
    return this.request<T>(url, { method: 'GET', ...options });
  }

  static post<T>(url: string, data?: unknown, options?: RequestInit) {
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  static patch<T>(url: string, data?: unknown, options?: RequestInit) {
    return this.request<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
      ...options,
    });
  }

  static delete<T>(url: string, options?: RequestInit) {
    return this.request<T>(url, { method: 'DELETE', ...options });
  }
}

// ---------------- Auth Service ----------------
export class AuthService {
  static async register(clientData: {
    name: string;
    email: string;
    password: string;
    phoneNo?: string;
    businessType?: string;
    city?: string;
    address?: string;
  }): Promise<AuthResponse> {
    try {
      const response = await HttpClient.post<AuthResponse>(
        `${API_CONFIG.BASE_URL}/api/client/register`,
        clientData
      );

      if (response.success && response.data?.profile) {
        TokenManager.setClient(response.data.profile);
        TokenManager.setToken('authenticated_session');
      }
      return response;
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  static async signin(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await HttpClient.post<AuthResponse>(
        `${API_CONFIG.BASE_URL}/api/auth/login`,
        { email, password, userType: 'client' }
      );

      if (response.success && response.data?.profile) {
        TokenManager.setClient(response.data.profile);
        TokenManager.setToken('authenticated_session');
      }
      return response;
    } catch (error) {
      console.error('Sign in error:', error);
      throw error;
    }
  }

  static async getProfile(): Promise<AuthResponse> {
    try {
      const response = await HttpClient.post<AuthResponse>(
        `${API_CONFIG.BASE_URL}/api/client/profile`,
        {}
      );
      
      if (response.success && response.data?.profile) {
        TokenManager.setClient(response.data.profile);
      }
      return response;
    } catch (error) {
      console.error('Get profile error:', error);
      throw error;
    }
  }

  static signout(): void {
    TokenManager.removeToken();
  }
}

// ---------------- Order Service ----------------
export class OrderService {
  private static readonly ORDER_ENDPOINT = `${API_CONFIG.BASE_URL}/api/orders`;

  static async createOrder(orderData: CreateOrderRequest): Promise<OrderResponse> {
    try {
      console.log('Creating order with data:', orderData);
      
      // Validate required fields
      const requiredFields = ['senderName', 'receiverName', 'receiverPhone', 'pickupAddress', 'destinationAddress'];
      const missingFields = requiredFields.filter(field => !orderData[field as keyof CreateOrderRequest]);
      
      if (missingFields.length > 0) {
        throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
      }

      const response = await HttpClient.post<OrderResponse>(
        this.ORDER_ENDPOINT,
        orderData
      );
      
      console.log('Order creation response:', response);
      return response;
    } catch (error) {
      console.error('Order creation error:', error);
      throw error;
    }
  }

  static async getOrder(orderId: string): Promise<OrderResponse> {
    try {
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const response = await HttpClient.get<OrderResponse>(
        `${this.ORDER_ENDPOINT}/order/${orderId}`
      );
      return response;
    } catch (error) {
      console.error('Get order error:', error);
      throw error;
    }
  }

  static async getOrderByTracking(trackingNumber: string): Promise<OrderResponse> {
    try {
      if (!trackingNumber) {
        throw new Error('Tracking number is required');
      }

      const response = await HttpClient.get<OrderResponse>(
        `${this.ORDER_ENDPOINT}/tracking/${trackingNumber}`
      );
      return response;
    } catch (error) {
      console.error('Get order by tracking error:', error);
      throw error;
    }
  }

  static async trackOrder(trackingNumber: string): Promise<any> {
    try {
      if (!trackingNumber) {
        throw new Error('Tracking number is required');
      }

      const response = await HttpClient.get<any>(
        `${this.ORDER_ENDPOINT}/track/${trackingNumber}`
      );
      return response;
    } catch (error) {
      console.error('Track order error:', error);
      throw error;
    }
  }

  static async getUserOrders(userId?: number, page = 1, limit = 20, status?: string): Promise<OrdersListResponse> {
    try {
      const client = TokenManager.getClient();
      const targetUserId = userId || client?.id;
      
      if (!targetUserId) {
        throw new Error('User ID not found - please log in again');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (status && status !== 'all') {
        params.append('status', status);
      }

      const response = await HttpClient.get<OrdersListResponse>(
        `${this.ORDER_ENDPOINT}/user/${targetUserId}?${params.toString()}`
      );
      
      console.log('User orders response:', response);
      return response;
    } catch (error) {
      console.error('Get user orders error:', error);
      throw error;
    }
  }

  static async getClientOrders(clientId?: number, page = 1, limit = 20, status?: string): Promise<OrdersListResponse> {
    try {
      const client = TokenManager.getClient();
      const targetClientId = clientId || client?.id;
      
      if (!targetClientId) {
        throw new Error('Client ID not found - please log in again');
      }

      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      });
      
      if (status && status !== 'all') {
        params.append('status', status);
      }

      const response = await HttpClient.get<OrdersListResponse>(
        `${this.ORDER_ENDPOINT}/client/${targetClientId}?${params.toString()}`
      );
      
      console.log('Client orders response:', response);
      return response;
    } catch (error) {
      console.error('Get client orders error:', error);
      throw error;
    }
  }

  static async updateOrderStatus(
    orderId: string,
    newStatus: string,
    statusChangedBy: string,
    changeReason?: string,
    location?: string,
    driverId?: number
  ): Promise<OrderResponse> {
    try {
      if (!orderId || !newStatus || !statusChangedBy) {
        throw new Error('Order ID, new status, and status changed by are required');
      }

      const response = await HttpClient.patch<OrderResponse>(
        `${this.ORDER_ENDPOINT}/${orderId}/status`,
        {
          newStatus,
          statusChangedBy,
          changeReason,
          location,
          driverId
        }
      );
      return response;
    } catch (error) {
      console.error('Update order status error:', error);
      throw error;
    }
  }

  static async cancelOrder(
    orderId: string,
    cancelReason?: string,
    cancelledBy?: string
  ): Promise<OrderResponse> {
    try {
      if (!orderId) {
        throw new Error('Order ID is required');
      }

      const client = TokenManager.getClient();
      const response = await HttpClient.patch<OrderResponse>(
        `${this.ORDER_ENDPOINT}/${orderId}/cancel`,
        {
          cancelReason: cancelReason || 'Cancelled by client',
          cancelledBy: cancelledBy || client?.businessName || 'client'
        }
      );
      return response;
    } catch (error) {
      console.error('Cancel order error:', error);
      throw error;
    }
  }

  static async getOrderStatistics(userId?: number, clientId?: number): Promise<OrderStatistics> {
    try {
      const params = new URLSearchParams();
      
      if (userId) params.append('userId', userId.toString());
      if (clientId) params.append('clientId', clientId.toString());

      const response = await HttpClient.get<OrderStatistics>(
        `${this.ORDER_ENDPOINT}/statistics?${params.toString()}`
      );
      return response;
    } catch (error) {
      console.error('Get order statistics error:', error);
      throw error;
    }
  }

  // Health check for order service
  static async healthCheck(): Promise<any> {
    try {
      const response = await HttpClient.get<any>(
        `${this.ORDER_ENDPOINT}/health`
      );
      return response;
    } catch (error) {
      console.error('Order service health check error:', error);
      throw error;
    }
  }
}

// ---------------- Gateway Service ----------------
export class GatewayService {
  private static readonly GATEWAY_ENDPOINT = `${API_CONFIG.BASE_URL}/gateway`;

  static async getServices(): Promise<any> {
    try {
      const response = await HttpClient.get<any>(
        `${this.GATEWAY_ENDPOINT}/services`
      );
      return response;
    } catch (error) {
      console.error('Get gateway services error:', error);
      throw error;
    }
  }

  static async healthCheck(): Promise<any> {
    try {
      const response = await HttpClient.get<any>(
        `${this.GATEWAY_ENDPOINT}/health`
      );
      return response;
    } catch (error) {
      console.error('Gateway health check error:', error);
      throw error;
    }
  }

  static async testRoute(path: string): Promise<any> {
    try {
      const response = await HttpClient.post<any>(
        `${this.GATEWAY_ENDPOINT}/test-route`,
        { path }
      );
      return response;
    } catch (error) {
      console.error('Test route error:', error);
      throw error;
    }
  }
}

// ---------------- Utility Functions ----------------
export const ApiUtils = {
  // Format error messages for user display
  formatErrorMessage: (error: unknown): string => {
    if (error instanceof Error) {
      if (error.message.includes('Network error')) {
        return 'Network connection failed. Please check your internet connection and try again.';
      }
      if (error.message.includes('timeout')) {
        return 'Request timed out. Please try again.';
      }
      if (error.message.includes('404')) {
        return 'Service not found. Please contact support if the issue persists.';
      }
      if (error.message.includes('500')) {
        return 'Server error. Please try again later.';
      }
      return error.message;
    }
    return 'An unexpected error occurred. Please try again.';
  },

  // Check if the API is available
  isApiAvailable: async (): Promise<boolean> => {
    try {
      await HttpClient.get(`${API_CONFIG.BASE_URL}/gateway/health`);
      return true;
    } catch {
      return false;
    }
  },

  // Get API configuration
  getConfig: () => ({
    baseUrl: API_CONFIG.BASE_URL,
    timeout: API_CONFIG.TIMEOUT
  })
};

// Export the TokenManager and main services
export { TokenManager };
export default {
  AuthService,
  OrderService,
  GatewayService,
  TokenManager,
  ApiUtils
};