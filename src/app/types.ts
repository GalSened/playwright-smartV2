export interface TestDefinition {
  id: string;
  name: string;
  module: string;
  tags: string[];
  risk: 'low' | 'med' | 'high';
  description?: string;
  estimatedDuration?: number;
}

export interface Suite {
  id: string;
  name: string;
  description?: string;
  testIds: string[];
  tags: string[];
  createdAt: string;
}

export interface SuiteDraft {
  name: string;
  description?: string;
  testIds: string[];
  tags: string[];
}

export interface RunRecord {
  id: string;
  suiteId: string;
  suiteName: string;
  startedAt: string;
  finishedAt?: string;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'cancelled';
  environment: string;
  totals: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
  duration?: number;
  steps?: RunStep[];
  metadata?: Record<string, any>;
}

export interface RunStep {
  id: string;
  testId: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  errorMessage?: string;
  logs?: string[];
  screenshots?: string[];
  artifacts?: RunArtifact[];
}

export interface RunArtifact {
  id: string;
  type: 'screenshot' | 'video' | 'log' | 'trace' | 'report';
  name: string;
  url: string;
  size?: number;
  createdAt: string;
}

export interface CoverageMetric {
  module: string;
  component?: string;
  totalElements: number;
  coveredElements: number;
  coveragePercent: number;
  lastUpdated: string;
  trend: 'up' | 'down' | 'stable';
  categories: {
    routes: { covered: number; total: number };
    components: { covered: number; total: number };
    functions: { covered: number; total: number };
  };
}

export interface GapItem {
  id: string;
  type: 'untested_route' | 'flaky_test' | 'missing_edge_case' | 'performance_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedModule: string;
  estimatedImpact: string;
  recommendation: string;
  effort: 'low' | 'medium' | 'high';
  lastDetected: string;
}

export interface Insight {
  id: string;
  category: 'coverage' | 'performance' | 'reliability' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  summary: string;
  details: string;
  actionItems: string[];
  confidence: number; // 0-1
  dataPoints: Array<{
    metric: string;
    value: number;
    benchmark?: number;
  }>;
  generatedAt: string;
}

export interface DashboardSnapshot {
  environmentStatus: 'healthy' | 'warning' | 'error';
  totalTests: number;
  totalSuites: number;
  lastRunSummary?: {
    id: string;
    status: 'passed' | 'failed' | 'running';
    duration: number;
    passRate: number;
  };
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'suite_created' | 'run_completed' | 'test_added';
  timestamp: string;
  description: string;
}

export interface SuiteRunRequest {
  suiteId: string;
  environment?: string;
  parallel?: boolean;
  tags?: string[];
}