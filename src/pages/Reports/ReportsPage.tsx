import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/app/store';
import { api } from '@/app/api';
import { Loading, TableSkeleton } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Table } from '@/components/Table';
import { Stat } from '@/components/Stat';
import { LineChartComponent, BarChartComponent } from '@/components/Chart';
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
  FileType,
  Brain,
  Target,
  TrendingUp,
  BarChart3,
  RefreshCw,
  Calendar,
  Hash
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
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [passRateFilter, setPassRateFilter] = useState({ min: 0, max: 100 });
  const [durationFilter, setDurationFilter] = useState('');
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<'overview' | 'steps' | 'artifacts'>('overview');
  
  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [showTrends, setShowTrends] = useState(true);
  
  // Real-time reports state
  const [recentExecutions, setRecentExecutions] = useState<any[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Load runs data and analytics on mount
  useEffect(() => {
    async function loadReportsData() {
      // Load runs data
      setLoading('runs', true);
      try {
        const runsData = await api.getRuns();
        setRuns(runsData);
      } catch (error) {
        console.error('Failed to load runs:', error);
      } finally {
        setLoading('runs', false);
      }

      // Load analytics data
      if (showAnalytics) {
        setAnalyticsLoading(true);
        try {
          const response = await fetch('http://localhost:8081/api/analytics/smart');
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          const analytics = await response.json();
          setAnalyticsData(analytics);
          console.log('Analytics data loaded for Reports page:', {
            totalTests: analytics.summary.totalTests,
            healthScore: analytics.summary.healthScore,
            coverage: analytics.summary.overallCoverage
          });
        } catch (error) {
          console.warn('Analytics data not available:', error);
          setAnalyticsData(null);
        } finally {
          setAnalyticsLoading(false);
        }
      }

      // Load recent executions from backend
      setReportsLoading(true);
      try {
        const response = await fetch('http://localhost:8081/api/reports/summary');
        if (response.ok) {
          const data = await response.json();
          setRecentExecutions(data.executions || []);
          console.log('Recent executions loaded:', data.executions?.length || 0);
        }
      } catch (error) {
        console.warn('Failed to load recent executions:', error);
      } finally {
        setReportsLoading(false);
      }
    }

    loadReportsData();
  }, [setRuns, setLoading, showAnalytics]);

  // Filter runs based on search and enhanced filters
  const filteredRuns = useMemo(() => {
    return runs.filter((run) => {
      // Text search
      const matchesSearch = searchQuery === '' || 
        run.suiteName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        run.id.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Status filter
      const matchesStatus = statusFilter === '' || run.status === statusFilter;
      
      // Environment filter
      const matchesEnvironment = environmentFilter === '' || run.environment === environmentFilter;
      
      // Date range filter
      const runDate = new Date(run.startedAt);
      const matchesDateRange = (
        (dateRange.start === '' || runDate >= new Date(dateRange.start)) &&
        (dateRange.end === '' || runDate <= new Date(dateRange.end + 'T23:59:59'))
      );
      
      // Pass rate filter
      const passRate = run.totals.total > 0 ? (run.totals.passed / run.totals.total) * 100 : 0;
      const matchesPassRate = passRate >= passRateFilter.min && passRate <= passRateFilter.max;
      
      // Duration filter
      const matchesDuration = (() => {
        if (durationFilter === '' || !run.duration) return true;
        const durationMinutes = run.duration / 60000; // Convert to minutes
        switch (durationFilter) {
          case 'short': return durationMinutes < 5;
          case 'medium': return durationMinutes >= 5 && durationMinutes < 15;
          case 'long': return durationMinutes >= 15;
          default: return true;
        }
      })();
      
      return matchesSearch && matchesStatus && matchesEnvironment && 
             matchesDateRange && matchesPassRate && matchesDuration;
    });
  }, [runs, searchQuery, statusFilter, environmentFilter, dateRange, passRateFilter, durationFilter]);

  // Get unique environments for filter
  const environments = useMemo(() => {
    return [...new Set(runs.map(run => run.environment))];
  }, [runs]);

  // Get selected run details
  const selectedRunDetails = useMemo(() => {
    return runs.find(run => run.id === selectedRun);
  }, [runs, selectedRun]);

  // Calculate trend data for charts
  const trendData = useMemo(() => {
    if (filteredRuns.length === 0) return [];
    
    // Group runs by date and calculate daily metrics
    const runsByDate = filteredRuns.reduce((acc, run) => {
      const date = new Date(run.startedAt).toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { runs: [], totalTests: 0, passedTests: 0, totalDuration: 0 };
      }
      acc[date].runs.push(run);
      acc[date].totalTests += run.totals.total;
      acc[date].passedTests += run.totals.passed;
      acc[date].totalDuration += run.duration || 0;
      return acc;
    }, {} as Record<string, any>);

    // Convert to chart data format
    return Object.entries(runsByDate)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-14) // Last 14 days
      .map(([date, data]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        runCount: data.runs.length,
        passRate: data.totalTests > 0 ? Math.round((data.passedTests / data.totalTests) * 100) : 0,
        avgDuration: data.runs.length > 0 ? Math.round(data.totalDuration / data.runs.length / 1000) : 0, // Convert to seconds
        passed: data.passedTests,
        failed: data.totalTests - data.passedTests
      }));
  }, [filteredRuns]);

  // Calculate status distribution for pie chart
  const statusDistribution = useMemo(() => {
    const statusCounts = filteredRuns.reduce((acc, run) => {
      acc[run.status] = (acc[run.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors = {
      passed: '#10b981', // green-500
      failed: '#ef4444', // red-500
      running: '#3b82f6', // blue-500
      cancelled: '#6b7280' // gray-500
    };

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.charAt(0).toUpperCase() + status.slice(1),
      value: count,
      color: colors[status as keyof typeof colors] || '#6b7280'
    }));
  }, [filteredRuns]);

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

  // Handle viewing Allure report
  const handleViewAllureReport = (runId: string) => {
    const reportUrl = `http://localhost:8081/api/reports/allure/${runId}`;
    window.open(reportUrl, '_blank');
  };

  // Handle refreshing reports data
  const handleRefreshReports = async () => {
    setReportsLoading(true);
    try {
      // Reload runs data
      const runsData = await api.getRuns();
      setRuns(runsData);
      
      // Reload recent executions
      const response = await fetch('http://localhost:8081/api/reports/summary');
      if (response.ok) {
        const data = await response.json();
        setRecentExecutions(data.executions || []);
      }
      
      console.log('Reports data refreshed');
    } catch (error) {
      console.error('Failed to refresh reports:', error);
    } finally {
      setReportsLoading(false);
    }
  };

  // Export functionality
  const handleExportCSV = () => {
    const headers = ['Run ID', 'Suite Name', 'Status', 'Environment', 'Started At', 'Duration (s)', 'Pass Rate %', 'Passed', 'Failed', 'Total'];
    const csvData = filteredRuns.map(run => [
      run.id,
      run.suiteName,
      run.status,
      run.environment,
      new Date(run.startedAt).toISOString(),
      run.duration ? Math.round(run.duration / 1000) : 0,
      run.totals.total > 0 ? Math.round((run.totals.passed / run.totals.total) * 100) : 0,
      run.totals.passed,
      run.totals.failed,
      run.totals.total
    ]);
    
    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `test-reports-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportJSON = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      filterCriteria: {
        searchQuery: searchQuery || 'none',
        statusFilter: statusFilter || 'all',
        environmentFilter: environmentFilter || 'all',
        dateRange: dateRange.start || dateRange.end ? dateRange : 'all time',
        passRateFilter: passRateFilter.min > 0 ? `${passRateFilter.min}%+` : 'all',
        durationFilter: durationFilter || 'all'
      },
      summary: {
        totalRuns: filteredRuns.length,
        passedRuns: filteredRuns.filter(r => r.status === 'passed').length,
        failedRuns: filteredRuns.filter(r => r.status === 'failed').length,
        overallPassRate: filteredRuns.length > 0 ? 
          Math.round((filteredRuns.filter(r => r.status === 'passed').length / filteredRuns.length) * 100) : 0
      },
      runs: filteredRuns.map(run => ({
        ...run,
        exportNotes: {
          passRate: run.totals.total > 0 ? Math.round((run.totals.passed / run.totals.total) * 100) : 0,
          durationMinutes: run.duration ? Math.round(run.duration / 60000 * 100) / 100 : 0
        }
      }))
    };
    
    const jsonContent = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `test-reports-${new Date().toISOString().split('T')[0]}.json`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleExportPDF = async () => {
    // Create a simple HTML report that can be printed/saved as PDF
    const reportHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Test Execution Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
          h2 { color: #4b5563; margin-top: 30px; }
          .summary { background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-item { display: inline-block; margin-right: 30px; }
          table { border-collapse: collapse; width: 100%; margin-top: 20px; }
          th, td { border: 1px solid #d1d5db; padding: 12px 8px; text-align: left; }
          th { background: #f9fafb; font-weight: bold; }
          .status-passed { color: #059669; font-weight: bold; }
          .status-failed { color: #dc2626; font-weight: bold; }
          .status-running { color: #2563eb; font-weight: bold; }
          .page-break { page-break-after: always; }
        </style>
      </head>
      <body>
        <h1>Test Execution Report</h1>
        <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
        
        <div class="summary">
          <h2>Executive Summary</h2>
          <div class="summary-item"><strong>Total Runs:</strong> ${filteredRuns.length}</div>
          <div class="summary-item"><strong>Passed:</strong> ${filteredRuns.filter(r => r.status === 'passed').length}</div>
          <div class="summary-item"><strong>Failed:</strong> ${filteredRuns.filter(r => r.status === 'failed').length}</div>
          <div class="summary-item"><strong>Pass Rate:</strong> ${filteredRuns.length > 0 ? Math.round((filteredRuns.filter(r => r.status === 'passed').length / filteredRuns.length) * 100) : 0}%</div>
        </div>
        
        ${analyticsData ? `
          <h2>Analytics Insights</h2>
          <div class="summary">
            <div class="summary-item"><strong>Total Tests:</strong> ${analyticsData.summary.totalTests}</div>
            <div class="summary-item"><strong>Health Score:</strong> ${analyticsData.summary.healthScore}%</div>
            <div class="summary-item"><strong>Coverage:</strong> ${analyticsData.summary.overallCoverage}%</div>
          </div>
        ` : ''}
        
        <h2>Detailed Run Results</h2>
        <table>
          <thead>
            <tr>
              <th>Suite Name</th>
              <th>Status</th>
              <th>Environment</th>
              <th>Started At</th>
              <th>Duration</th>
              <th>Pass Rate</th>
              <th>Results</th>
            </tr>
          </thead>
          <tbody>
            ${filteredRuns.map(run => `
              <tr>
                <td>${run.suiteName}</td>
                <td class="status-${run.status}">${run.status.toUpperCase()}</td>
                <td>${run.environment}</td>
                <td>${new Date(run.startedAt).toLocaleString()}</td>
                <td>${run.duration ? formatDuration(run.duration) : '-'}</td>
                <td>${run.totals.total > 0 ? Math.round((run.totals.passed / run.totals.total) * 100) : 0}%</td>
                <td>${run.totals.passed}/${run.totals.total}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div style="margin-top: 50px; text-align: center; color: #6b7280; font-size: 12px;">
          <p>Report generated by QA Intelligence Platform</p>
        </div>
      </body>
      </html>
    `;
    
    const blob = new Blob([reportHtml], { type: 'text/html;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `test-reports-${new Date().toISOString().split('T')[0]}.html`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Open in new window for printing
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(reportHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
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
            onClick={() => handleViewAllureReport(row.original.id)}
            className="button button-primary px-2 py-1 text-xs flex items-center gap-1"
            data-testid="view-allure-report"
            title="Open Allure Report in new tab"
          >
            <FileText className="h-3 w-3" />
            Report
          </button>
          <button
            className="button button-outline px-2 py-1 text-xs flex items-center gap-1"
            data-testid="rerun-suite"
          >
            <Play className="h-3 w-3" />
            Rerun
          </button>
          <div className="relative group">
            <button
              className="button button-outline px-2 py-1 text-xs flex items-center gap-1"
              data-testid="export-run-dropdown"
            >
              <Download className="h-3 w-3" />
              <ChevronDown className="h-3 w-3" />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10 hidden group-hover:block min-w-32">
              <button
                onClick={() => handleExportJSON()}
                className="block w-full text-left px-3 py-2 text-xs hover:bg-gray-50"
                data-testid="export-single-json"
              >
                Export JSON
              </button>
            </div>
          </div>
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold" data-testid="page-title">Reports</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefreshReports}
            disabled={reportsLoading}
            className="button button-outline px-3 py-2 text-sm flex items-center gap-2"
            data-testid="refresh-reports"
            title="Refresh reports data"
          >
            <RefreshCw className={`h-4 w-4 ${reportsLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className={`button ${showAnalytics ? 'button-primary' : 'button-outline'} px-3 py-2 text-sm flex items-center gap-2`}
            data-testid="toggle-analytics"
          >
            <Brain className="h-4 w-4" />
            {showAnalytics ? 'Hide' : 'Show'} Analytics
          </button>
        </div>
      </div>

      {/* Analytics Overview Cards */}
      {showAnalytics && analyticsData && (
        <div data-testid="reports-analytics-overview" className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Test Intelligence Overview</h2>
            {analyticsLoading && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card data-testid="analytics-total-tests">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Tests</p>
                    <p className="text-2xl font-bold">{analyticsData.summary.totalTests}</p>
                    <p className="text-xs text-muted-foreground">
                      {analyticsData.summary.totalModules} modules
                    </p>
                  </div>
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Hash className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="analytics-health-score">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Health Score</p>
                    <p className="text-2xl font-bold">{analyticsData.summary.healthScore}%</p>
                    <p className="text-xs text-muted-foreground">
                      System reliability
                    </p>
                  </div>
                  <div className={`p-2 rounded-lg ${
                    analyticsData.summary.healthScore >= 80 
                      ? 'bg-green-100' 
                      : analyticsData.summary.healthScore >= 60 
                        ? 'bg-yellow-100' 
                        : 'bg-red-100'
                  }`}>
                    <Target className={`h-5 w-5 ${
                      analyticsData.summary.healthScore >= 80 
                        ? 'text-green-600' 
                        : analyticsData.summary.healthScore >= 60 
                          ? 'text-yellow-600' 
                          : 'text-red-600'
                    }`} />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="analytics-coverage">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Overall Coverage</p>
                    <p className="text-2xl font-bold">{analyticsData.summary.overallCoverage}%</p>
                    <p className="text-xs text-muted-foreground">
                      Test coverage
                    </p>
                  </div>
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Target className="h-5 w-5 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card data-testid="analytics-runs-summary">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Runs</p>
                    <p className="text-2xl font-bold">{runs.length}</p>
                    <p className="text-xs text-muted-foreground">
                      {runs.filter(r => r.status === 'passed').length} passed
                    </p>
                  </div>
                  <div className="p-2 bg-orange-100 rounded-lg">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Analytics Insights */}
          {analyticsData.risks && analyticsData.risks.length > 0 && (
            <Card className="mt-4" data-testid="analytics-insights">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Brain className="h-4 w-4 text-purple-500" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {analyticsData.risks.slice(0, 4).map((risk: any, index: number) => (
                    <div key={index} className="p-3 bg-muted/50 rounded-lg" data-testid="insight-item">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`status-badge ${
                              risk.level === 'critical' ? 'bg-red-100 text-red-800' :
                              risk.level === 'high' ? 'bg-orange-100 text-orange-800' :
                              'bg-yellow-100 text-yellow-800'
                            } text-xs`}>
                              {risk.level.toUpperCase()}
                            </span>
                          </div>
                          <p className="text-sm font-medium">{risk.area}</p>
                          <p className="text-xs text-muted-foreground mt-1">{risk.description}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Trend Analysis Charts */}
      {showTrends && trendData.length > 0 && (
        <div data-testid="reports-trend-analysis" className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold">Trend Analysis</h2>
            </div>
            <button
              onClick={() => setShowTrends(!showTrends)}
              className="button button-outline px-2 py-1 text-xs flex items-center gap-1"
              data-testid="toggle-trends"
            >
              {showTrends ? <X className="h-3 w-3" /> : <BarChart3 className="h-3 w-3" />}
              {showTrends ? 'Hide' : 'Show'}
            </button>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pass Rate Trend */}
            <Card data-testid="trend-pass-rate">
              <CardHeader>
                <CardTitle className="text-base">Pass Rate Trend (Last 14 Days)</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChartComponent
                  data={trendData}
                  xKey="date"
                  lines={[
                    { key: 'passRate', color: '#10b981', name: 'Pass Rate %' }
                  ]}
                  testId="pass-rate-trend-chart"
                />
              </CardContent>
            </Card>

            {/* Execution Volume Trend */}
            <Card data-testid="trend-execution-volume">
              <CardHeader>
                <CardTitle className="text-base">Test Execution Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <BarChartComponent
                  data={trendData}
                  xKey="date"
                  yKey="runCount"
                  testId="execution-volume-chart"
                />
              </CardContent>
            </Card>

            {/* Duration Trend */}
            <Card data-testid="trend-duration">
              <CardHeader>
                <CardTitle className="text-base">Average Duration Trend (seconds)</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChartComponent
                  data={trendData}
                  xKey="date"
                  lines={[
                    { key: 'avgDuration', color: '#f59e0b', name: 'Avg Duration (s)' }
                  ]}
                  testId="duration-trend-chart"
                />
              </CardContent>
            </Card>

            {/* Pass/Fail Distribution */}
            <Card data-testid="trend-pass-fail">
              <CardHeader>
                <CardTitle className="text-base">Pass/Fail Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <LineChartComponent
                  data={trendData}
                  xKey="date"
                  lines={[
                    { key: 'passed', color: '#10b981', name: 'Passed' },
                    { key: 'failed', color: '#ef4444', name: 'Failed' }
                  ]}
                  testId="pass-fail-distribution-chart"
                />
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Runs Table Section */}
        <div className={`${selectedRunDetails ? 'lg:col-span-2' : 'lg:col-span-3'}`} data-testid="runs-table-section">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Test Runs</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative group">
                    <button
                      className="button button-primary px-3 py-2 text-sm flex items-center gap-2"
                      data-testid="bulk-export-dropdown"
                    >
                      <Download className="h-4 w-4" />
                      Export All
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-20 hidden group-hover:block min-w-40">
                      <button
                        onClick={handleExportCSV}
                        className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b"
                        data-testid="export-csv"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <div>
                            <div className="font-medium">CSV Export</div>
                            <div className="text-xs text-muted-foreground">Tabular data format</div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={handleExportJSON}
                        className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50 border-b"
                        data-testid="export-json"
                      >
                        <div className="flex items-center gap-2">
                          <FileType className="h-4 w-4" />
                          <div>
                            <div className="font-medium">JSON Export</div>
                            <div className="text-xs text-muted-foreground">Structured data format</div>
                          </div>
                        </div>
                      </button>
                      <button
                        onClick={handleExportPDF}
                        className="block w-full text-left px-4 py-3 text-sm hover:bg-gray-50"
                        data-testid="export-pdf"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <div>
                            <div className="font-medium">PDF Report</div>
                            <div className="text-xs text-muted-foreground">Formatted report</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Enhanced Filters & Search */}
              <div className="space-y-4" data-testid="enhanced-filters-section">
                {/* Primary Filters Row */}
                <div className="flex flex-wrap gap-4" data-testid="primary-filters">
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
                </div>

                {/* Advanced Filters Row */}
                <div className="flex flex-wrap gap-4 items-center" data-testid="advanced-filters">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Date Range:</span>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="input w-36 text-sm"
                      data-testid="filter-date-start"
                    />
                    <span className="text-sm text-muted-foreground">to</span>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="input w-36 text-sm"
                      data-testid="filter-date-end"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Pass Rate:</span>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={passRateFilter.min}
                      onChange={(e) => setPassRateFilter(prev => ({ ...prev, min: parseInt(e.target.value) }))}
                      className="w-16"
                      data-testid="filter-pass-rate-min"
                    />
                    <span className="text-xs text-muted-foreground w-12">{passRateFilter.min}%+</span>
                  </div>

                  <select
                    value={durationFilter}
                    onChange={(e) => setDurationFilter(e.target.value)}
                    className="input w-32 text-sm"
                    data-testid="filter-duration"
                  >
                    <option value="">All Durations</option>
                    <option value="short">Short (&lt; 5 min)</option>
                    <option value="medium">Medium (5-15 min)</option>
                    <option value="long">Long (&gt; 15 min)</option>
                  </select>

                  {(searchQuery || statusFilter || environmentFilter || 
                    dateRange.start || dateRange.end || passRateFilter.min > 0 || 
                    durationFilter) && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('');
                        setEnvironmentFilter('');
                        setDateRange({ start: '', end: '' });
                        setPassRateFilter({ min: 0, max: 100 });
                        setDurationFilter('');
                      }}
                      className="button button-outline px-3 py-2 flex items-center gap-1 text-sm"
                      data-testid="clear-all-filters"
                    >
                      <X className="h-4 w-4" />
                      Clear All
                    </button>
                  )}
                </div>

                {/* Filter Status Summary */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground" data-testid="filter-summary">
                  <span>Showing {filteredRuns.length} of {runs.length} runs</span>
                  {filteredRuns.length > 0 && (
                    <span>
                      Pass Rate: {Math.round((filteredRuns.filter(r => r.status === 'passed').length / filteredRuns.length) * 100)}%
                    </span>
                  )}
                </div>
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