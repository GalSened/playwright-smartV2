// API client for Trace Viewer functionality
import {
  TraceViewerRun,
  TraceRunDetail,
  GetRunsResponse,
  RunStatistics,
  TraceViewerFilters,
  StepFilters
} from '../types/trace';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3002';

class TraceApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api/reports${endpoint}`;
    
    const defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Tenant-ID': '00000000-0000-0000-0000-000000000001', // Default tenant for development
    };

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      // Handle empty responses
      if (response.status === 204) {
        return {} as T;
      }

      return await response.json();
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Test Runs
  async getRuns(params: {
    page?: number;
    limit?: number;
    status?: string;
    environment?: string;
    suite?: string;
    branch?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  } = {}): Promise<GetRunsResponse> {
    const queryParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/runs${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request<GetRunsResponse>(endpoint);
  }

  async getRunById(
    runId: string,
    options: {
      includeSteps?: boolean;
      includeArtifacts?: boolean;
      includeLogs?: boolean;
    } = {}
  ): Promise<TraceRunDetail> {
    const queryParams = new URLSearchParams();
    
    Object.entries(options).forEach(([key, value]) => {
      if (value !== undefined) {
        queryParams.append(key, String(value));
      }
    });

    const endpoint = `/runs/${runId}${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request<TraceRunDetail>(endpoint);
  }

  async createRun(data: {
    suiteId: string;
    suiteName: string;
    environment?: string;
    browser?: string;
    testMode?: 'headed' | 'headless';
    branch?: string;
    commitSha?: string;
    metadata?: Record<string, any>;
  }): Promise<TraceViewerRun> {
    return this.request<TraceViewerRun>('/runs', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateRun(runId: string, updates: Partial<TraceViewerRun>): Promise<TraceViewerRun> {
    return this.request<TraceViewerRun>(`/runs/${runId}`, {
      method: 'PATCH',
      body: JSON.stringify(updates),
    });
  }

  async deleteRun(runId: string): Promise<void> {
    await this.request<void>(`/runs/${runId}`, {
      method: 'DELETE',
    });
  }

  // Steps
  async getSteps(runId: string, filters?: StepFilters) {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      if (filters.status.length > 0) {
        queryParams.append('status', filters.status.join(','));
      }
      if (filters.actionTypes.length > 0) {
        queryParams.append('actionTypes', filters.actionTypes.join(','));
      }
      if (filters.hasError) {
        queryParams.append('hasError', 'true');
      }
      if (filters.hasScreenshot) {
        queryParams.append('hasScreenshot', 'true');
      }
      if (filters.duration.min) {
        queryParams.append('minDuration', String(filters.duration.min));
      }
      if (filters.duration.max) {
        queryParams.append('maxDuration', String(filters.duration.max));
      }
    }

    const endpoint = `/runs/${runId}/steps${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request(endpoint);
  }

  // Artifacts
  async getArtifacts(runId: string, stepId?: string) {
    const endpoint = `/runs/${runId}/artifacts${stepId ? `?stepId=${stepId}` : ''}`;
    return this.request(endpoint);
  }

  async uploadArtifact(
    runId: string,
    file: File,
    metadata: {
      stepId?: string;
      artifactType: string;
      name?: string;
      metadata?: Record<string, any>;
    }
  ) {
    const formData = new FormData();
    formData.append('files', file); // Backend expects 'files' array
    
    Object.entries(metadata).forEach(([key, value]) => {
      if (value !== undefined) {
        formData.append(key, typeof value === 'object' ? JSON.stringify(value) : String(value));
      }
    });

    return this.request(`/runs/${runId}/artifacts`, {
      method: 'POST',
      headers: {}, // Let browser set Content-Type for FormData
      body: formData,
    });
  }

  // Media streaming
  getMediaUrl(runId: string, artifactId: string, options: {
    download?: boolean;
    thumbnail?: boolean;
  } = {}): string {
    const queryParams = new URLSearchParams();
    
    if (options.download) queryParams.append('download', 'true');
    if (options.thumbnail) queryParams.append('thumbnail', 'true');

    return `${this.baseUrl}/api/reports/runs/${runId}/media/${artifactId}${
      queryParams.toString() ? `?${queryParams}` : ''
    }`;
  }

  async downloadArtifact(runId: string, artifactId: string, filename?: string): Promise<void> {
    const url = this.getMediaUrl(runId, artifactId, { download: true });
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`);
      }

      const blob = await response.blob();
      
      // Create download link
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename || 'artifact';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error('Download failed:', error);
      throw error;
    }
  }

  // Trace parsing
  async parseTrace(runId: string, data: {
    traceFilePath: string;
    videoFilePath?: string;
    screenshotsPath?: string;
  }) {
    return this.request(`/runs/${runId}/parse-trace`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // Test rerun
  async rerunTest(runId: string, options: {
    testId?: string;
    environment?: string;
    browser?: string;
    headless?: boolean;
  } = {}) {
    return this.request(`/runs/${runId}/rerun`, {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Statistics
  async getStatistics(filters?: Partial<TraceViewerFilters>): Promise<RunStatistics> {
    const queryParams = new URLSearchParams();
    
    if (filters) {
      if (filters.status?.length) {
        queryParams.append('status', filters.status.join(','));
      }
      if (filters.environments?.length) {
        queryParams.append('environments', filters.environments.join(','));
      }
      if (filters.dateRange?.start) {
        queryParams.append('startDate', filters.dateRange.start);
      }
      if (filters.dateRange?.end) {
        queryParams.append('endDate', filters.dateRange.end);
      }
    }

    const endpoint = `/stats${queryParams.toString() ? `?${queryParams}` : ''}`;
    return this.request<RunStatistics>(endpoint);
  }

  // Cleanup
  async cleanup(daysOld: number = 30) {
    return this.request('/cleanup', {
      method: 'POST',
      body: JSON.stringify({ daysOld }),
    });
  }

  // Utility methods
  async healthCheck(): Promise<boolean> {
    try {
      await fetch(`${this.baseUrl}/health`);
      return true;
    } catch {
      return false;
    }
  }

  // Search and filtering utilities
  async searchRuns(query: string, filters?: Partial<TraceViewerFilters>): Promise<GetRunsResponse> {
    return this.getRuns({
      search: query,
      status: filters?.status?.[0],
      environment: filters?.environments?.[0],
      startDate: filters?.dateRange?.start,
      endDate: filters?.dateRange?.end,
    });
  }

  // Batch operations
  async getMultipleRuns(runIds: string[]): Promise<TraceViewerRun[]> {
    const promises = runIds.map(id => this.getRunById(id, { includeSteps: false, includeArtifacts: false }));
    const results = await Promise.allSettled(promises);
    
    return results
      .filter((result): result is PromiseFulfilledResult<TraceRunDetail> => result.status === 'fulfilled')
      .map(result => result.value.run);
  }

  // Real-time updates (polling)
  startPolling(
    runId: string,
    callback: (run: TraceViewerRun) => void,
    interval: number = 5000
  ): () => void {
    let isPolling = true;
    
    const poll = async () => {
      if (!isPolling) return;
      
      try {
        const detail = await this.getRunById(runId, { 
          includeSteps: false, 
          includeArtifacts: false,
          includeLogs: false
        });
        
        callback(detail.run);
        
        // Continue polling if run is still active
        if (detail.run.status === 'running' || detail.run.status === 'queued') {
          setTimeout(poll, interval);
        }
      } catch (error) {
        console.error('Polling failed:', error);
        if (isPolling) {
          setTimeout(poll, interval * 2); // Backoff on error
        }
      }
    };
    
    poll();
    
    return () => {
      isPolling = false;
    };
  }
}

// Create singleton instance
export const traceApi = new TraceApiClient();

// Export utilities
export const formatDuration = (ms?: number): string => {
  if (!ms) return '-';
  
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  
  const hours = Math.floor(ms / 3600000);
  const minutes = Math.floor((ms % 3600000) / 60000);
  return `${hours}h ${minutes}m`;
};

export const formatFileSize = (bytes?: number): string => {
  if (!bytes) return '-';
  
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

export const getRelativeTime = (timestamp: string): string => {
  const now = new Date();
  const date = new Date(timestamp);
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 60000) return 'Just now';
  if (diffMs < 3600000) return `${Math.floor(diffMs / 60000)}m ago`;
  if (diffMs < 86400000) return `${Math.floor(diffMs / 3600000)}h ago`;
  
  const days = Math.floor(diffMs / 86400000);
  if (days < 30) return `${days}d ago`;
  
  return date.toLocaleDateString();
};