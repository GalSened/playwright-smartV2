// Mock data adapters for Playwright Smart
import type {
  TestDefinition,
  Suite,
  RunRecord,
  CoverageMetric,
  GapItem,
  Insight,
  DashboardSnapshot,
} from './types';

// Mock test definitions
export const mockTests: TestDefinition[] = [
  {
    id: 'test-1',
    name: 'Login Form Validation',
    module: 'authentication',
    tags: ['login', 'validation', 'forms'],
    risk: 'high',
    description: 'Tests login form validation rules',
    estimatedDuration: 45000,
  },
  {
    id: 'test-2', 
    name: 'User Registration Flow',
    module: 'authentication',
    tags: ['registration', 'forms'],
    risk: 'high',
    estimatedDuration: 60000,
  },
  {
    id: 'test-3',
    name: 'Dashboard Loading',
    module: 'dashboard',
    tags: ['ui', 'loading'],
    risk: 'med',
    estimatedDuration: 30000,
  },
  {
    id: 'test-4',
    name: 'Product Search',
    module: 'catalog',
    tags: ['search', 'products'],
    risk: 'med',
    estimatedDuration: 40000,
  },
  {
    id: 'test-5',
    name: 'Cart Operations',
    module: 'commerce',
    tags: ['cart', 'checkout'],
    risk: 'high',
    estimatedDuration: 55000,
  },
  {
    id: 'test-6',
    name: 'Payment Processing',
    module: 'commerce',
    tags: ['payment', 'checkout'],
    risk: 'high',
    estimatedDuration: 90000,
  },
  {
    id: 'test-7',
    name: 'Profile Settings',
    module: 'profile',
    tags: ['settings', 'profile'],
    risk: 'low',
    estimatedDuration: 25000,
  },
  {
    id: 'test-8',
    name: 'Logout Process',
    module: 'authentication',
    tags: ['logout', 'session'],
    risk: 'med',
    estimatedDuration: 20000,
  },
];

// Mock suites
export const mockSuites: Suite[] = [
  {
    id: 'suite-1',
    name: 'Authentication Suite',
    description: 'Complete authentication flow testing',
    testIds: ['test-1', 'test-2', 'test-8'],
    tags: ['auth', 'critical'],
    createdAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 'suite-2',
    name: 'E-commerce Flow',
    description: 'End-to-end shopping experience',
    testIds: ['test-4', 'test-5', 'test-6'],
    tags: ['commerce', 'e2e'],
    createdAt: '2024-01-14T14:30:00Z',
  },
];

// Mock run records
export const mockRuns: RunRecord[] = [
  {
    id: 'run-1',
    suiteId: 'suite-1',
    suiteName: 'Authentication Suite',
    startedAt: '2024-01-15T15:30:00Z',
    finishedAt: '2024-01-15T15:35:00Z',
    status: 'passed',
    environment: 'staging',
    totals: { passed: 3, failed: 0, skipped: 0, total: 3 },
    duration: 300000,
    steps: [
      {
        id: 'step-1',
        testId: 'test-1',
        testName: 'Login Form Validation',
        status: 'passed',
        startedAt: '2024-01-15T15:30:00Z',
        finishedAt: '2024-01-15T15:31:30Z',
        duration: 90000,
      },
      {
        id: 'step-2',
        testId: 'test-2',
        testName: 'User Registration Flow',
        status: 'passed',
        startedAt: '2024-01-15T15:31:30Z',
        finishedAt: '2024-01-15T15:33:30Z',
        duration: 120000,
      },
      {
        id: 'step-3',
        testId: 'test-8',
        testName: 'Logout Process',
        status: 'passed',
        startedAt: '2024-01-15T15:33:30Z',
        finishedAt: '2024-01-15T15:35:00Z',
        duration: 90000,
      },
    ],
  },
  {
    id: 'run-2',
    suiteId: 'suite-2',
    suiteName: 'E-commerce Flow',
    startedAt: '2024-01-15T12:00:00Z',
    finishedAt: '2024-01-15T12:08:00Z',
    status: 'failed',
    environment: 'production',
    totals: { passed: 2, failed: 1, skipped: 0, total: 3 },
    duration: 480000,
    steps: [
      {
        id: 'step-4',
        testId: 'test-4',
        testName: 'Product Search',
        status: 'passed',
        startedAt: '2024-01-15T12:00:00Z',
        finishedAt: '2024-01-15T12:02:00Z',
        duration: 120000,
      },
      {
        id: 'step-5',
        testId: 'test-5',
        testName: 'Cart Operations',
        status: 'passed',
        startedAt: '2024-01-15T12:02:00Z',
        finishedAt: '2024-01-15T12:05:00Z',
        duration: 180000,
      },
      {
        id: 'step-6',
        testId: 'test-6',
        testName: 'Payment Processing',
        status: 'failed',
        startedAt: '2024-01-15T12:05:00Z',
        finishedAt: '2024-01-15T12:08:00Z',
        duration: 180000,
        errorMessage: 'Payment gateway timeout',
        logs: ['Attempting payment...', 'Gateway response timeout after 30s'],
      },
    ],
  },
];

// Mock coverage metrics
export const mockCoverage: CoverageMetric[] = [
  {
    module: 'authentication',
    totalElements: 45,
    coveredElements: 42,
    coveragePercent: 93.3,
    lastUpdated: '2024-01-15T16:00:00Z',
    trend: 'up',
    categories: {
      routes: { covered: 8, total: 8 },
      components: { covered: 15, total: 16 },
      functions: { covered: 19, total: 21 },
    },
  },
  {
    module: 'dashboard',
    totalElements: 28,
    coveredElements: 20,
    coveragePercent: 71.4,
    lastUpdated: '2024-01-15T16:00:00Z',
    trend: 'stable',
    categories: {
      routes: { covered: 4, total: 5 },
      components: { covered: 8, total: 12 },
      functions: { covered: 8, total: 11 },
    },
  },
  {
    module: 'commerce',
    totalElements: 67,
    coveredElements: 45,
    coveragePercent: 67.2,
    lastUpdated: '2024-01-15T16:00:00Z',
    trend: 'down',
    categories: {
      routes: { covered: 12, total: 18 },
      components: { covered: 18, total: 25 },
      functions: { covered: 15, total: 24 },
    },
  },
];

// Mock gaps
export const mockGaps: GapItem[] = [
  {
    id: 'gap-1',
    type: 'untested_route',
    severity: 'high',
    title: 'Password reset flow not covered',
    description: 'The password reset functionality lacks test coverage',
    affectedModule: 'authentication',
    estimatedImpact: 'High - critical user flow',
    recommendation: 'Add comprehensive password reset tests including email validation and token expiry',
    effort: 'medium',
    lastDetected: '2024-01-15T16:00:00Z',
  },
  {
    id: 'gap-2',
    type: 'flaky_test',
    severity: 'medium',
    title: 'Payment gateway test intermittent failures',
    description: 'Payment processing tests failing ~30% of the time due to timing issues',
    affectedModule: 'commerce',
    estimatedImpact: 'Medium - affects CI reliability',
    recommendation: 'Improve wait strategies and add retry logic for gateway responses',
    effort: 'low',
    lastDetected: '2024-01-15T15:30:00Z',
  },
];

// Mock insights
export const mockInsights: Insight[] = [
  {
    id: 'insight-1',
    category: 'coverage',
    priority: 'high',
    title: 'Commerce module needs more edge case testing',
    summary: 'Coverage analysis shows gaps in error handling and boundary conditions',
    details: 'While core commerce flows are well tested, edge cases like network failures, payment declines, and inventory conflicts lack coverage.',
    actionItems: [
      'Add negative test cases for payment failures',
      'Test inventory conflict scenarios',
      'Add network interruption simulation tests',
    ],
    confidence: 0.85,
    dataPoints: [
      { metric: 'Current Coverage', value: 67.2, benchmark: 80 },
      { metric: 'Error Path Coverage', value: 23, benchmark: 70 },
    ],
    generatedAt: '2024-01-15T16:00:00Z',
  },
  {
    id: 'insight-2',
    category: 'performance',
    priority: 'medium',
    title: 'Test execution time trending upward',
    summary: 'Average test suite execution time has increased 15% over the past month',
    details: 'Analysis of recent runs shows increasing execution times, primarily in authentication and commerce suites.',
    actionItems: [
      'Profile slow tests in authentication suite',
      'Consider parallelization opportunities',
      'Review wait strategies for efficiency',
    ],
    confidence: 0.92,
    dataPoints: [
      { metric: 'Avg Execution Time', value: 420, benchmark: 300 },
      { metric: 'Time Increase', value: 15, benchmark: 5 },
    ],
    generatedAt: '2024-01-15T16:00:00Z',
  },
];

// Mock dashboard data
export const mockDashboard: DashboardSnapshot = {
  environmentStatus: 'healthy',
  totalTests: mockTests.length,
  totalSuites: mockSuites.length,
  lastRunSummary: {
    id: 'run-1',
    status: 'passed',
    duration: 300000,
    passRate: 100,
  },
  recentActivity: [
    {
      id: 'activity-1',
      type: 'run_completed',
      timestamp: '2024-01-15T15:35:00Z',
      description: 'Authentication Suite completed successfully',
    },
    {
      id: 'activity-2',
      type: 'suite_created',
      timestamp: '2024-01-15T10:00:00Z',
      description: 'New suite "Authentication Suite" created',
    },
    {
      id: 'activity-3',
      type: 'run_completed',
      timestamp: '2024-01-15T12:08:00Z',
      description: 'E-commerce Flow completed with 1 failure',
    },
  ],
};

// API functions with simulated delays
export const api = {
  async getTests(): Promise<TestDefinition[]> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return mockTests;
  },

  async getSuites(): Promise<Suite[]> {
    await new Promise((resolve) => setTimeout(resolve, 300));
    return mockSuites;
  },

  async getRuns(): Promise<RunRecord[]> {
    await new Promise((resolve) => setTimeout(resolve, 800));
    return mockRuns;
  },

  async getCoverage(): Promise<CoverageMetric[]> {
    await new Promise((resolve) => setTimeout(resolve, 600));
    return mockCoverage;
  },

  async getGaps(): Promise<GapItem[]> {
    await new Promise((resolve) => setTimeout(resolve, 700));
    return mockGaps;
  },

  async getInsights(): Promise<Insight[]> {
    await new Promise((resolve) => setTimeout(resolve, 900));
    return mockInsights;
  },

  async getDashboard(): Promise<DashboardSnapshot> {
    await new Promise((resolve) => setTimeout(resolve, 400));
    return mockDashboard;
  },

  async createSuite(suite: Omit<Suite, 'id' | 'createdAt'>): Promise<Suite> {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const newSuite: Suite = {
      ...suite,
      id: `suite-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    mockSuites.push(newSuite);
    return newSuite;
  },

  async runSuite(suiteId: string, options?: { environment?: string; parallel?: boolean }): Promise<RunRecord> {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    const suite = mockSuites.find(s => s.id === suiteId);
    if (!suite) throw new Error('Suite not found');
    
    const newRun: RunRecord = {
      id: `run-${Date.now()}`,
      suiteId,
      suiteName: suite.name,
      startedAt: new Date().toISOString(),
      status: 'running',
      environment: options?.environment || 'staging',
      totals: { passed: 0, failed: 0, skipped: 0, total: suite.testIds.length },
    };
    
    mockRuns.unshift(newRun);
    return newRun;
  },
};