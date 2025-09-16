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
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.CLIENT_KEY);
    localStorage.removeItem('isAuthenticated');
  }

  static getClient(): Client | null {
    const clientData = localStorage.getItem(this.CLIENT_KEY);
    return clientData ? JSON.parse(clientData) : null;
  }

  static setClient(client: Client): void {
    localStorage.setItem(this.CLIENT_KEY, JSON.stringify(client));
    localStorage.setItem('isAuthenticated', 'true');
  }

  static isAuthenticated(): boolean {
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
        } catch {}
        throw new Error(errorMessage);
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error instanceof Error ? error : new Error('Network error');
    }
  }

  static get<T>(url: string) {
    return this.request<T>(url, { method: 'GET' });
  }

  static post<T>(url: string, data?: unknown) {
    return this.request<T>(url, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  static patch<T>(url: string, data?: unknown) {
    return this.request<T>(url, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
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
    const response = await HttpClient.post<AuthResponse>(
      `${API_CONFIG.BASE_URL}/api/client/register`,
      clientData
    );

    if (response.success && response.data?.profile) {
      TokenManager.setClient(response.data.profile);
      TokenManager.setToken('authenticated_session'); // session marker
    }
    return response;
  }

  static async signin(email: string, password: string): Promise<AuthResponse> {
    const response = await HttpClient.post<AuthResponse>(
      `${API_CONFIG.BASE_URL}/api/auth/login`,
      { email, password, userType: 'client' }
    );

    if (response.success && response.data?.profile) {
      TokenManager.setClient(response.data.profile);
      TokenManager.setToken('authenticated_session');
    }
    return response;
  }

  static async getProfile(): Promise<AuthResponse> {
    const response = await HttpClient.post<AuthResponse>(
      `${API_CONFIG.BASE_URL}/api/client/profile`,
      {}
    );
    if (response.success && response.data?.profile) {
      TokenManager.setClient(response.data.profile);
    }
    return response;
  }

  static signout(): void {
    TokenManager.removeToken();
  }
}

export { TokenManager };
