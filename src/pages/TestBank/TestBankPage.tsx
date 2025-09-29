import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/app/store';
import { api, getCommonSuitePresets } from '@/app/api';
import { Loading, TableSkeleton } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Table } from '@/components/Table';
import { TestRunScheduler } from '@/components/TestRunScheduler';
import { formatDuration, getRiskColor, generateId } from '@/app/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { TestDefinition, Suite } from '@/app/types';
import { 
  TestTube, 
  Search, 
  Filter,
  Plus,
  Play,
  X,
  Check,
  Clock,
  Users,
  Calendar,
  Settings,
  PenTool,
  RefreshCw,
  Activity,
  AlertCircle,
  CheckCircle,
  XCircle,
  Square,
  Wrench,
  Bug,
  FileText,
  TrendingUp,
  BarChart3,
  Eye,
  Zap,
  Target,
  Heart,
  Shield,
  Loader2,
  Workflow
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:8082';

export function TestBankPage() {
  const navigate = useNavigate();
  const { 
    tests, 
    suites, 
    selectedTests, 
    currentSuite,
    loading,
    setTests, 
    setSuites,
    setSelectedTests,
    toggleTestSelection,
    setCurrentSuite,
    clearSelection,
    setLoading,
    addSuite,
    addRun
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [tagFilter, setTagFilter] = useState('');
  const [suiteName, setSuiteName] = useState('');
  const [suiteDescription, setSuiteDescription] = useState('');
  const [runningTests, setRunningTests] = useState<string[]>([]);
  const [suitePresets] = useState(getCommonSuitePresets());
  const [activeTab, setActiveTab] = useState<'tests'>('tests');
  const [showWeSignControls, setShowWeSignControls] = useState(false);
  const [healingNotification, setHealingNotification] = useState<{
    testName: string;
    originalSelector: string;
    newSelector: string;
    confidence: number;
  } | null>(null);
  
  // Suite execution options
  const [executionMode, setExecutionMode] = useState<'headed' | 'headless'>('headed');
  const [executionType, setExecutionType] = useState<'parallel' | 'sequential'>('parallel');
  const [retryCount, setRetryCount] = useState<1 | 2 | 3>(1);

  // WeSign-specific state
  const [systemHealth, setSystemHealth] = useState<{
    healthy: boolean;
    checks: {
      pythonAvailable: boolean;
      wesignTestsExists: boolean;
      playwrightInstalled: boolean;
    };
  } | null>(null);
  
  // Self-healing integration state
  const [healingStats, setHealingStats] = useState<{
    pending: number;
    healed: number;
    bugs: number;
    total: number;
    successRate: number;
    avgConfidence: number;
  } | null>(null);
  const [healingQueue, setHealingQueue] = useState<any[]>([]);
  
  // Reports integration state
  const [recentReports, setRecentReports] = useState<any[]>([]);
  const [testTrends, setTestTrends] = useState<any>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [currentTest, setCurrentTest] = useState<{
    runId: string;
    status: string;
    progress?: {
      percentage: number;
      currentStep: string;
    };
    startTime: Date;
    endTime?: Date;
    results?: any;
  } | null>(null);
  const [config, setConfig] = useState({
    suite: 'auth',
    language: 'english',
    browser: 'chromium',
    headless: true,
    workers: 1,
    timeout: 30000,
    workflow: undefined as 'e2e' | 'regression' | 'smoke' | undefined
  });
  const [availableSuites, setAvailableSuites] = useState<string[]>([]);

  // Load data on mount
  useEffect(() => {
    async function loadData() {
      setLoading('tests', true);
      setLoading('suites', true);
      
      try {
        const [testsData, suitesData] = await Promise.all([
          api.getTests(),
          api.getSuites()
        ]);
        setTests(testsData);
        setSuites(suitesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setLoading('tests', false);
        setLoading('suites', false);
      }
    }

    loadData();
  }, [setTests, setSuites, setLoading]);

  // Filter tests based on search and filters
  const filteredTests = useMemo(() => {
    if (!Array.isArray(tests)) return [];
    return tests.filter((test) => {
      const matchesSearch = searchQuery === '' || 
        test.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        test.description?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesModule = moduleFilter === '' || test.module === moduleFilter;
      const matchesRisk = riskFilter === '' || test.risk === riskFilter;
      const matchesTag = tagFilter === '' || test.tags.includes(tagFilter);
      
      return matchesSearch && matchesModule && matchesRisk && matchesTag;
    });
  }, [tests, searchQuery, moduleFilter, riskFilter, tagFilter]);

  // Get unique modules and tags for filters
  const modules = useMemo(() => {
    if (!Array.isArray(tests)) {
      console.error('tests is not an array in modules useMemo:', tests);
      return [];
    }
    return [...new Set(tests.map(test => test.module))];
  }, [tests]);

  const availableTags = useMemo(() => {
    if (!Array.isArray(tests)) {
      console.error('tests is not an array in availableTags useMemo:', tests);
      return [];
    }
    const allTags = tests.flatMap(test => test.tags);
    return [...new Set(allTags)].sort();
  }, [tests]);

  // Selected tests data
  const selectedTestsData = useMemo(() => {
    if (!Array.isArray(tests)) {
      console.error('tests is not an array in selectedTestsData useMemo:', tests);
      return [];
    }
    return tests.filter(test => selectedTests.includes(test.id));
  }, [tests, selectedTests]);

  // Total estimated duration
  const totalDuration = useMemo(() => {
    return selectedTestsData.reduce((sum, test) => sum + (test.estimatedDuration || 0), 0);
  }, [selectedTestsData]);

  // Handle creating a suite
  const handleCreateSuite = async () => {
    if (!suiteName.trim() || selectedTests.length === 0) return;
    
    try {
      // Extract tags from selected tests
      const suiteTags = [...new Set(selectedTestsData.flatMap(test => test.tags))];
      
      const newSuite = await api.createSuite({
        name: suiteName,
        description: suiteDescription,
        testIds: selectedTests,
        tags: suiteTags,
        executionOptions: {
          mode: executionMode,
          execution: executionType,
          retries: retryCount
        }
      });
      
      addSuite(newSuite);
      setSuiteName('');
      setSuiteDescription('');
      clearSelection();
      
      console.log('Suite created successfully');
    } catch (error) {
      console.error('Failed to create suite:', error);
    }
  };

  // Handle creating a suite from preset
  const handleCreatePresetSuite = async (preset: typeof suitePresets[0]) => {
    try {
      // Find tests that match the preset tags
      const matchingTests = tests.filter(test => 
        preset.tags.some(tag => test.tags.includes(tag))
      );
      
      const newSuite = await api.createSuite({
        name: preset.name,
        description: preset.description,
        testIds: matchingTests.map(t => t.id),
        tags: preset.tags,
        executionOptions: {
          mode: executionMode,
          execution: executionType,
          retries: retryCount
        }
      });
      
      addSuite(newSuite);
      console.log(`${preset.name} created successfully with ${matchingTests.length} tests`);
    } catch (error) {
      console.error('Failed to create preset suite:', error);
    }
  };

  // Run single test with self-healing integration
  const runTest = async (testId: string, testName: string) => {
    setRunningTests(prev => [...prev, testId]);

    try {
      console.log('🚀 Running WeSign test:', { testId, testName });

      // Find the test details to get the actual file path
      const test = tests.find(t => t.id === testId);
      if (!test) {
        throw new Error(`Test not found: ${testId}`);
      }

      const response = await fetch('http://localhost:8082/api/wesign/test/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          testId: testId,
          testFile: test.filePath,  // Use the real file path from test discovery
          config: {
            headless: config.headless,  // Use WeSign hub configuration
            browser: config.browser || 'chromium',
            language: config.language || 'english'
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Test execution failed');
      }

      console.log('✅ Test execution started:', data);

      // Update test status to show it's running
      const updatedTests = tests.map(t =>
        t.id === testId
          ? {
              ...t,
              lastStatus: 'running',
              lastRun: new Date().toISOString(),
              lastDuration: null
            }
          : t
      );
      setTests(updatedTests);

      // Start polling for test status using the runId
      if (data.runId) {
        pollWeSignTestStatus(data.runId, testId);
      }

      console.log('✅ WeSign test execution started, monitoring status...');
      
    } catch (error) {
      console.error('Failed to run test:', error);
      alert('Failed to run test: ' + (error as Error).message);
    } finally {
      setRunningTests(prev => prev.filter(id => id !== testId));
    }
  };

  // Handle running a single test  
  const handleRunSingleTest = async (testId: string) => {
    const test = tests.find(t => t.id === testId);
    if (!test) {
      console.error('Test not found:', testId);
      return;
    }
    
    await runTest(testId, test.name);
  };

  // Load tests function
  const loadTests = async () => {
    try {
      const testsData = await api.getTests();
      setTests(testsData);
    } catch (error) {
      console.error('Failed to load tests:', error);
    }
  };

  // Handle running existing suite
  const handleRunSuite = async (suiteId: string) => {
    try {
      const suite = suites.find(s => s.id === suiteId);
      if (!suite) throw new Error('Suite not found');

      console.log('Running suite:', suite.name);
      
      // For now, run each test in the suite individually using our self-healing system
      const suiteTests = tests.filter(test => suite.testIds.includes(test.id));
      
      for (const test of suiteTests) {
        await runTest(test.id, test.name);
      }
      
      console.log('Suite execution completed:', suite.name);
      
    } catch (error) {
      console.error('Failed to run suite:', error);
    }
  };

  // Test healing function
  const testHealing = async () => {
    try {
      // Force a selector failure
      const response = await fetch('http://localhost:8082/api/healing/test-scenario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testId: 'test-healing-001',
          testName: 'Login Button Test',
          error: 'element not found: #old-login-button',
          originalSelector: '#old-login-button',
          domContent: '<div class="login-form"><button id="new-login-button" class="btn btn-primary">Login</button><button class="login-btn">Sign In</button></div>'
        })
      });
      
      const result = await response.json();
      console.log('Healing result:', result);
      
      if (result.success) {
        if (result.healed) {
          alert(`🎯 Healing SUCCESS!\n\nOriginal: ${result.originalSelector}\nNew: ${result.newSelector}\nConfidence: ${(result.confidence * 100).toFixed(1)}%\n\nThe self-healing system found a working alternative!`);
        } else {
          alert(`❌ Healing failed for selector: ${result.originalSelector}\n\nFailure type: ${result.failureType}\n\nNo suitable alternatives were found.`);
        }
      } else {
        alert('❌ Test scenario failed: ' + result.error);
      }
    } catch (error) {
      console.error('Healing test failed:', error);
      alert('❌ Failed to test healing: ' + (error as Error).message);
    }
  };

  // WeSign functions
  const checkSystemHealth = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wesign/health`);
      if (!response.ok) throw new Error('Health check failed');
      const healthData = await response.json();
      setSystemHealth(healthData);
    } catch (error) {
      console.error('Health check failed:', error);
      setSystemHealth(null);
    }
  };
  
  // Self-healing integration functions
  const loadHealingData = async () => {
    try {
      const [statsResponse, queueResponse] = await Promise.all([
        fetch('http://localhost:8082/api/healing/stats'),
        fetch('http://localhost:8082/api/healing/queue?limit=5')
      ]);
      
      if (statsResponse.ok) {
        const stats = await statsResponse.json();
        setHealingStats(stats);
      }
      
      if (queueResponse.ok) {
        const queueData = await queueResponse.json();
        setHealingQueue(queueData.items || []);
      }
    } catch (error) {
      console.error('Failed to load healing data:', error);
    }
  };
  
  // Reports integration functions
  const loadReportsData = async () => {
    try {
      const response = await fetch('http://localhost:8082/api/analytics/smart');
      if (response.ok) {
        const analytics = await response.json();
        setTestTrends(analytics);
      }
    } catch (error) {
      console.error('Failed to load reports data:', error);
    }
  };

  const loadAvailableSuites = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wesign/suites`);
      if (!response.ok) throw new Error('Failed to load suites');
      const suites = await response.json();
      setAvailableSuites(suites.map((s: any) => s.name));
    } catch (error) {
      console.error('Failed to load suites:', error);
    }
  };

  const loadRunningTests = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wesign/tests/running`);
      if (!response.ok) throw new Error('Failed to load running tests');
      const runningTest = await response.json();
      
      if (runningTest && runningTest.runId) {
        setCurrentTest(runningTest);
        setIsRunning(runningTest.status === 'running');
      } else {
        setCurrentTest(null);
        setIsRunning(false);
      }
    } catch (error) {
      console.error('Failed to load running tests:', error);
      setCurrentTest(null);
      setIsRunning(false);
    }
  };

  const startTest = async () => {
    if (isRunning) return;
    
    try {
      setIsRunning(true);
      const response = await fetch(`${BACKEND_URL}/api/wesign/tests/run`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (!response.ok) throw new Error('Failed to start test');
      
      const { runId } = await response.json();
      setCurrentTest({
        runId,
        status: 'running',
        startTime: new Date()
      });

      // Start polling for updates
      pollTestStatus(runId);
    } catch (error) {
      console.error('Failed to start test:', error);
      setIsRunning(false);
      alert('Failed to start test: ' + (error as Error).message);
    }
  };

  const cancelTest = async (runId: string) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/wesign/tests/${runId}/cancel`, {
        method: 'POST'
      });
      
      if (!response.ok) throw new Error('Failed to cancel test');
      
      setIsRunning(false);
      setCurrentTest(prev => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (error) {
      console.error('Failed to cancel test:', error);
    }
  };

  const pollTestStatus = async (runId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/api/wesign/tests/status/${runId}`);
        if (!response.ok) throw new Error('Failed to get test status');

        const testStatus = await response.json();

        setCurrentTest(prev => ({
          ...prev!,
          ...testStatus,
          endTime: testStatus.status === 'completed' || testStatus.status === 'failed'
            ? new Date()
            : prev?.endTime
        }));

        if (testStatus.status === 'completed' || testStatus.status === 'failed' || testStatus.status === 'cancelled') {
          setIsRunning(false);
          clearInterval(pollInterval);
        }
      } catch (error) {
        console.error('Failed to poll test status:', error);
        clearInterval(pollInterval);
        setIsRunning(false);
      }
    }, 2000);
  };

  // Poll WeSign single test status
  const pollWeSignTestStatus = async (runId: string, testId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max

    const pollInterval = setInterval(async () => {
      attempts++;

      try {
        // Check if test result is available
        const response = await fetch('http://localhost:8082/api/wesign/tests/status/' + runId);

        if (response.ok) {
          const result = await response.json();

          if (result.success && result.result) {
            // Test completed, update status
            const testResult = result.result;

            // Update test status using Zustand store pattern
            if (!Array.isArray(tests)) {
              console.error('tests is not an array in polling:', tests);
            } else {
              const updatedTests = tests.map(t =>
                t.id === testId
                  ? {
                      ...t,
                      lastStatus: testResult.status,
                      lastRun: testResult.endTime || new Date().toISOString(),
                      lastDuration: testResult.duration || null
                    }
                  : t
              );
              setTests(updatedTests);
            }

            // Remove from running tests
            setRunningTests(prev => prev.filter(id => id !== testId));

            console.log('✅ WeSign test completed:', testResult);
            clearInterval(pollInterval);
            return;
          }
        }

        // Stop polling after max attempts
        if (attempts >= maxAttempts) {
          console.log('⏱️ WeSign test polling timeout');
          // Update test status on timeout using Zustand store pattern
          if (!Array.isArray(tests)) {
            console.error('tests is not an array in timeout:', tests);
          } else {
            const updatedTests = tests.map(t =>
              t.id === testId
                ? {
                    ...t,
                    lastStatus: 'timeout',
                    lastRun: new Date().toISOString()
                  }
                : t
            );
            setTests(updatedTests);
          }
          setRunningTests(prev => prev.filter(id => id !== testId));
          clearInterval(pollInterval);
        }

      } catch (error) {
        console.error('Failed to poll WeSign test status:', error);
        if (attempts >= 3) { // Stop after 3 failures
          setRunningTests(prev => prev.filter(id => id !== testId));
          clearInterval(pollInterval);
        }
      }
    }, 2000);
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

  // Load integrated data when WeSign controls are shown
  useEffect(() => {
    if (showWeSignControls) {
      checkSystemHealth();
      loadAvailableSuites();
      loadRunningTests();
      loadHealingData();
      loadReportsData();
    } else {
      loadHealingData(); // Load healing data for regular tests too
    }
  }, [showWeSignControls]);
  
  // Refresh healing data periodically
  useEffect(() => {
    const interval = setInterval(() => {
      loadHealingData();
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [showWeSignControls]);

  // Table columns definition
  const columns: ColumnDef<TestDefinition>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={(value) => table.toggleAllPageRowsSelected(!!value.target.checked)}
          data-testid="select-all-tests"
          className="rounded border-2"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={(value) => {
            row.toggleSelected(!!value.target.checked);
            toggleTestSelection(row.original.id);
          }}
          data-testid="test-checkbox"
          className="rounded border-2"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'name',
      header: 'Name',
      cell: ({ row }) => (
        <div data-testid="test-name">
          <div className="font-medium">{row.original.name}</div>
          {row.original.description && (
            <div className="text-sm text-muted-foreground">
              {row.original.description}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'module',
      header: 'Module',
      cell: ({ row }) => (
        <div data-testid="test-module">
          <span className="status-badge bg-secondary text-secondary-foreground">
            {row.original.module}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'risk',
      header: 'Risk',
      cell: ({ row }) => (
        <span 
          className={`status-badge ${getRiskColor(row.original.risk)}`}
          data-testid="test-risk-badge"
        >
          {row.original.risk.toUpperCase()}
        </span>
      ),
    },
    {
      accessorKey: 'steps',
      header: 'Test Steps',
      cell: ({ row }) => (
        <div className="max-w-xs" data-testid="test-steps">
          <ul className="text-xs text-muted-foreground space-y-1">
            {row.original.steps?.slice(0, 3).map((step, index) => (
              <li key={index} className="flex items-start gap-1">
                <span className="text-accent font-medium">{index + 1}.</span>
                <span className="truncate">{step}</span>
              </li>
            ))}
            {row.original.steps?.length > 3 && (
              <li className="text-accent text-xs font-medium">
                +{row.original.steps.length - 3} more steps
              </li>
            )}
          </ul>
        </div>
      ),
      enableSorting: false,
    },
    {
      accessorKey: 'estimatedDuration',
      header: 'Duration',
      cell: ({ row }) => (
        <div data-testid="test-duration">
          {row.original.estimatedDuration 
            ? formatDuration(row.original.estimatedDuration)
            : '-'
          }
        </div>
      ),
    },
    {
      accessorKey: 'lastStatus',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.original.lastStatus;
        const lastRun = row.original.lastRun;
        const duration = row.original.lastDuration;
        
        if (!status) {
          return (
            <div data-testid="test-status">
              <span className="status-badge bg-muted text-muted-foreground">
                Not Run
              </span>
            </div>
          );
        }
        
        const getStatusColor = (status: string) => {
          switch (status) {
            case 'passed':
              return 'bg-green-100 text-green-800';
            case 'failed':
              return 'bg-red-100 text-red-800';
            case 'healed':
              return 'bg-purple-100 text-purple-800';
            case 'healing':
              return 'bg-yellow-100 text-yellow-800';
            case 'bug_confirmed':
              return 'bg-red-200 text-red-900';
            default:
              return 'bg-gray-100 text-gray-800';
          }
        };
        
        // Check if test is in healing queue
        const healingItem = healingQueue.find(item => 
          item.test_id === row.original.id || item.test_name === row.original.name
        );
        
        const getStatusIcon = () => {
          if (healingItem) {
            switch (healingItem.status) {
              case 'healed':
                return <Wrench className="h-3 w-3 text-purple-600" />;
              case 'pending':
              case 'analyzing':
                return <Clock className="h-3 w-3 text-yellow-600" />;
              case 'bug_confirmed':
                return <Bug className="h-3 w-3 text-red-600" />;
              default:
                return null;
            }
          }
          return null;
        };
        
        const statusColor = getStatusColor(status);
          
        return (
          <div data-testid="test-status" className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`status-badge ${statusColor}`}>
                {healingItem?.status === 'healed' ? 'HEALED' : status.toUpperCase()}
              </span>
              {getStatusIcon()}
            </div>
            {healingItem && (
              <div className="text-xs text-purple-600 flex items-center gap-1">
                <Zap className="h-3 w-3" />
                {healingItem.confidence_score ? 
                  `${Math.round(healingItem.confidence_score * 100)}% confidence` : 
                  'Self-healing active'
                }
              </div>
            )}
            {lastRun && (
              <div className="text-xs text-muted-foreground">
                {new Date(lastRun).toLocaleString()}
              </div>
            )}
            {duration && (
              <div className="text-xs text-muted-foreground">
                {formatDuration(duration)}
              </div>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={() => {
            console.log('🔥 BUTTON CLICKED!', { id: row.original.id, name: row.original.name });
            handleRunSingleTest(row.original.id);
          }}
          disabled={runningTests.includes(row.original.id)}
          className="button button-outline px-3 py-1 text-xs flex items-center gap-1"
          data-testid="run-single-test"
        >
          {runningTests.includes(row.original.id) ? (
            <Loading size="sm" />
          ) : (
            <>
              <Play className="h-3 w-3" />
              Run
            </>
          )}
        </button>
      ),
      enableSorting: false,
    },
  ];

  // Get selected suite for scheduling - MUST be before any conditional returns
  const selectedSuiteForScheduling = useMemo(() => {
    if (selectedTests.length === 0) return null;
    
    return {
      id: currentSuite?.id || `temp-${Date.now()}`,
      name: suiteName || `Selected Tests (${selectedTests.length})`,
      testIds: selectedTests
    };
  }, [selectedTests, currentSuite, suiteName]);

  if (loading.tests || loading.suites) {
    return (
      <div data-testid="test-bank-page">
        <h1 className="text-3xl font-bold mb-8" data-testid="page-title">Test Bank</h1>
        <TableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div data-testid="test-bank-page">
      <h1 className="text-3xl font-bold mb-8" data-testid="page-title">Test Bank</h1>
      
      {/* Header with WeSign Toggle */}
      <div className="flex justify-between items-center border-b pb-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <TestTube className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-semibold">Tests & Suites</h2>
          </div>
          <div className="h-6 w-px bg-border"></div>
          <div className="text-sm text-muted-foreground">
            {tests.length} total tests • {selectedTests.length} selected
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWeSignControls(!showWeSignControls)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 flex items-center gap-2 ${
              showWeSignControls
                ? 'bg-primary text-primary-foreground shadow-md'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
            data-testid="wesign-toggle"
          >
            <PenTool className="w-4 h-4" />
            WeSign Testing
            {showWeSignControls ? (
              <X className="w-3 h-3 ml-1" />
            ) : (
              <Plus className="w-3 h-3 ml-1" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-6">
        {/* WeSign Controls - Collapsible */}
        {showWeSignControls && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <PenTool className="h-5 w-5" />
                  WeSign Testing Hub
                </CardTitle>
                <div className="flex items-center gap-2">
                  <div className="text-xs px-2 py-1 bg-primary/10 text-primary rounded">
                    634+ Tests Available
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Integrated Dashboard Stats */}
              <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
                {/* System Health */}
                <Card className="bg-gradient-to-r from-blue-50 to-blue-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-blue-600">System Status</p>
                        <p className="text-2xl font-bold text-blue-900">
                          {systemHealth?.healthy ? 'Healthy' : 'Issues'}
                        </p>
                      </div>
                      <Shield className={`h-8 w-8 ${systemHealth?.healthy ? 'text-green-500' : 'text-red-500'}`} />
                    </div>
                  </CardContent>
                </Card>
                
                {/* Self-Healing Stats */}
                <Card className="bg-gradient-to-r from-purple-50 to-purple-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-purple-600">Auto-Healed</p>
                        <p className="text-2xl font-bold text-purple-900">
                          {healingStats?.healed || 0}
                        </p>
                        <p className="text-xs text-purple-600">
                          {healingStats?.successRate || 0}% success rate
                        </p>
                      </div>
                      <Wrench className="h-8 w-8 text-purple-500" />
                    </div>
                  </CardContent>
                </Card>
                
                {/* Active Tests */}
                <Card className="bg-gradient-to-r from-green-50 to-green-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-green-600">WeSign Tests</p>
                        <p className="text-2xl font-bold text-green-900">634+</p>
                        <p className="text-xs text-green-600">
                          {isRunning ? 'Running' : 'Ready'}
                        </p>
                      </div>
                      <TestTube className="h-8 w-8 text-green-500" />
                    </div>
                  </CardContent>
                </Card>
                
                {/* Reports & Analytics */}
                <Card className="bg-gradient-to-r from-orange-50 to-orange-100">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-orange-600">Coverage</p>
                        <p className="text-2xl font-bold text-orange-900">
                          {testTrends?.summary?.overallCoverage ? `${testTrends.summary.overallCoverage}%` : 'N/A'}
                        </p>
                        <p className="text-xs text-orange-600">
                          Health: {testTrends?.summary?.healthScore || 'N/A'}
                        </p>
                      </div>
                      <BarChart3 className="h-8 w-8 text-orange-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* System Health */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <RefreshCw className="h-5 w-5" />
                      System Health
                      <button
                        onClick={checkSystemHealth}
                        className="button button-outline px-3 py-1 text-xs ml-auto"
                        data-testid="refresh-health"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Check Health
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {systemHealth ? (
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {systemHealth.healthy ? (
                            <CheckCircle className="h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-500" />
                          )}
                          <span className={systemHealth.healthy ? "text-green-700" : "text-red-700"}>
                            {systemHealth.healthy ? "System is healthy" : "WeSign test environment has issues"}
                          </span>
                        </div>
                        <div className="space-y-1 text-sm">
                          <div className="flex justify-between">
                            <span>Python:</span>
                            <span className={systemHealth.checks.pythonAvailable ? "text-green-600" : "text-red-600"}>
                              {systemHealth.checks.pythonAvailable ? "Available" : "Missing"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>WeSign Tests:</span>
                            <span className={systemHealth.checks.wesignTestsExists ? "text-green-600" : "text-red-600"}>
                              {systemHealth.checks.wesignTestsExists ? "Found" : "Missing"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Playwright:</span>
                            <span className={systemHealth.checks.playwrightInstalled ? "text-green-600" : "text-red-600"}>
                              {systemHealth.checks.playwrightInstalled ? "Installed" : "Missing"}
                            </span>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertCircle className="h-4 w-4" />
                        Cannot connect to backend
                      </div>
                    )}
                  </CardContent>
                </Card>

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
                          onChange={(e) => setConfig(prev => ({ ...prev, suite: e.target.value }))}
                          className="input mt-1"
                          disabled={isRunning}
                          data-testid="suite-select"
                        >
                          <option value="auth">Authentication</option>
                          <option value="dashboard">Dashboard</option>
                          <option value="templates">Templates</option>
                          <option value="contacts">Contacts</option>
                          <option value="document-signing">Document Signing</option>
                          <option value="document-management">Document Management</option>
                          <option value="all">All Tests</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Language</label>
                          <select
                            value={config.language}
                            onChange={(e) => setConfig(prev => ({ ...prev, language: e.target.value }))}
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
                            onChange={(e) => setConfig(prev => ({ ...prev, browser: e.target.value }))}
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

                {/* Self-Healing Queue Panel */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Wrench className="h-5 w-5" />
                      Healing Queue
                      <button
                        onClick={loadHealingData}
                        className="button button-outline px-3 py-1 text-xs ml-auto"
                        data-testid="refresh-healing"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {healingQueue.length > 0 ? (
                      <div className="space-y-3">
                        <div className="text-sm text-muted-foreground mb-2">
                          {healingQueue.length} items in healing queue
                        </div>
                        {healingQueue.slice(0, 5).map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {item.test_name}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {item.failure_type?.replace('_', ' ')} • {item.status}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              {item.confidence_score && (
                                <span className="text-xs px-2 py-1 rounded bg-primary/10 text-primary">
                                  {Math.round(item.confidence_score * 100)}%
                                </span>
                              )}
                              <span className={`w-2 h-2 rounded-full ${
                                item.status === 'healed' ? 'bg-green-500' :
                                item.status === 'pending' ? 'bg-yellow-500' :
                                item.status === 'failed' ? 'bg-red-500' :
                                'bg-gray-500'
                              }`} />
                            </div>
                          </div>
                        ))}
                        {healingQueue.length > 5 && (
                          <div className="text-xs text-muted-foreground text-center pt-2">
                            +{healingQueue.length - 5} more items
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No healing items
                        </p>
                        <p className="text-xs text-muted-foreground">
                          All tests running smoothly
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Test Results */}
              <Card className="mt-6">
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
                          <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-primary h-2 transition-all duration-300"
                              style={{ width: `${currentTest.progress.percentage}%` }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {currentTest.progress.currentStep}
                          </p>
                        </div>
                      )}

                      <div className="text-sm space-y-1">
                        <div className="flex justify-between">
                          <span>Started:</span>
                          <span>{new Date(currentTest.startTime).toLocaleTimeString()}</span>
                        </div>
                        {currentTest.endTime && (
                          <div className="flex justify-between">
                            <span>Duration:</span>
                            <span>
                              {Math.round(
                                (new Date(currentTest.endTime).getTime() - new Date(currentTest.startTime).getTime()) / 1000
                              )}s
                            </span>
                          </div>
                        )}
                      </div>

                      {currentTest.results && (
                        <div className="mt-4 space-y-2">
                          <h4 className="font-medium">Results Summary</h4>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div className="text-center">
                              <div className="text-green-600 font-medium">{currentTest.results.passed || 0}</div>
                              <div className="text-muted-foreground">Passed</div>
                            </div>
                            <div className="text-center">
                              <div className="text-red-600 font-medium">{currentTest.results.failed || 0}</div>
                              <div className="text-muted-foreground">Failed</div>
                            </div>
                            <div className="text-center">
                              <div className="text-yellow-600 font-medium">{currentTest.results.skipped || 0}</div>
                              <div className="text-muted-foreground">Skipped</div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <EmptyState
                      icon={TestTube}
                      title="No test running"
                      description="Configure your test settings and click 'Start Tests' to begin."
                    />
                  )}
                </CardContent>
              </Card>

              {/* Reports Analytics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {/* Test Trends Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Test Trends
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {testTrends ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 text-sm">
                          <div className="text-center p-3 bg-green-50 rounded-lg">
                            <div className="text-2xl font-bold text-green-600">
                              {testTrends.summary?.passRate || 'N/A'}%
                            </div>
                            <div className="text-muted-foreground">Pass Rate</div>
                          </div>
                          <div className="text-center p-3 bg-blue-50 rounded-lg">
                            <div className="text-2xl font-bold text-blue-600">
                              {testTrends.summary?.avgDuration || 'N/A'}s
                            </div>
                            <div className="text-muted-foreground">Avg Duration</div>
                          </div>
                          <div className="text-center p-3 bg-orange-50 rounded-lg">
                            <div className="text-2xl font-bold text-orange-600">
                              {testTrends.summary?.totalRuns || 0}
                            </div>
                            <div className="text-muted-foreground">Total Runs</div>
                          </div>
                        </div>
                        
                        {/* Recent Trend Indicators */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span>Reliability Trend</span>
                            <div className="flex items-center gap-1">
                              <TrendingUp className={`h-4 w-4 ${testTrends.trends?.reliability === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                              <span className={testTrends.trends?.reliability === 'up' ? 'text-green-600' : 'text-red-600'}>
                                {testTrends.trends?.reliability === 'up' ? 'Improving' : 'Declining'}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Performance Trend</span>
                            <div className="flex items-center gap-1">
                              <TrendingUp className={`h-4 w-4 ${testTrends.trends?.performance === 'up' ? 'text-green-500' : 'text-red-500'}`} />
                              <span className={testTrends.trends?.performance === 'up' ? 'text-green-600' : 'text-red-600'}>
                                {testTrends.trends?.performance === 'up' ? 'Faster' : 'Slower'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No trend data available
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Run some tests to see analytics
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Recent Reports */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Recent Reports
                      <button
                        onClick={loadReportsData}
                        className="button button-outline px-3 py-1 text-xs ml-auto"
                        data-testid="refresh-reports"
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Refresh
                      </button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {recentReports.length > 0 ? (
                      <div className="space-y-3">
                        {recentReports.slice(0, 5).map((report: any, index: number) => (
                          <div key={index} className="flex items-center justify-between p-2 border rounded hover:bg-muted/50">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">
                                {report.name || `Test Run ${report.id}`}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {report.created_at ? new Date(report.created_at).toLocaleString() : 'Unknown time'}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <span className={`px-2 py-1 rounded text-xs ${
                                report.status === 'passed' ? 'bg-green-100 text-green-700' :
                                report.status === 'failed' ? 'bg-red-100 text-red-700' :
                                'bg-yellow-100 text-yellow-700'
                              }`}>
                                {report.status || 'pending'}
                              </span>
                              <button className="button button-outline px-2 py-1 text-xs">
                                View
                              </button>
                            </div>
                          </div>
                        ))}
                        {recentReports.length > 5 && (
                          <div className="text-xs text-muted-foreground text-center pt-2">
                            +{recentReports.length - 5} more reports
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <FileText className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">
                          No reports available
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Test reports will appear here
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Workflow-Driven Interface */}
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    WeSign Testing Workflows
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Execute pre-configured testing scenarios with guided workflows
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    {/* End-to-End Workflow */}
                    <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                         onClick={() => setConfig(prev => ({ ...prev, suite: 'all', workflow: 'e2e' }))}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Play className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">End-to-End Testing</h3>
                          <p className="text-sm text-muted-foreground">Complete user journey</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Authentication flow</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Document management</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Signing workflow</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Reports validation</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-muted-foreground">
                        <span>~15-20 minutes</span>
                        <span className="text-blue-600 font-medium">All Browsers</span>
                      </div>
                    </div>

                    {/* Regression Testing Workflow */}
                    <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                         onClick={() => setConfig(prev => ({ ...prev, suite: 'auth', workflow: 'regression' }))}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <Shield className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">Regression Testing</h3>
                          <p className="text-sm text-muted-foreground">Core functionality validation</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Critical user paths</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Security validations</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Performance checks</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>API integrations</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-muted-foreground">
                        <span>~8-12 minutes</span>
                        <span className="text-green-600 font-medium">Fast Track</span>
                      </div>
                    </div>

                    {/* Smoke Testing Workflow */}
                    <div className="p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors"
                         onClick={() => setConfig(prev => ({ ...prev, suite: 'dashboard', workflow: 'smoke' }))}>
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                          <Zap className="h-5 w-5 text-orange-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">Smoke Testing</h3>
                          <p className="text-sm text-muted-foreground">Quick health check</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>System availability</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Basic navigation</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Key features</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="h-3 w-3 text-green-500" />
                          <span>Login/logout flow</span>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t flex justify-between items-center text-xs text-muted-foreground">
                        <span>~3-5 minutes</span>
                        <span className="text-orange-600 font-medium">Quick Run</span>
                      </div>
                    </div>
                  </div>

                  {/* Workflow Configuration */}
                  {config.workflow && (
                    <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                        <h4 className="font-medium text-blue-900">
                          {config.workflow === 'e2e' ? 'End-to-End' : 
                           config.workflow === 'regression' ? 'Regression' : 'Smoke'} 
                          Workflow Selected
                        </h4>
                      </div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="font-medium text-blue-900">Suite:</span>
                          <span className="ml-2 text-blue-700">{config.suite}</span>
                        </div>
                        <div>
                          <span className="font-medium text-blue-900">Browser:</span>
                          <span className="ml-2 text-blue-700">{config.browser}</span>
                        </div>
                        <div>
                          <span className="font-medium text-blue-900">Self-healing:</span>
                          <span className="ml-2 text-blue-700">Enabled</span>
                        </div>
                        <div>
                          <span className="font-medium text-blue-900">Reports:</span>
                          <span className="ml-2 text-blue-700">Auto-generated</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setConfig(prev => ({ ...prev, workflow: undefined }))}
                        className="button button-outline px-3 py-1 text-xs mt-3"
                      >
                        <X className="h-3 w-3 mr-1" />
                        Clear Workflow
                      </button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        )}

        {/* Regular Tests & Suites Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 w-full overflow-hidden">
        {/* Tests Section */}
        <div className="lg:col-span-2 min-w-0" data-testid="tests-section" style={{position: 'relative', zIndex: 10}}>
          <Card style={{position: 'relative', zIndex: 10}} className="w-full overflow-hidden">
            <CardHeader>
              <CardTitle>Tests</CardTitle>
              
              {/* Filters & Search */}
              <div className="flex flex-wrap gap-4" data-testid="filters-bar">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search tests..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input pl-10"
                      data-testid="test-search"
                    />
                  </div>
                </div>
                
                <select
                  value={moduleFilter}
                  onChange={(e) => setModuleFilter(e.target.value)}
                  className="input w-40"
                  data-testid="filter-module"
                >
                  <option value="">All Modules</option>
                  {modules.map(module => (
                    <option key={module} value={module}>{module}</option>
                  ))}
                </select>
                
                <select
                  value={riskFilter}
                  onChange={(e) => setRiskFilter(e.target.value)}
                  className="input w-32"
                  data-testid="filter-risk"
                >
                  <option value="">All Risk</option>
                  <option value="low">Low</option>
                  <option value="med">Medium</option>
                  <option value="high">High</option>
                </select>

                <select
                  value={tagFilter}
                  onChange={(e) => setTagFilter(e.target.value)}
                  className="input w-36"
                  data-testid="filter-tags"
                >
                  <option value="">All Tags</option>
                  {availableTags.map(tag => (
                    <option key={tag} value={tag}>
                      {tag.charAt(0).toUpperCase() + tag.slice(1).replace('-', ' ')}
                    </option>
                  ))}
                </select>
                
                {(searchQuery || moduleFilter || riskFilter || tagFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setModuleFilter('');
                      setRiskFilter('');
                      setTagFilter('');
                    }}
                    className="button button-outline px-3 py-2 flex items-center gap-1"
                    data-testid="clear-filters"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                )}
                
                {/* Test Healing Button */}
                <button
                  onClick={testHealing}
                  className="button bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 flex items-center gap-2"
                  data-testid="test-healing-button"
                  title="Test the self-healing system"
                >
                  <Settings className="h-4 w-4" />
                  Test Healing
                </button>
              </div>
            </CardHeader>
            
            <CardContent className="overflow-hidden">
              {filteredTests.length === 0 ? (
                <EmptyState
                  icon={TestTube}
                  title="No tests found"
                  description="No tests match your current filters. Try adjusting your search criteria."
                />
              ) : (
                <div className="w-full overflow-auto">
                  <Table
                    columns={columns}
                    data={filteredTests}
                    testId="tests-table"
                    onRowSelectionChange={(rows) => {
                      setSelectedTests(rows.map(row => row.id));
                    }}
                />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Suite Builder Section */}
        <div className="min-w-0 w-full" data-testid="suite-builder-section" style={{position: 'relative', zIndex: 1}}>
          <Card data-testid="suite-builder-panel" className="w-full overflow-hidden">
            <CardHeader>
              <CardTitle>Suite Builder</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2" data-testid="selected-tests-count">
                    {selectedTests.length} tests selected
                  </p>
                  
                  {selectedTests.length > 0 && (
                    <div className="space-y-2 max-h-40 overflow-y-auto" data-testid="selected-tests-list">
                      {selectedTestsData.map(test => (
                        <div 
                          key={test.id}
                          className="flex items-center justify-between p-2 bg-muted rounded text-sm"
                        >
                          <span>{test.name}</span>
                          <button
                            onClick={() => toggleTestSelection(test.id)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {totalDuration > 0 && (
                    <p className="text-xs text-muted-foreground mt-2" data-testid="estimated-duration">
                      Estimated duration: {formatDuration(totalDuration)}
                    </p>
                  )}
                </div>

                {selectedTests.length > 0 && (
                  <>
                    <div>
                      <label className="text-sm font-medium">Suite Name</label>
                      <input
                        type="text"
                        value={suiteName}
                        onChange={(e) => setSuiteName(e.target.value)}
                        placeholder="Enter suite name..."
                        className="input mt-1"
                        data-testid="suite-name-input"
                      />
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <textarea
                        value={suiteDescription}
                        onChange={(e) => setSuiteDescription(e.target.value)}
                        placeholder="Optional description..."
                        className="input mt-1 h-20 resize-none"
                        data-testid="suite-description-input"
                      />
                    </div>

                    {/* Execution Options */}
                    <div className="space-y-3 p-3 bg-muted rounded">
                      <div>
                        <label className="text-sm font-medium mb-2 block">Execution Options</label>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Execution Mode</label>
                          <select
                            value={executionMode}
                            onChange={(e) => setExecutionMode(e.target.value as 'headed' | 'headless')}
                            className="select w-full mt-1"
                            data-testid="execution-mode-select"
                          >
                            <option value="headless">Headless</option>
                            <option value="headed">Headed</option>
                          </select>
                        </div>
                        
                        <div>
                          <label className="text-xs font-medium text-muted-foreground">Execution Type</label>
                          <select
                            value={executionType}
                            onChange={(e) => setExecutionType(e.target.value as 'parallel' | 'sequential')}
                            className="select w-full mt-1"
                            data-testid="execution-type-select"
                          >
                            <option value="parallel">Parallel</option>
                            <option value="sequential">One at a time</option>
                          </select>
                        </div>
                      </div>
                      
                      <div className="w-full">
                        <label className="text-xs font-medium text-muted-foreground">Retry Count</label>
                        <select
                          value={retryCount}
                          onChange={(e) => setRetryCount(parseInt(e.target.value) as 1 | 2 | 3)}
                          className="select w-full mt-1"
                          data-testid="retry-count-select"
                        >
                          <option value={1}>1 retry</option>
                          <option value={2}>2 retries</option>
                          <option value={3}>3 retries</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex gap-2">
                      <button
                        onClick={handleCreateSuite}
                        disabled={!suiteName.trim()}
                        className="button button-primary px-4 py-2 flex-1 flex items-center justify-center gap-2"
                        data-testid="create-suite-button"
                      >
                        <Plus className="h-4 w-4" />
                        Create Suite
                      </button>
                      
                      <button
                        onClick={clearSelection}
                        className="button button-outline px-4 py-2"
                        data-testid="clear-selection"
                      >
                        Clear
                      </button>
                    </div>
                  </>
                )}

                {selectedTests.length === 0 && (
                  <EmptyState
                    icon={TestTube}
                    title="No tests selected"
                    description="Select tests from the table to create a suite."
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Suite Presets */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Suite Creation</CardTitle>
              <p className="text-sm text-muted-foreground">
                Create common test suites based on tags
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {suitePresets.map(preset => {
                  const matchingTestsCount = tests.filter(test => 
                    preset.tags.some(tag => test.tags.includes(tag))
                  ).length;
                  
                  return (
                    <div key={preset.name} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <h4 className="font-medium">{preset.name}</h4>
                        <p className="text-xs text-muted-foreground">{preset.description}</p>
                        <div className="flex gap-1 mt-1">
                          {preset.tags.map(tag => (
                            <span key={tag} className="status-badge bg-accent text-accent-foreground text-xs">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{matchingTestsCount} tests</div>
                        <button
                          onClick={() => handleCreatePresetSuite(preset)}
                          disabled={matchingTestsCount === 0}
                          className="button button-primary px-3 py-1 text-xs mt-1 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Create Suite
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Existing Suites */}
          <Card className="mt-6" data-testid="existing-suites-section">
            <CardHeader>
              <CardTitle>Existing Suites</CardTitle>
            </CardHeader>
            <CardContent>
              <div data-testid="suites-list">
                {suites.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No suites created"
                    description="Create your first test suite using the builder above."
                  />
                ) : (
                  <div className="space-y-3">
                    {suites.map(suite => (
                      <div 
                        key={suite.id}
                        className="border rounded-lg p-4"
                        data-testid="suite-item"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <h4 className="font-medium" data-testid="suite-name">
                              {suite.name}
                            </h4>
                            {suite.description && (
                              <p className="text-sm text-muted-foreground">
                                {suite.description}
                              </p>
                            )}
                            {suite.tags && suite.tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {suite.tags.map(tag => (
                                  <span key={tag} className="status-badge bg-accent text-accent-foreground text-xs">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <span 
                            className="status-badge bg-secondary text-secondary-foreground"
                            data-testid="suite-test-count"
                          >
                            {suite.testIds.length} tests
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
                          <span>Created {new Date(suite.createdAt).toLocaleDateString()}</span>
                          <span data-testid="suite-last-run">No recent runs</span>
                        </div>
                        
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRunSuite(suite.id)}
                            className="button button-primary px-3 py-1 text-xs flex items-center gap-1"
                            data-testid="run-existing-suite"
                          >
                            <Play className="h-3 w-3" />
                            Run Suite
                          </button>
                          
                          <button
                            className="button button-outline px-3 py-1 text-xs"
                            data-testid="edit-suite"
                          >
                            Edit
                          </button>
                          
                          <button
                            className="button button-outline px-3 py-1 text-xs text-destructive"
                            data-testid="delete-suite"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Self-Healing Notification temporarily disabled */}
        </div>
      </div>
    </div>
  );
}
