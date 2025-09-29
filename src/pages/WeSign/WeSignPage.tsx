import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { 
  Play,
  Square,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  FileText,
  Settings,
  RefreshCw,
  Activity
} from 'lucide-react';

interface WeSignTestConfig {
  suite: 'auth' | 'dashboard' | 'templates' | 'contacts' | 'signing' | 'documents' | 'all';
  language: 'english' | 'hebrew' | 'both';
  browser: 'chromium' | 'firefox' | 'webkit' | 'all';
  headless: boolean;
  workers: number;
  timeout: number;
}

interface TestResult {
  runId: string;
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  duration?: number;
  progress?: {
    percentage: number;
    completed: number;
    total: number;
  };
}

interface TestOutput {
  stdout: string[];
  stderr: string[];
  lastUpdate: string;
}

const BACKEND_URL = 'http://localhost:8082';

export function WeSignPage() {
  const [config, setConfig] = useState<WeSignTestConfig>({
    suite: 'auth',
    language: 'english',
    browser: 'chromium',
    headless: true,
    workers: 1,
    timeout: 30000
  });

  const [currentTest, setCurrentTest] = useState<TestResult | null>(null);
  const [runningTests, setRunningTests] = useState<TestResult[]>([]);
  const [testOutput, setTestOutput] = useState<TestOutput | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [availableSuites, setAvailableSuites] = useState<string[]>([]);
  const [systemHealth, setSystemHealth] = useState<any>(null);

  // Load initial data
  useEffect(() => {
    loadAvailableSuites();
    checkSystemHealth();
    loadRunningTests();
  }, []);

  // Auto-refresh running tests
  useEffect(() => {
    if (isRunning && currentTest) {
      const interval = setInterval(() => {
        updateTestStatus(currentTest.runId);
        loadTestOutput(currentTest.runId);
      }, 2000);

      return () => clearInterval(interval);
    }
  }, [isRunning, currentTest]);

  const loadAvailableSuites = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wesign/suites`);
      const data = await response.json();
      if (data.success) {
        setAvailableSuites(data.suites.map((s: any) => s.name));
      }
    } catch (error) {
      console.error('Failed to load suites:', error);
    }
  };

  const checkSystemHealth = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wesign/health`);
      const data = await response.json();
      setSystemHealth(data);
    } catch (error) {
      console.error('Health check failed:', error);
      setSystemHealth({ success: false, message: 'Cannot connect to backend' });
    }
  };

  const loadRunningTests = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wesign/tests/running`);
      const data = await response.json();
      if (data.success) {
        setRunningTests(data.running);
      }
    } catch (error) {
      console.error('Failed to load running tests:', error);
    }
  };

  const startTest = async () => {
    try {
      setIsRunning(true);
      
      const response = await fetch(`${BACKEND_URL}/api/wesign/tests/run`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      const data = await response.json();
      
      if (data.success) {
        console.log('Test started successfully:', data.runId);
        updateTestStatus(data.runId);
      } else {
        throw new Error(data.message || 'Failed to start test');
      }
    } catch (error) {
      console.error('Failed to start test:', error);
      setIsRunning(false);
      alert('Failed to start test: ' + (error as Error).message);
    }
  };

  const updateTestStatus = async (runId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wesign/tests/status/${runId}`);
      const data = await response.json();
      
      if (data.success) {
        setCurrentTest(data.result);
        
        if (data.result.status === 'completed' || data.result.status === 'failed' || data.result.status === 'cancelled') {
          setIsRunning(false);
        }
      }
    } catch (error) {
      console.error('Failed to get test status:', error);
    }
  };

  const loadTestOutput = async (runId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wesign/tests/output/${runId}`);
      const data = await response.json();
      
      if (data.success) {
        setTestOutput(data.output);
      }
    } catch (error) {
      console.error('Failed to load test output:', error);
    }
  };

  const cancelTest = async (runId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wesign/tests/${runId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (data.success) {
        setIsRunning(false);
        setCurrentTest(null);
        console.log('Test cancelled successfully');
      } else {
        throw new Error(data.message || 'Failed to cancel test');
      }
    } catch (error) {
      console.error('Failed to cancel test:', error);
      alert('Failed to cancel test: ' + (error as Error).message);
    }
  };

  const openTestReport = async (runId: string) => {
    try {
      const reportUrl = `${BACKEND_URL}/api/wesign/tests/report/${runId}`;
      window.open(reportUrl, '_blank');
    } catch (error) {
      console.error('Failed to open report:', error);
      alert('Failed to open test report');
    }
  };

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'cancelled':
        return <Square className="h-4 w-4 text-gray-500" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div data-testid="wesign-page">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold" data-testid="page-title">
          WeSign Testing Platform
        </h1>
        <button
          onClick={checkSystemHealth}
          className="button button-outline flex items-center gap-2"
          data-testid="refresh-health"
        >
          <RefreshCw className="h-4 w-4" />
          Check Health
        </button>
      </div>

      {/* System Health Status */}
      {systemHealth && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              System Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`p-3 rounded-lg ${systemHealth.healthy ? 'bg-green-50' : 'bg-red-50'}`}>
              <div className="flex items-center gap-2 mb-2">
                {systemHealth.healthy ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500" />
                )}
                <span className={`font-medium ${systemHealth.healthy ? 'text-green-700' : 'text-red-700'}`}>
                  {systemHealth.message || 'System status unknown'}
                </span>
              </div>
              {systemHealth.checks && (
                <div className="grid grid-cols-3 gap-4 mt-3">
                  <div className="text-sm">
                    <span className="font-medium">Python:</span>
                    <span className={`ml-2 ${systemHealth.checks.pythonAvailable ? 'text-green-600' : 'text-red-600'}`}>
                      {systemHealth.checks.pythonAvailable ? 'Available' : 'Not Found'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">WeSign Tests:</span>
                    <span className={`ml-2 ${systemHealth.checks.wesignTestsExists ? 'text-green-600' : 'text-red-600'}`}>
                      {systemHealth.checks.wesignTestsExists ? 'Found' : 'Missing'}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Playwright:</span>
                    <span className={`ml-2 ${systemHealth.checks.playwrightInstalled ? 'text-green-600' : 'text-red-600'}`}>
                      {systemHealth.checks.playwrightInstalled ? 'Installed' : 'Missing'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Configuration */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Test Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Test Suite</label>
                <select
                  value={config.suite}
                  onChange={(e) => setConfig(prev => ({ ...prev, suite: e.target.value as any }))}
                  className="input mt-1"
                  disabled={isRunning}
                  data-testid="suite-select"
                >
                  {availableSuites.length > 0 ? (
                    availableSuites.map(suite => (
                      <option key={suite} value={suite}>
                        {suite.charAt(0).toUpperCase() + suite.slice(1)}
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="auth">Authentication</option>
                      <option value="dashboard">Dashboard</option>
                      <option value="templates">Templates</option>
                      <option value="contacts">Contacts</option>
                      <option value="signing">Document Signing</option>
                      <option value="documents">Document Management</option>
                      <option value="all">All Tests</option>
                    </>
                  )}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Language</label>
                  <select
                    value={config.language}
                    onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value as any }))}
                    className="input mt-1"
                    disabled={isRunning}
                    data-testid="language-select"
                  >
                    <option value="english">English</option>
                    <option value="hebrew">Hebrew</option>
                    <option value="both">Both</option>
                  </select>
                </div>

                <div>
                  <label className="text-sm font-medium">Browser</label>
                  <select
                    value={config.browser}
                    onChange={(e) => setConfig(prev => ({ ...prev, browser: e.target.value as any }))}
                    className="input mt-1"
                    disabled={isRunning}
                    data-testid="browser-select"
                  >
                    <option value="chromium">Chromium</option>
                    <option value="firefox">Firefox</option>
                    <option value="webkit">WebKit</option>
                    <option value="all">All Browsers</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Workers</label>
                  <input
                    type="number"
                    min="1"
                    max="8"
                    value={config.workers}
                    onChange={(e) => setConfig(prev => ({ ...prev, workers: parseInt(e.target.value) || 1 }))}
                    className="input mt-1"
                    disabled={isRunning}
                    data-testid="workers-input"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Timeout (ms)</label>
                  <input
                    type="number"
                    min="5000"
                    max="120000"
                    step="5000"
                    value={config.timeout}
                    onChange={(e) => setConfig(prev => ({ ...prev, timeout: parseInt(e.target.value) || 30000 }))}
                    className="input mt-1"
                    disabled={isRunning}
                    data-testid="timeout-input"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="headless"
                  checked={config.headless}
                  onChange={(e) => setConfig(prev => ({ ...prev, headless: e.target.checked }))}
                  disabled={isRunning}
                  data-testid="headless-checkbox"
                />
                <label htmlFor="headless" className="text-sm font-medium">
                  Run in headless mode
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={startTest}
                  disabled={isRunning || !systemHealth?.healthy}
                  className="button button-primary flex-1 flex items-center justify-center gap-2"
                  data-testid="start-test"
                >
                  {isRunning ? (
                    <>
                      <Loading size="sm" />
                      Running Tests...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Start Tests
                    </>
                  )}
                </button>

                {isRunning && currentTest && (
                  <button
                    onClick={() => cancelTest(currentTest.runId)}
                    className="button button-outline px-4 flex items-center gap-2"
                    data-testid="cancel-test"
                  >
                    <Square className="h-4 w-4" />
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Test Results
            </CardTitle>
          </CardHeader>
          <CardContent>
            {currentTest ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(currentTest.status)}
                    <span className={`status-badge ${getStatusColor(currentTest.status)}`}>
                      {currentTest.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    Run ID: {currentTest.runId.substring(0, 8)}...
                  </span>
                </div>

                {currentTest.progress && (
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Progress</span>
                      <span>{currentTest.progress.percentage}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${currentTest.progress.percentage}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {currentTest.progress.completed} of {currentTest.progress.total} tests
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{currentTest.passedTests}</div>
                    <div className="text-xs text-muted-foreground">Passed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{currentTest.failedTests}</div>
                    <div className="text-xs text-muted-foreground">Failed</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{currentTest.skippedTests}</div>
                    <div className="text-xs text-muted-foreground">Skipped</div>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <div>Started: {new Date(currentTest.startTime).toLocaleString()}</div>
                  {currentTest.endTime && (
                    <div>Finished: {new Date(currentTest.endTime).toLocaleString()}</div>
                  )}
                  {currentTest.duration && (
                    <div>Duration: {formatDuration(currentTest.duration)}</div>
                  )}
                </div>

                {(currentTest.status === 'completed' || currentTest.status === 'failed') && (
                  <button
                    onClick={() => openTestReport(currentTest.runId)}
                    className="button button-outline w-full flex items-center justify-center gap-2"
                    data-testid="view-report"
                  >
                    <FileText className="h-4 w-4" />
                    View Report
                  </button>
                )}
              </div>
            ) : (
              <EmptyState
                icon={Play}
                title="No test running"
                description="Configure your test settings and click 'Start Tests' to begin."
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Test Output */}
      {testOutput && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Test Output</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Standard Output</h4>
                <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
                  {testOutput.stdout.length > 0 ? (
                    testOutput.stdout.join('\n')
                  ) : (
                    <span className="text-gray-500">No output yet...</span>
                  )}
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Error Output</h4>
                <div className="bg-gray-900 text-red-400 p-4 rounded-lg font-mono text-sm max-h-64 overflow-y-auto">
                  {testOutput.stderr.length > 0 ? (
                    testOutput.stderr.join('\n')
                  ) : (
                    <span className="text-gray-500">No errors...</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Running Tests List */}
      {runningTests.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Running Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {runningTests.map((test) => (
                <div key={test.runId} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <div>
                      <div className="font-medium">{test.runId.substring(0, 8)}...</div>
                      <div className="text-sm text-muted-foreground">
                        Started: {new Date(test.startTime).toLocaleString()}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">
                      {test.passedTests + test.failedTests + test.skippedTests} / {test.totalTests}
                    </div>
                    <button
                      onClick={() => updateTestStatus(test.runId)}
                      className="button button-outline px-2 py-1 text-xs mt-1"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}