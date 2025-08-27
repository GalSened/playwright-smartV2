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
  Calendar
} from 'lucide-react';

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
  const [activeTab, setActiveTab] = useState<'tests' | 'scheduler'>('tests');
  
  // Suite execution options
  const [executionMode, setExecutionMode] = useState<'headed' | 'headless'>('headless');
  const [executionType, setExecutionType] = useState<'parallel' | 'sequential'>('parallel');
  const [retryCount, setRetryCount] = useState<1 | 2 | 3>(1);

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
    return [...new Set(tests.map(test => test.module))];
  }, [tests]);

  const availableTags = useMemo(() => {
    const allTags = tests.flatMap(test => test.tags);
    return [...new Set(allTags)].sort();
  }, [tests]);

  // Selected tests data
  const selectedTestsData = useMemo(() => {
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

  // Handle running a single test
  const handleRunSingleTest = async (testId: string) => {
    setRunningTests(prev => [...prev, testId]);
    
    try {
      // Create a temporary suite for single test
      const tempSuite = await api.createSuite({
        name: `Quick Test: ${tests.find(t => t.id === testId)?.name}`,
        description: 'Single test execution',
        testIds: [testId],
        tags: ['quick-run'],
      });
      
      // Run the suite
      const run = await api.runSuite(tempSuite.id, { environment: 'staging' });
      addRun(run);
      
      // Navigate to reports
      navigate('/reports');
    } catch (error) {
      console.error('Failed to run test:', error);
    } finally {
      setRunningTests(prev => prev.filter(id => id !== testId));
    }
  };

  // Handle running existing suite
  const handleRunSuite = async (suiteId: string) => {
    try {
      const run = await api.runSuite(suiteId, { 
        environment: 'staging',
        parallel: false 
      });
      addRun(run);
      navigate('/reports');
    } catch (error) {
      console.error('Failed to run suite:', error);
    }
  };

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
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <button
          onClick={() => handleRunSingleTest(row.original.id)}
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

  if (loading.tests || loading.suites) {
    return (
      <div data-testid="test-bank-page">
        <h1 className="text-3xl font-bold mb-8" data-testid="page-title">Test Bank</h1>
        <TableSkeleton rows={8} />
      </div>
    );
  }

  // Get selected suite for scheduling
  const selectedSuiteForScheduling = useMemo(() => {
    if (selectedTests.length === 0) return null;
    
    return {
      id: currentSuite?.id || `temp-${Date.now()}`,
      name: suiteName || `Selected Tests (${selectedTests.length})`,
      testIds: selectedTests
    };
  }, [selectedTests, currentSuite, suiteName]);

  return (
    <div data-testid="test-bank-page">
      <h1 className="text-3xl font-bold mb-8" data-testid="page-title">Test Bank</h1>
      
      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6 border-b">
        <button
          onClick={() => setActiveTab('tests')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'tests'
              ? 'bg-primary text-primary-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          data-testid="tests-tab"
        >
          <TestTube className="w-4 h-4 inline-block mr-2" />
          Tests & Suites
        </button>
        <button
          onClick={() => setActiveTab('scheduler')}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === 'scheduler'
              ? 'bg-primary text-primary-foreground border-b-2 border-primary'
              : 'text-muted-foreground hover:text-foreground'
          }`}
          data-testid="scheduler-tab"
        >
          <Calendar className="w-4 h-4 inline-block mr-2" />
          Scheduled Runs
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === 'tests' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tests Section */}
        <div className="lg:col-span-2" data-testid="tests-section">
          <Card>
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
              </div>
            </CardHeader>
            
            <CardContent>
              {filteredTests.length === 0 ? (
                <EmptyState
                  icon={TestTube}
                  title="No tests found"
                  description="No tests match your current filters. Try adjusting your search criteria."
                />
              ) : (
                <Table
                  columns={columns}
                  data={filteredTests}
                  testId="tests-table"
                  onRowSelectionChange={(rows) => {
                    setSelectedTests(rows.map(row => row.id));
                  }}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Suite Builder Section */}
        <div data-testid="suite-builder-section">
          <Card data-testid="suite-builder-panel">
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
        </div>
      )}

      {/* Scheduler Tab Content */}
      {activeTab === 'scheduler' && (
        <div className="max-w-6xl mx-auto">
          <TestRunScheduler
            selectedSuite={selectedSuiteForScheduling}
            onScheduleCreated={(schedule) => {
              console.log('Schedule created:', schedule);
              // Switch back to tests tab after scheduling
              if (selectedTests.length === 0) {
                setActiveTab('tests');
              }
            }}
          />
        </div>
      )}
    </div>
  );
}