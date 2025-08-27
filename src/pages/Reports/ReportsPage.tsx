import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/app/store';
import { api } from '@/app/api';
import { Loading, TableSkeleton } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Table } from '@/components/Table';
import { formatDuration, formatRelativeTime, getStatusColor, calculatePassRate } from '@/app/utils';
import type { ColumnDef } from '@tanstack/react-table';
import type { RunRecord, RunStep } from '@/app/types';
import { 
  FileText, 
  Search, 
  Filter,
  Eye,
  Play,
  Download,
  ChevronDown,
  ChevronRight,
  X,
  AlertCircle,
  CheckCircle,
  Clock,
  Image,
  FileVideo,
  FileType
} from 'lucide-react';

export function ReportsPage() {
  const { 
    runs, 
    selectedRun,
    loading,
    setRuns,
    setSelectedRun,
    setLoading 
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [environmentFilter, setEnvironmentFilter] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'steps' | 'artifacts'>('overview');

  // Load runs data on mount
  useEffect(() => {
    async function loadRuns() {
      setLoading('runs', true);
      try {
        const runsData = await api.getRuns();
        setRuns(runsData);
      } catch (error) {
        console.error('Failed to load runs:', error);
      } finally {
        setLoading('runs', false);
      }
    }

    loadRuns();
  }, [setRuns, setLoading]);

  // Filter runs based on search and filters
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      const matchesSearch = searchQuery === '' || 
        run.suiteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = statusFilter === '' || run.status === statusFilter;
      const matchesEnvironment = environmentFilter === '' || run.environment === environmentFilter;
      
      return matchesSearch && matchesStatus && matchesEnvironment;
    });
  }, [runs, searchQuery, statusFilter, environmentFilter]);

  // Get unique environments for filter
  const environments = useMemo(() => {
    return [...new Set(runs.map(run => run.environment))];
  }, [runs]);

  // Get selected run details
  const selectedRunDetails = useMemo(() => {
    return runs.find(run => run.id === selectedRun);
  }, [runs, selectedRun]);

  // Toggle step expansion
  const toggleStepExpansion = (stepId: string) => {
    const newExpanded = new Set(expandedSteps);
    if (newExpanded.has(stepId)) {
      newExpanded.delete(stepId);
    } else {
      newExpanded.add(stepId);
    }
    setExpandedSteps(newExpanded);
  };

  // Handle artifact download (mock)
  const handleDownloadArtifact = (artifactId: string, artifactName: string) => {
    console.log(`Downloading artifact: ${artifactName}`);
    // In real app, would trigger actual download
  };

  // Handle artifact preview (mock)
  const handlePreviewArtifact = (artifactId: string, artifactName: string) => {
    console.log(`Previewing artifact: ${artifactName}`);
    // In real app, would open preview modal
  };

  // Table columns definition
  const columns: ColumnDef<RunRecord>[] = [
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <span 
          className={`status-badge ${getStatusColor(row.original.status)}`}
          data-testid="run-status-badge"
        >
          {row.original.status === 'passed' && <CheckCircle className="h-3 w-3 mr-1" />}
          {row.original.status === 'failed' && <AlertCircle className="h-3 w-3 mr-1" />}
          {row.original.status === 'running' && <Clock className="h-3 w-3 mr-1" />}
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: 'suiteName',
      header: 'Suite',
      cell: ({ row }) => (
        <button
          onClick={() => setSelectedRun(row.original.id)}
          className="text-left hover:underline font-medium"
          data-testid="run-suite-name"
        >
          {row.original.suiteName}
        </button>
      ),
    },
    {
      accessorKey: 'environment',
      header: 'Environment',
      cell: ({ row }) => (
        <span 
          className="status-badge bg-secondary text-secondary-foreground"
          data-testid="run-environment"
        >
          {row.original.environment}
        </span>
      ),
    },
    {
      accessorKey: 'startedAt',
      header: 'Started At',
      cell: ({ row }) => (
        <div data-testid="run-started-at">
          <div className="font-medium">
            {formatRelativeTime(row.original.startedAt)}
          </div>
          <div className="text-xs text-muted-foreground">
            {new Date(row.original.startedAt).toLocaleString()}
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'duration',
      header: 'Duration',
      cell: ({ row }) => (
        <div data-testid="run-duration">
          {row.original.duration ? formatDuration(row.original.duration) : '-'}
        </div>
      ),
    },
    {
      accessorKey: 'totals',
      header: 'Results',
      cell: ({ row }) => {
        const { passed, failed, total } = row.original.totals;
        const passRate = calculatePassRate(passed, total);
        
        return (
          <div className="space-y-1" data-testid="run-results-bar">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-green-600" data-testid="run-passed-count">{passed}</span>
              <span className="text-red-600" data-testid="run-failed-count">{failed}</span>
              <span className="text-muted-foreground" data-testid="run-total-count">/{total}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${passed === total ? 'bg-green-500' : 'bg-gradient-to-r from-green-500 to-red-500'}`}
                style={{ width: `${(passed / total) * 100}%` }}
              />
            </div>
          </div>
        );
      },
      enableSorting: false,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex gap-1" data-testid="run-actions">
          <button
            onClick={() => setSelectedRun(row.original.id)}
            className="button button-outline px-2 py-1 text-xs flex items-center gap-1"
            data-testid="view-run-details"
          >
            <Eye className="h-3 w-3" />
            View
          </button>
          <button
            className="button button-outline px-2 py-1 text-xs flex items-center gap-1"
            data-testid="rerun-suite"
          >
            <Play className="h-3 w-3" />
            Rerun
          </button>
          <button
            className="button button-outline px-2 py-1 text-xs flex items-center gap-1"
            data-testid="export-run"
          >
            <Download className="h-3 w-3" />
            Export
          </button>
        </div>
      ),
      enableSorting: false,
    },
  ];

  if (loading.runs) {
    return (
      <div data-testid="reports-page">
        <h1 className="text-3xl font-bold mb-8" data-testid="page-title">Reports</h1>
        <TableSkeleton rows={8} />
      </div>
    );
  }

  return (
    <div data-testid="reports-page" className="space-y-6">
      <h1 className="text-3xl font-bold" data-testid="page-title">Reports</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runs Table Section */}
        <div className={`${selectedRunDetails ? 'lg:col-span-2' : 'lg:col-span-3'}`} data-testid="runs-table-section">
          <Card>
            <CardHeader>
              <CardTitle>Test Runs</CardTitle>
              
              {/* Filters & Search */}
              <div className="flex flex-wrap gap-4" data-testid="filters-bar">
                <div className="flex-1 min-w-64">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search runs..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input pl-10"
                      data-testid="runs-search"
                    />
                  </div>
                </div>
                
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="input w-32"
                  data-testid="filter-status"
                >
                  <option value="">All Status</option>
                  <option value="passed">Passed</option>
                  <option value="failed">Failed</option>
                  <option value="running">Running</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                
                <select
                  value={environmentFilter}
                  onChange={(e) => setEnvironmentFilter(e.target.value)}
                  className="input w-40"
                  data-testid="filter-environment"
                >
                  <option value="">All Environments</option>
                  {environments.map(env => (
                    <option key={env} value={env}>{env}</option>
                  ))}
                </select>
                
                {(searchQuery || statusFilter || environmentFilter) && (
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setStatusFilter('');
                      setEnvironmentFilter('');
                    }}
                    className="button button-outline px-3 py-2 flex items-center gap-1"
                    data-testid="clear-all-filters"
                  >
                    <X className="h-4 w-4" />
                    Clear
                  </button>
                )}
              </div>
            </CardHeader>
            
            <CardContent>
              {filteredRuns.length === 0 ? (
                <EmptyState
                  icon={FileText}
                  title="No test runs found"
                  description="No runs match your current filters. Try adjusting your search criteria."
                />
              ) : (
                <Table
                  columns={columns}
                  data={filteredRuns}
                  testId="runs-table"
                  onRowClick={(run) => setSelectedRun(run.id)}
                />
              )}
            </CardContent>
          </Card>
        </div>

        {/* Run Details Panel */}
        {selectedRunDetails && (
          <div className="lg:col-span-1" data-testid="run-details-panel">
            <Card data-testid="run-details-container">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg" data-testid="run-details-header">
                    Run Details
                  </CardTitle>
                  <button
                    onClick={() => setSelectedRun(null)}
                    className="text-muted-foreground hover:text-foreground"
                    data-testid="close-details"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                
                {/* Tabs */}
                <div className="flex border-b">
                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-2 text-sm font-medium border-b-2 ${
                      activeTab === 'overview' 
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    Overview
                  </button>
                  <button
                    onClick={() => setActiveTab('steps')}
                    className={`px-3 py-2 text-sm font-medium border-b-2 ${
                      activeTab === 'steps'
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    role="tab"
                    aria-label="Test Steps"
                  >
                    Test Steps
                  </button>
                  <button
                    onClick={() => setActiveTab('artifacts')}
                    className={`px-3 py-2 text-sm font-medium border-b-2 ${
                      activeTab === 'artifacts'
                        ? 'border-primary text-primary' 
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                    role="tab"
                    aria-label="Artifacts"
                  >
                    Artifacts
                  </button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div data-testid="run-overview-section">
                    <div className="space-y-4">
                      <Card data-testid="run-summary-card">
                        <CardContent className="pt-4">
                          <div className="space-y-3">
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Status:</span>
                              <span className={`status-badge ${getStatusColor(selectedRunDetails.status)}`}>
                                {selectedRunDetails.status}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Suite:</span>
                              <span className="text-sm font-medium">{selectedRunDetails.suiteName}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Environment:</span>
                              <span className="text-sm">{selectedRunDetails.environment}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Duration:</span>
                              <span className="text-sm">
                                {selectedRunDetails.duration ? formatDuration(selectedRunDetails.duration) : '-'}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-muted-foreground">Results:</span>
                              <span className="text-sm">
                                {selectedRunDetails.totals.passed}/{selectedRunDetails.totals.total} passed
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <div data-testid="run-timeline">
                        <h4 className="font-medium mb-2">Timeline</h4>
                        <div className="text-sm space-y-1">
                          <div>Started: {new Date(selectedRunDetails.startedAt).toLocaleString()}</div>
                          {selectedRunDetails.finishedAt && (
                            <div>Finished: {new Date(selectedRunDetails.finishedAt).toLocaleString()}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Steps Tab */}
                {activeTab === 'steps' && (
                  <div data-testid="run-steps-section">
                    {selectedRunDetails.steps && selectedRunDetails.steps.length > 0 ? (
                      <div className="space-y-3" data-testid="steps-list">
                        {selectedRunDetails.steps.map((step) => (
                          <div key={step.id} className="border rounded-lg" data-testid="step-item">
                            <div 
                              className="p-3 cursor-pointer hover:bg-muted/50"
                              onClick={() => toggleStepExpansion(step.id)}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {expandedSteps.has(step.id) ? (
                                    <ChevronDown className="h-4 w-4" data-testid="expand-step" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4" data-testid="expand-step" />
                                  )}
                                  <span 
                                    className={`status-badge ${getStatusColor(step.status)}`}
                                    data-testid="step-status"
                                  >
                                    {step.status}
                                  </span>
                                  <span className="font-medium" data-testid="step-name">
                                    {step.testName}
                                  </span>
                                </div>
                                <span className="text-sm text-muted-foreground" data-testid="step-duration">
                                  {step.duration ? formatDuration(step.duration) : '-'}
                                </span>
                              </div>
                            </div>
                            
                            {expandedSteps.has(step.id) && (
                              <div className="p-3 pt-0 space-y-3" data-testid="step-details">
                                {step.errorMessage && (
                                  <div data-testid="step-error-message">
                                    <h5 className="font-medium text-red-600 mb-1">Error</h5>
                                    <p className="text-sm bg-red-50 p-2 rounded text-red-800">
                                      {step.errorMessage}
                                    </p>
                                  </div>
                                )}
                                
                                {step.logs && step.logs.length > 0 && (
                                  <div data-testid="step-logs">
                                    <h5 className="font-medium mb-1">Logs</h5>
                                    <div className="text-xs bg-muted p-2 rounded font-mono max-h-32 overflow-y-auto">
                                      {step.logs.map((log, index) => (
                                        <div key={index}>{log}</div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {step.screenshots && step.screenshots.length > 0 && (
                                  <div data-testid="step-screenshots">
                                    <h5 className="font-medium mb-1">Screenshots</h5>
                                    <div className="flex flex-wrap gap-2">
                                      {step.screenshots.map((screenshot, index) => (
                                        <div key={index} className="w-16 h-12 bg-muted rounded flex items-center justify-center">
                                          <Image className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <EmptyState
                        icon={Clock}
                        title="No step details"
                        description="Step details are not available for this run."
                      />
                    )}
                  </div>
                )}

                {/* Artifacts Tab */}
                {activeTab === 'artifacts' && (
                  <div data-testid="run-artifacts-section">
                    {selectedRunDetails.steps?.some(step => step.artifacts && step.artifacts.length > 0) ? (
                      <div className="space-y-3" data-testid="artifacts-gallery">
                        {selectedRunDetails.steps
                          .filter(step => step.artifacts && step.artifacts.length > 0)
                          .map(step => 
                            step.artifacts!.map(artifact => (
                              <div key={artifact.id} className="border rounded-lg p-3" data-testid="artifact-item">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    {artifact.type === 'screenshot' && <Image className="h-4 w-4" />}
                                    {artifact.type === 'video' && <FileVideo className="h-4 w-4" />}
                                    {(artifact.type === 'log' || artifact.type === 'report') && <FileType className="h-4 w-4" />}
                                    <div>
                                      <div className="font-medium" data-testid="artifact-name">
                                        {artifact.name}
                                      </div>
                                      <div className="text-xs text-muted-foreground">
                                        <span 
                                          className="status-badge bg-secondary text-secondary-foreground mr-2"
                                          data-testid="artifact-type"
                                        >
                                          {artifact.type}
                                        </span>
                                        {artifact.size && (
                                          <span data-testid="artifact-size">
                                            {(artifact.size / 1024).toFixed(1)} KB
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex gap-1">
                                    {artifact.type === 'screenshot' && (
                                      <button
                                        onClick={() => handlePreviewArtifact(artifact.id, artifact.name)}
                                        className="button button-outline px-2 py-1 text-xs"
                                        data-testid="preview-artifact"
                                      >
                                        <Eye className="h-3 w-3" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDownloadArtifact(artifact.id, artifact.name)}
                                      className="button button-outline px-2 py-1 text-xs"
                                      data-testid="download-artifact"
                                    >
                                      <Download className="h-3 w-3" />
                                    </button>
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                      </div>
                    ) : (
                      <EmptyState
                        icon={FileText}
                        title="No artifacts"
                        description="No artifacts were generated for this run."
                      />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}