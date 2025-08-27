// Frontend types for Trace Viewer functionality
// Matches backend types but adapted for frontend usage

export interface TraceViewerRun {
  id: string;
  suiteId: string;
  suiteName: string;
  startedAt: string;
  finishedAt?: string;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'cancelled';
  environment: string;
  browser?: string;
  testMode?: 'headed' | 'headless';
  totals: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  duration?: number; // milliseconds
  branch?: string;
  commitSha?: string;
  triggeredBy?: string;
  artifactsPath?: string;
  traceFile?: string;
  videoFile?: string;
  htmlReport?: string;
  metadata?: Record<string, any>;
  passRate: number; // calculated percentage
  createdAt: string;
  updatedAt: string;
}

export interface TraceStep {
  id: string;
  runId: string;
  testId?: string;
  testName: string;
  stepIndex: number;
  actionType?: string; // click, fill, navigate, expect
  actionName: string;
  selector?: string;
  url?: string;
  expectedValue?: string;
  actualValue?: string;
  startedAt: string;
  finishedAt?: string;
  duration?: number; // milliseconds
  status: 'running' | 'passed' | 'failed' | 'skipped' | 'timeout';
  errorMessage?: string;
  stackTrace?: string;
  retryCount: number;
  screenshotBefore?: string;
  screenshotAfter?: string;
  videoTimestamp?: number; // timestamp in video file
  createdAt: string;
}

export interface TraceArtifact {
  id: string;
  runId: string;
  stepId?: string; // null for run-level artifacts
  artifactType: 'screenshot' | 'video' | 'trace' | 'log' | 'report' | 'network' | 'console';
  name: string;
  filePath: string;
  fileUrl?: string;
  mimeType: string;
  fileSize?: number;
  thumbnailPath?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  duration?: number; // for videos
  metadata?: Record<string, any>;
  createdAt: string;
}

export interface ConsoleLog {
  id: string;
  runId: string;
  stepId?: string;
  timestamp: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  source: string;
  message: string;
  stackTrace?: string;
  url?: string;
  lineNumber?: number;
  columnNumber?: number;
  args?: any[];
  createdAt: string;
}

export interface NetworkLog {
  id: string;
  runId: string;
  stepId?: string;
  timestamp: string;
  method: string;
  url: string;
  statusCode?: number;
  statusText?: string;
  requestHeaders?: Record<string, string>;
  responseHeaders?: Record<string, string>;
  requestBody?: string;
  responseBody?: string;
  requestSize?: number;
  responseSize?: number;
  duration?: number;
  failed: boolean;
  failureReason?: string;
  createdAt: string;
}

export interface TimelineItem {
  id: string;
  type: 'step' | 'log' | 'network' | 'performance';
  timestamp: string;
  duration?: number;
  status?: 'passed' | 'failed' | 'warning' | 'info';
  title: string;
  description?: string;
  stepId?: string;
  artifacts?: TraceArtifact[];
  metadata?: Record<string, any>;
}

export interface TraceRunDetail {
  run: TraceViewerRun;
  steps?: TraceStep[];
  artifacts?: TraceArtifact[];
  consoleLogs?: ConsoleLog[];
  networkLogs?: NetworkLog[];
  timeline?: TimelineItem[];
}

// UI State interfaces
export interface TraceViewerFilters {
  status: string[];
  environments: string[];
  browsers: string[];
  suites: string[];
  branches: string[];
  dateRange: {
    start?: string;
    end?: string;
  };
  duration: {
    min?: number;
    max?: number;
  };
  passRate: {
    min?: number;
    max?: number;
  };
}

export interface StepFilters {
  status: string[];
  actionTypes: string[];
  hasError: boolean;
  hasScreenshot: boolean;
  duration: {
    min?: number;
    max?: number;
  };
}

export interface MediaPlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  fullscreen: boolean;
  seeking: boolean;
}

export interface ImageViewerState {
  isOpen: boolean;
  currentIndex: number;
  images: TraceArtifact[];
  zoom: number;
  position: { x: number; y: number };
}

// API Response interfaces
export interface GetRunsResponse {
  runs: TraceViewerRun[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface RunStatistics {
  totalRuns: number;
  passRate: number;
  averageDuration: number;
  mostFailedTests: { testName: string; failureCount: number }[];
  environmentStats: { environment: string; runs: number; passRate: number }[];
  browserStats: { browser: string; runs: number; passRate: number }[];
  trendData: { date: string; runs: number; passRate: number }[];
}

// Component prop interfaces
export interface TraceViewerProps {
  runId?: string;
  onRunSelect?: (runId: string) => void;
  onClose?: () => void;
}

export interface TimelineViewProps {
  timeline: TimelineItem[];
  selectedStepId?: string;
  onStepSelect: (stepId: string) => void;
  onTimeSelect: (timestamp: string) => void;
  videoCurrentTime?: number;
  className?: string;
}

export interface StepDetailProps {
  step: TraceStep;
  artifacts?: TraceArtifact[];
  logs?: ConsoleLog[];
  networkLogs?: NetworkLog[];
  onArtifactClick?: (artifact: TraceArtifact) => void;
  className?: string;
}

export interface MediaGalleryProps {
  artifacts: TraceArtifact[];
  selectedArtifactId?: string;
  onArtifactSelect?: (artifact: TraceArtifact) => void;
  onDownload?: (artifact: TraceArtifact) => void;
  className?: string;
}

export interface VideoPlayerProps {
  videoUrl: string;
  timeline?: TimelineItem[];
  currentStepId?: string;
  onStepClick?: (stepId: string, timestamp: number) => void;
  onTimeUpdate?: (currentTime: number) => void;
  autoplay?: boolean;
  className?: string;
}

export interface ImageModalProps {
  isOpen: boolean;
  images: TraceArtifact[];
  currentIndex: number;
  onClose: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onDownload?: (image: TraceArtifact) => void;
}

export interface LogViewerProps {
  logs: (ConsoleLog | NetworkLog)[];
  filter?: {
    levels?: string[];
    source?: string;
    search?: string;
  };
  onLogClick?: (log: ConsoleLog | NetworkLog) => void;
  maxHeight?: number;
  className?: string;
}

// Utility type guards
export const isConsoleLog = (log: ConsoleLog | NetworkLog): log is ConsoleLog => {
  return 'level' in log && 'source' in log;
};

export const isNetworkLog = (log: ConsoleLog | NetworkLog): log is NetworkLog => {
  return 'method' in log && 'url' in log;
};

// Filter and search utilities
export interface SearchFilters {
  query: string;
  status: string[];
  timeRange: {
    start?: Date;
    end?: Date;
  };
  tags: string[];
}

export interface SortOption {
  field: keyof TraceViewerRun | keyof TraceStep;
  direction: 'asc' | 'desc';
  label: string;
}

// Constants
export const TRACE_STATUS_COLORS: Record<string, string> = {
  queued: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  passed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  cancelled: 'bg-yellow-100 text-yellow-800',
  timeout: 'bg-orange-100 text-orange-800',
  skipped: 'bg-gray-100 text-gray-600'
};

export const STEP_ACTION_ICONS: Record<string, string> = {
  click: '👆',
  fill: '✏️',
  navigate: '🔗',
  expect: '✅',
  wait: '⏳',
  select: '📋',
  check: '☑️',
  hover: '👋',
  scroll: '📜',
  screenshot: '📸',
  action: '⚡',
  unknown: '❓'
};

export const LOG_LEVEL_COLORS: Record<string, string> = {
  log: 'text-gray-600',
  info: 'text-blue-600',
  warn: 'text-yellow-600',
  error: 'text-red-600',
  debug: 'text-purple-600'
};

// Keyboard shortcuts
export const KEYBOARD_SHORTCUTS = {
  NEXT_STEP: 'ArrowRight',
  PREV_STEP: 'ArrowLeft',
  PLAY_PAUSE: 'Space',
  FIRST_FAILURE: 'f',
  ZOOM_IN: 'Equal',
  ZOOM_OUT: 'Minus',
  ESCAPE: 'Escape',
  ENTER: 'Enter'
} as const;