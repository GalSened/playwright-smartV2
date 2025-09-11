// Enterprise API Client with real backend integration
import { io, Socket } from 'socket.io-client';

// Types aligned with backend
export interface TestRun {
  id: string;
  tenant_id: string;
  user_id: string;
  project_name: string;
  branch: string;
  commit_hash?: string;
  status: 'running' | 'passed' | 'failed' | 'cancelled' | 'timeout';
  total_tests: number;
  passed_tests: number;
  failed_tests: number;
  skipped_tests: number;
  duration_ms: number;
  metadata: Record<string, any>;
  artifacts: any[];
  started_at: string;
  completed_at?: string;
  created_at: string;
  user_name?: string;
  user_email?: string;
}

export interface TestCase {
  id: string;
  tenant_id: string;
  test_run_id: string;
  name: string;
  suite?: string;
  file_path?: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedout';
  duration_ms: number;
  error_message?: string;
  stack_trace?: string;
  annotations: any[];
  steps: any[];
  attachments: any[];
  retry_count: number;
  browser?: string;
  viewport?: string;
  created_at: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  tenant_id: string;
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  plan: 'free' | 'starter' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled';
}

export interface AuthResponse {
  success: boolean;
  token?: string;
  user?: User;
  tenant?: Tenant;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface AnalyticsSummary {
  totalRuns: number;
  passRate: number;
  averageDuration: number;
  statusDistribution: Record<string, number>;
  projectBreakdown: Array<{
    project: string;
    runs: number;
    passRate: number;
  }>;
}

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;
  private socket: Socket | null = null;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';
    this.token = localStorage.getItem('auth_token');
    
    // Initialize real-time connection
    this.initializeSocket();
  }

  private initializeSocket() {
    if (!this.token) return;

    this.socket = io(this.baseUrl, {
      auth: {
        token: this.token
      },
      autoConnect: true
    });

    this.socket.on('connect', () => {
      console.log('Real-time connection established');
    });

    this.socket.on('disconnect', () => {
      console.log('Real-time connection lost');
    });

    this.socket.on('connect_error', (error) => {
      console.error('Real-time connection error:', error);
    });
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        ...this.getHeaders(),
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: `HTTP ${response.status}: ${response.statusText}`
      }));
      throw new Error(errorData.error || errorData.message || 'Request failed');
    }

    return response.json();
  }

  // Authentication Methods
  async login(email: string, password: string, tenantSubdomain?: string): Promise<AuthResponse> {
    try {
      const requestBody: any = { email, password };
      if (tenantSubdomain) {
        requestBody.tenantSubdomain = tenantSubdomain;
      }
      
      const response = await this.makeRequest<AuthResponse>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(requestBody),
      });

      if (response.success && response.token) {
        this.token = response.token;
        localStorage.setItem('auth_token', response.token);
        this.initializeSocket(); // Reconnect with new token
      }

      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed'
      };
    }
  }

  async register(data: {
    email: string;
    password: string;
    confirmPassword: string;
    companyName: string;
    subdomain: string;
    plan: 'starter' | 'professional' | 'enterprise';
  }): Promise<AuthResponse> {
    try {
      const response = await this.makeRequest<AuthResponse>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(data),
      });

      if (response.success && response.token) {
        this.token = response.token;
        localStorage.setItem('auth_token', response.token);
        this.initializeSocket(); // Connect with new token
      }

      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  async getProfile(): Promise<{ success: boolean; user?: User; tenant?: Tenant; message?: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; user: User; tenant: Tenant }>('/api/auth/me');
      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to fetch profile'
      };
    }
  }

  async refreshToken(): Promise<{ success: boolean; token?: string; message?: string }> {
    try {
      const response = await this.makeRequest<{ success: boolean; token: string }>('/api/auth/refresh', {
        method: 'POST',
      });

      if (response.success && response.token) {
        this.token = response.token;
        localStorage.setItem('auth_token', response.token);
      }

      return response;
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Token refresh failed'
      };
    }
  }

  async logout(): Promise<void> {
    try {
      await this.makeRequest('/api/auth/logout', { method: 'POST' });
    } catch (error) {
      console.warn('Logout request failed:', error);
    } finally {
      this.token = null;
      localStorage.removeItem('auth_token');
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
    }
  }

  // Test Runs Methods
  async getTestRuns(params: {
    page?: number;
    limit?: number;
    project?: string;
    status?: string;
    branch?: string;
    user_id?: string;
    from_date?: string;
    to_date?: string;
    sort?: string;
    order?: 'asc' | 'desc';
  } = {}): Promise<{ runs: TestRun[]; pagination: any }> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `/api/test-runs${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest<{ runs: TestRun[]; pagination: any }>(endpoint);
  }

  async getTestRun(id: string): Promise<{ run: TestRun; testCases: TestCase[] }> {
    return this.makeRequest<{ run: TestRun; testCases: TestCase[] }>(`/api/test-runs/${id}`);
  }

  async createTestRun(data: {
    project_name: string;
    branch?: string;
    commit_hash?: string;
    metadata?: Record<string, any>;
    artifacts?: any[];
  }): Promise<{ run: TestRun }> {
    return this.makeRequest<{ run: TestRun }>('/api/test-runs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTestRun(id: string, updates: {
    status?: 'running' | 'passed' | 'failed' | 'cancelled' | 'timeout';
    total_tests?: number;
    passed_tests?: number;
    failed_tests?: number;
    skipped_tests?: number;
    duration_ms?: number;
    metadata?: Record<string, any>;
    artifacts?: any[];
  }): Promise<{ run: TestRun }> {
    return this.makeRequest<{ run: TestRun }>(`/api/test-runs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  async deleteTestRun(id: string): Promise<void> {
    return this.makeRequest<void>(`/api/test-runs/${id}`, {
      method: 'DELETE',
    });
  }

  async addTestCase(testRunId: string, testCase: {
    name: string;
    suite?: string;
    file_path?: string;
    status: 'passed' | 'failed' | 'skipped' | 'timedout';
    duration_ms?: number;
    error_message?: string;
    stack_trace?: string;
    annotations?: any[];
    steps?: any[];
    attachments?: any[];
    retry_count?: number;
    browser?: string;
    viewport?: string;
  }): Promise<{ testCase: TestCase }> {
    return this.makeRequest<{ testCase: TestCase }>(`/api/test-runs/${testRunId}/test-cases`, {
      method: 'POST',
      body: JSON.stringify(testCase),
    });
  }

  // Analytics Methods
  async getAnalyticsSummary(params: {
    from?: string;
    to?: string;
    project?: string;
  } = {}): Promise<AnalyticsSummary> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `/api/test-runs/analytics/summary${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest<AnalyticsSummary>(endpoint);
  }

  async getAnalytics(params: {
    from?: string;
    to?: string;
    project?: string;
  } = {}): Promise<any> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, value.toString());
      }
    });

    const endpoint = `/api/analytics${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    return this.makeRequest<any>(endpoint);
  }

  // Real-time Methods
  subscribeToUpdates(callbacks: {
    onTestRunCreated?: (testRun: TestRun) => void;
    onTestRunUpdated?: (testRun: TestRun) => void;
    onTestRunDeleted?: (data: { id: string }) => void;
    onTestCaseAdded?: (data: { testRunId: string; testCase: TestCase }) => void;
  }) {
    if (!this.socket) return;

    if (callbacks.onTestRunCreated) {
      this.socket.on('testRunCreated', callbacks.onTestRunCreated);
    }
    
    if (callbacks.onTestRunUpdated) {
      this.socket.on('testRunUpdated', callbacks.onTestRunUpdated);
    }
    
    if (callbacks.onTestRunDeleted) {
      this.socket.on('testRunDeleted', callbacks.onTestRunDeleted);
    }
    
    if (callbacks.onTestCaseAdded) {
      this.socket.on('testCaseAdded', callbacks.onTestCaseAdded);
    }
  }

  unsubscribeFromUpdates() {
    if (!this.socket) return;
    
    this.socket.off('testRunCreated');
    this.socket.off('testRunUpdated');
    this.socket.off('testRunDeleted');
    this.socket.off('testCaseAdded');
  }

  // Utility Methods
  isAuthenticated(): boolean {
    return !!this.token;
  }

  getToken(): string | null {
    return this.token;
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
    this.initializeSocket();
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Test Discovery Methods
  async getTests(): Promise<any[]> {
    console.log('ApiClient: Starting getTests() API call');
    try {
      console.log('ApiClient: About to make request to /api/tests/all');
      const response = await this.makeRequest<{ success: boolean; tests: any[] }>('/api/tests/all');
      console.log('ApiClient: Request completed, response received:', { hasResponse: !!response, success: response?.success, testsLength: response?.tests?.length });
      
      // Multiple safety checks
      if (!response) {
        console.warn('ApiClient: No response received');
        return [];
      }
      
      if (!response.success) {
        console.warn('ApiClient: Response success is false', response);
        return [];
      }
      
      if (!Array.isArray(response.tests)) {
        console.warn('ApiClient: response.tests is not an array', response.tests);
        return [];
      }
      
      console.log('ApiClient: Returning tests array of length:', response.tests.length);
      return response.tests;
    } catch (error) {
      console.error('ApiClient: API call failed', error);
      return [];
    }
  }

  async getSuites(): Promise<any[]> {
    // For now, return empty array - will implement suite storage later
    return [];
  }

  async createSuite(suite: any): Promise<any> {
    // Implement suite creation via backend later
    return { id: `suite-${Date.now()}`, ...suite };
  }

  // Health check
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    return this.makeRequest<{ status: string; timestamp: string }>('/api/health');
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export default apiClient;