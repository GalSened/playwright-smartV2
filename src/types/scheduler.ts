// Frontend types for scheduling functionality
// Matches backend types but simplified for UI

export interface Schedule {
  id: string;
  suite_id: string;
  suite_name: string;
  timezone: string;
  run_at_utc: string;
  run_at_local: string;
  notes?: string;
  tags_parsed?: string[];
  priority: number;
  status: 'scheduled' | 'running' | 'completed' | 'failed' | 'canceled';
  created_at: string;
  updated_at: string;
  execution_options_parsed?: {
    mode?: 'headed' | 'headless';
    execution?: 'parallel' | 'sequential';
    retries?: number;
    timeout_ms?: number;
    browser?: string;
    environment?: string;
  };
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrence_interval?: number;
  recurrence_days_parsed?: string[];
  recurrence_end_date?: string;
  minutes_until_run?: number;
  last_run?: ScheduleRun;
}

export interface ScheduleRun {
  id: string;
  schedule_id: string;
  started_at: string;
  finished_at?: string;
  duration_ms?: number;
  status: 'running' | 'completed' | 'failed' | 'canceled' | 'timeout';
  exit_code?: number;
  error_message?: string;
  tests_total: number;
  tests_passed: number;
  tests_failed: number;
  tests_skipped: number;
  artifacts_path?: string;
}

export interface CreateScheduleRequest {
  suite_id: string;
  suite_name: string;
  run_at: string; // ISO 8601 in user's timezone
  timezone?: string;
  notes?: string;
  tags?: string[];
  priority?: number;
  execution_options?: {
    mode?: 'headed' | 'headless';
    execution?: 'parallel' | 'sequential';
    retries?: number;
    timeout_ms?: number;
    browser?: 'chromium' | 'firefox' | 'webkit' | 'all';
    environment?: string;
  };
  recurrence_type?: 'none' | 'daily' | 'weekly' | 'monthly' | 'custom';
  recurrence_interval?: number;
  recurrence_days?: string[];
  recurrence_end_date?: string;
  run_now?: boolean;
}

export interface UpdateScheduleRequest {
  run_at?: string;
  timezone?: string;
  notes?: string;
  tags?: string[];
  priority?: number;
  execution_options?: {
    mode?: 'headed' | 'headless';
    execution?: 'parallel' | 'sequential';
    retries?: number;
    timeout_ms?: number;
    browser?: 'chromium' | 'firefox' | 'webkit' | 'all';
    environment?: string;
  };
}

export interface ScheduleListResponse {
  schedules: Schedule[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface TimezoneInfo {
  name: string;
  abbreviation: string;
  offset: string;
  isDST: boolean;
}

export interface ScheduleFormData {
  suite_id: string;
  suite_name: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  timezone: string;
  notes: string;
  priority: number;
  run_now: boolean;
  execution_options: {
    mode: 'headed' | 'headless';
    execution: 'parallel' | 'sequential';
    retries: number;
    browser: 'chromium' | 'firefox' | 'webkit' | 'all';
    environment: string;
  };
}

export interface SchedulerError {
  error: string;
  code?: string;
  details?: any;
}

// API client interface
export interface SchedulerAPI {
  // Schedules
  createSchedule(request: CreateScheduleRequest): Promise<{ schedule: Schedule; timezone_info: TimezoneInfo }>;
  getSchedules(filters?: {
    status?: string[];
    suite_id?: string;
    from_date?: string;
    to_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<ScheduleListResponse>;
  getSchedule(id: string): Promise<{ schedule: Schedule; recent_runs: ScheduleRun[]; timezone_info: TimezoneInfo }>;
  updateSchedule(id: string, request: UpdateScheduleRequest): Promise<{ schedule: Schedule; timezone_info: TimezoneInfo }>;
  runNow(id: string, options?: { notes?: string }): Promise<{ run: ScheduleRun; message: string }>;
  cancelSchedule(id: string): Promise<{ message: string }>;
  deleteSchedule(id: string): Promise<{ message: string }>;
  
  // Statistics
  getStats(): Promise<{
    total: number;
    by_status: Record<string, number>;
    next_24h: number;
    overdue: number;
  }>;
}