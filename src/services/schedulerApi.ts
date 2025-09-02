import {
  Schedule,
  ScheduleRun,
  CreateScheduleRequest,
  UpdateScheduleRequest,
  ScheduleListResponse,
  TimezoneInfo,
  SchedulerAPI,
  SchedulerError
} from '@/types/scheduler';

class SchedulerAPIClient implements SchedulerAPI {
  private baseUrl: string;

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/schedules${endpoint}`;
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }

  async createSchedule(request: CreateScheduleRequest): Promise<{ schedule: Schedule; timezone_info: TimezoneInfo }> {
    return this.request('', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  async getSchedules(filters?: {
    status?: string[];
    suite_id?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<ScheduleListResponse> {
    const params = new URLSearchParams();
    
    if (filters?.status) {
      filters.status.forEach(status => params.append('status', status));
    }
    if (filters?.suite_id) params.append('suite_id', filters.suite_id);
    if (filters?.from_date) params.append('from_date', filters.from_date);
    if (filters?.to_date) params.append('to_date', filters.to_date);
    if (filters?.limit) params.append('limit', filters.limit.toString());
    if (filters?.offset) params.append('offset', filters.offset.toString());

    const query = params.toString();
    return this.request(query ? `?${query}` : '');
  }

  async getSchedule(id: string): Promise<{ schedule: Schedule; recent_runs: ScheduleRun[]; timezone_info: TimezoneInfo }> {
    return this.request(`/${id}`);
  }

  async updateSchedule(id: string, request: UpdateScheduleRequest): Promise<{ schedule: Schedule; timezone_info: TimezoneInfo }> {
    return this.request(`/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(request),
    });
  }

  async runNow(id: string, options?: { notes?: string }): Promise<{ run: ScheduleRun; message: string }> {
    return this.request(`/${id}/run-now`, {
      method: 'POST',
      body: JSON.stringify(options || {}),
    });
  }

  async cancelSchedule(id: string): Promise<{ message: string }> {
    return this.request(`/${id}/cancel`, {
      method: 'POST',
    });
  }

  async deleteSchedule(id: string): Promise<{ message: string }> {
    return this.request(`/${id}`, {
      method: 'DELETE',
    });
  }

  async getStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    next_24h: number;
    overdue: number;
  }> {
    return this.request('/stats/summary');
  }
}

export const schedulerApi = new SchedulerAPIClient();