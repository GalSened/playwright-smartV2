import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/app/store';
import { api } from '@/app/api';
import { Loading, TableSkeleton } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Table } from '@/components/Table';
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
  Users
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
  const [suiteName, setSuiteName] = useState('');
  const [suiteDescription, setSuiteDescription] = useState('');
  const [runningTests, setRunningTests] = useState<string[]>([]);

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
      
      return matchesSearch && matchesModule && matchesRisk;
    });
  }, [tests, searchQuery, moduleFilter, riskFilter]);

  // Get unique modules for filter
  const modules = useMemo(() => {
    return [...new Set(tests.map(test => test.module))];
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
      const newSuite = await api.createSuite({
        name: suiteName,
        description: suiteDescription,
        testIds: selectedTests,
        tags: [],
      });
      
      addSuite(newSuite);
      setSuiteName('');
      setSuiteDescription('');
      clearSelection();
      
      // Show success message (in real app would use toast)
      console.log('Suite created successfully');
    } catch (error) {
      console.error('Failed to create suite:', error);
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
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1" data-testid="test-tags">
          {row.original.tags.map((tag) => (
            <span 
              key={tag}
              className="status-badge bg-accent text-accent-foreground text-xs"
            >
              {tag}
            </span>
          ))}
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

  return (
    <div data-testid="test-bank-page">
      <h1 className="text-3xl font-bold mb-8" data-testid="page-title">Test Bank</h1>
      
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
                
                {(searchQuery || moduleFilter || riskFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setModuleFilter('');
                      setRiskFilter('');
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
                          <div>
                            <h4 className="font-medium" data-testid="suite-name">
                              {suite.name}
                            </h4>
                            {suite.description && (
                              <p className="text-sm text-muted-foreground">
                                {suite.description}
                              </p>
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
    </div>
  );
}