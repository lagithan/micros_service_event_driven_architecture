// API Configuration and Service Layer for SwiftTrack Delivery Platform

const API_CONFIG = {
  // API Gateway URL - all requests go through the gateway
  BASE_URL: 'http://localhost:5000',
  
  // Direct service URLs (fallback if gateway is down)
  AUTH_SERVICE_URL: 'http://localhost:5001',
  DELIVERY_SERVICE_URL: 'http://localhost:5005',
  ORDER_SERVICE_URL: 'http://localhost:5003',
  
  // Timeout settings
  TIMEOUT: 10000,
};

// Types for API responses and requests
export interface Driver {
  id?: string | number;
  fullName: string;
  email: string;
  phoneNo?: string;
  city?: string;
  address?: string;
  vehicleNumber?: string;
  username?: string;
  userType?: string;
  createdAt?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: {
    user?: {
      id: string | number;
      username?: string;
      email: string;
      userType?: string;
      createdAt?: string;
    };
    profile?: {
      id: string | number;
      fullName?: string;
      full_name?: string;  // Backend may return 'full_name' (snake_case)
      name?: string;       // Backend may return 'name' instead of 'fullName'
      email: string;
      phoneNo?: string;
      phone_no?: string;   // Backend may return 'phone_no' (snake_case)
      city?: string;
      address?: string;
      createdAt?: string;
    };
    token?: string;
  };
}

export interface DeliveryOrder {
  id: string;
  orderId: string;
  deliveryPersonId: string;
  deliveryPersonName: string;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  pickupAddress?: string;
  deliveryStatus: 'Picking' | 'PickedUp' | 'Delivering' | 'Delivered';
  pickedupDate?: string;
  deliveredDate?: string;
  items?: { name: string; quantity: number }[];
  notes?: string;
  estimatedDeliveryTime?: string;
  createdAt?: string;
  updatedAt?: string;
  cashPaid?: boolean;
}

export interface DeliveryResponse {
  success: boolean;
  message: string;
  data?: DeliveryOrder | DeliveryOrder[];
}

export interface ApiError {
  success: false;
  message: string;
  error?: string;
}

// Token management
class TokenManager {
  private static readonly TOKEN_KEY = 'authToken';
  private static readonly DRIVER_KEY = 'driverData';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.DRIVER_KEY);
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('driverName');
  }

  static getDriver(): Driver | null {
    const driverData = localStorage.getItem(this.DRIVER_KEY);
    return driverData ? JSON.parse(driverData) : null;
  }

  static setDriver(driver: Driver): void {
    localStorage.setItem(this.DRIVER_KEY, JSON.stringify(driver));
    // Keep compatibility with existing code
    localStorage.setItem('driverName', driver.fullName);
    localStorage.setItem('isAuthenticated', 'true');
  }

  static isAuthenticated(): boolean {
    return !!this.getToken() || localStorage.getItem('isAuthenticated') === 'true';
  }
}

// HTTP client with error handling
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

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.TIMEOUT);

      const response = await fetch(url, {
        ...config,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 401) {
          TokenManager.removeToken();
          window.location.href = '/signin';
          throw new Error('Authentication expired');
        }
        
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch {
          // Use default error message if JSON parsing fails
        }
        
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timeout - please check your connection');
        }
        throw error;
      }
      throw new Error('Network error occurred');
    }
  }

  static async get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' });
  }

  static async post<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async patch<T>(url: string, data?: unknown): Promise<T> {
    return this.request<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static async delete<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'DELETE' });
  }
}

// API Service Classes
export class AuthService {
  /**
   * Register a new driver
   */
  static async register(driverData: {
    fullName: string;
    email: string;
    password: string;
    phoneNo?: string;
    city?: string;
    address?: string;
    vehicleNumber?: string;
  }): Promise<AuthResponse> {
    try {
      const response = await HttpClient.post<AuthResponse>(
        `${API_CONFIG.BASE_URL}/api/driver/register`,
        driverData
      );

      if (response.success && response.data?.user && response.data?.profile) {
        // The backend returns both user and profile data
        const userData = response.data.profile;
        const user = response.data.user;
        const driver: Driver = {
          id: userData.id,
          fullName: userData.fullName,
          email: userData.email,
          phoneNo: userData.phoneNo,
          city: userData.city,
          address: userData.address,
          vehicleNumber: driverData.vehicleNumber, // This might not be in profile yet
          username: user.username,
          userType: user.userType,
          createdAt: userData.createdAt,
        };
        
        TokenManager.setDriver(driver);
        // Set a simple session indicator instead of JWT token
        TokenManager.setToken('authenticated_session');
      }

      return response;
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Sign in driver
   */
  static async signin(email: string, password: string): Promise<AuthResponse> {
    try {
      const response = await HttpClient.post<AuthResponse>(
        `${API_CONFIG.BASE_URL}/api/auth/login`,
        { email, password, userType: 'driver' }
      );

      if (response.success && response.data?.user && response.data?.profile) {
        // Combine user and profile data
        const user = response.data.user;
        const profile = response.data.profile;
        const driver: Driver = {
          id: profile.id || user.id,
          fullName: profile.fullName || profile.full_name || 'Driver',
          email: user.email,
          phoneNo: profile.phoneNo || profile.phone_no || '',
          city: profile.city || '',
          address: profile.address || '',
          username: user.username,
          userType: user.userType,
          createdAt: user.createdAt,
        };
        
        TokenManager.setDriver(driver);
        // Set a simple session indicator instead of JWT token
        TokenManager.setToken('authenticated_session');
      }

      return response;
    } catch (error) {
      console.error('Sign in error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Sign in failed'
      };
    }
  }

  /**
   * Get driver profile
   */
  static async getProfile(): Promise<AuthResponse> {
    try {
      const response = await HttpClient.post<AuthResponse>(
        `${API_CONFIG.BASE_URL}/api/driver/profile`,
        {}
      );

      if (response.success && response.data?.user && response.data?.profile) {
        // Combine user and profile data
        const driver: Driver = {
          id: response.data.user.id,
          fullName: response.data.profile.fullName,
          email: response.data.user.email,
          phoneNo: response.data.profile.phoneNo,
          city: response.data.profile.city,
          address: response.data.profile.address,
          username: response.data.user.username,
          userType: response.data.user.userType,
          createdAt: response.data.user.createdAt,
        };
        
        TokenManager.setDriver(driver);
      }

      return response;
    } catch (error) {
      console.error('Get profile error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch profile'
      };
    }
  }

  /**
   * Sign out driver
   */
  static signout(): void {
    TokenManager.removeToken();
  }
}

export class DeliveryService {
  private static readonly BASE_PATH = '/api/deliveries';

  /**
   * Get deliveries assigned to the current driver
   */
  static async getMyDeliveries(): Promise<DeliveryResponse> {
    const driver = TokenManager.getDriver();
    if (!driver?.id) {
      return {
        success: false,
        message: 'Driver not authenticated'
      };
    }

    try {
      const response = await HttpClient.get<DeliveryResponse>(
        `${API_CONFIG.BASE_URL}${this.BASE_PATH}/my/${driver.id}`
      );
      return response;
    } catch (error) {
      console.error('Get deliveries error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch deliveries'
      };
    }
  }

  /**
   * Get specific delivery by order ID
   */
  static async getDelivery(orderId: string): Promise<DeliveryResponse> {
    try {
      const response = await HttpClient.get<DeliveryResponse>(
        `${API_CONFIG.BASE_URL}${this.BASE_PATH}/order/${orderId}`
      );
      return response;
    } catch (error) {
      console.error('Get delivery error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch delivery'
      };
    }
  }

  /**
   * Get available orders for pickup
   */
  static async getAvailableOrders(): Promise<DeliveryResponse> {
    try {
      const response = await HttpClient.get<DeliveryResponse>(
        `${API_CONFIG.BASE_URL}${this.BASE_PATH}/available-orders`
      );
      return response;
    } catch (error) {
      console.error('Get available orders error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch available orders'
      };
    }
  }

  /**
   * Assign order to current driver
   */
  static async assignOrder(orderId: string): Promise<DeliveryResponse> {
    const driver = TokenManager.getDriver();
    if (!driver?.id) {
      return {
        success: false,
        message: 'Driver not authenticated'
      };
    }

    try {
      const response = await HttpClient.post<DeliveryResponse>(
        `${API_CONFIG.BASE_URL}${this.BASE_PATH}/assign/${orderId}`,
        {
          deliveryPersonId: driver.id,
          deliveryPersonName: driver.fullName
        }
      );
      return response;
    } catch (error) {
      console.error('Assign order error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to assign order'
      };
    }
  }

  /**
   * Update delivery status
   */
  static async updateStatus(
    orderId: string,
    newStatus: 'Picking' | 'PickedUp' | 'Delivering' | 'Delivered',
    notes?: string
  ): Promise<DeliveryResponse> {
    const driver = TokenManager.getDriver();
    if (!driver) {
      return {
        success: false,
        message: 'Driver not authenticated'
      };
    }

    try {
      const response = await HttpClient.patch<DeliveryResponse>(
        `${API_CONFIG.BASE_URL}${this.BASE_PATH}/status/${orderId}`,
        {
          status: newStatus,
          deliveryPersonId: driver.id,
          notes
        }
      );
      return response;
    } catch (error) {
      console.error('Update status error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update status'
      };
    }
  }

  /**
   * Update cash payment status for an order
   */
  static async updateCashPaymentStatus(orderId: string, isPaid: boolean): Promise<DeliveryResponse> {
    const driver = TokenManager.getDriver();
    if (!driver) {
      return {
        success: false,
        message: 'Driver not authenticated'
      };
    }

    try {
      const response = await HttpClient.patch<DeliveryResponse>(
        `${API_CONFIG.BASE_URL}${this.BASE_PATH}/payment/${orderId}`,
        {
          cashPaid: isPaid,
          paymentUpdatedBy: driver.fullName
        }
      );
      return response;
    } catch (error) {
      console.error('Update payment status error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to update payment status'
      };
    }
  }

  /**
   * Cancel delivery
   */
  static async cancelDelivery(orderId: string, reason: string): Promise<DeliveryResponse> {
    const driver = TokenManager.getDriver();
    if (!driver) {
      return {
        success: false,
        message: 'Driver not authenticated'
      };
    }

    try {
      const response = await HttpClient.patch<DeliveryResponse>(
        `${API_CONFIG.BASE_URL}${this.BASE_PATH}/${orderId}/cancel`,
        {
          cancelledBy: driver.fullName,
          cancellationReason: reason
        }
      );
      return response;
    } catch (error) {
      console.error('Cancel delivery error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to cancel delivery'
      };
    }
  }

  /**
   * Get delivery statistics for the driver
   */
  static async getStatistics(): Promise<{
    success: boolean;
    message: string;
    data?: {
      deliveriesToday?: number;
      successRate?: number;
      totalDeliveries?: number;
    };
  }> {
    try {
      const response = await HttpClient.get<{
        success: boolean;
        message: string;
        data?: {
          deliveriesToday?: number;
          successRate?: number;
          totalDeliveries?: number;
        };
      }>(
        `${API_CONFIG.BASE_URL}${this.BASE_PATH}/statistics`
      );
      return response;
    } catch (error) {
      console.error('Get statistics error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch statistics'
      };
    }
  }
}

// Export token manager for authentication checks
export { TokenManager };

// Health check function
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await fetch(`${API_CONFIG.BASE_URL}/health`, {
      method: 'GET',
    });
    return response.ok;
  } catch {
    return false;
  }
};