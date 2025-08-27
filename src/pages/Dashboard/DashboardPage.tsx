import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/app/store';
import { api } from '@/app/api';
import { Loading } from '@/components/Loading';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Stat } from '@/components/Stat';
import { EmptyState } from '@/components/EmptyState';
import { formatRelativeTime, getStatusColor } from '@/app/utils';
import { 
  TestTube, 
  Users, 
  Activity, 
  Play,
  FileText,
  Plus,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';

export function DashboardPage() {
  const navigate = useNavigate();
  const { 
    dashboard, 
    setDashboard, 
    loading, 
    setLoading 
  } = useAppStore();

  useEffect(() => {
    async function loadDashboard() {
      setLoading('dashboard', true);
      try {
        const data = await api.getDashboard();
        setDashboard(data);
      } catch (error) {
        console.error('Failed to load dashboard:', error);
      } finally {
        setLoading('dashboard', false);
      }
    }

    loadDashboard();
  }, [setDashboard, setLoading]);

  if (loading.dashboard) {
    return (
      <div data-testid="dashboard-page">
        <h1 className="text-3xl font-bold mb-8" data-testid="page-title">Dashboard</h1>
        <Loading text="Loading dashboard..." />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div data-testid="dashboard-page">
        <h1 className="text-3xl font-bold mb-8" data-testid="page-title">Dashboard</h1>
        <EmptyState
          icon={AlertCircle}
          title="Dashboard Unavailable"
          description="Unable to load dashboard data. Please try again later."
          action={{
            label: "Retry",
            onClick: () => window.location.reload()
          }}
        />
      </div>
    );
  }

  return (
    <div data-testid="dashboard-page">
      <h1 className="text-3xl font-bold mb-8" data-testid="page-title">Dashboard</h1>
      
      {/* Environment Status */}
      <div className="mb-8">
        <Card data-testid="environment-status">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {dashboard.environmentStatus === 'healthy' && 
                <CheckCircle className="h-5 w-5 text-green-600" data-testid="environment-status-healthy" />
              }
              {dashboard.environmentStatus === 'warning' && 
                <AlertCircle className="h-5 w-5 text-yellow-600" data-testid="environment-status-warning" />
              }
              {dashboard.environmentStatus === 'error' && 
                <AlertCircle className="h-5 w-5 text-red-600" data-testid="environment-status-error" />
              }
              Environment Status: {dashboard.environmentStatus.charAt(0).toUpperCase() + dashboard.environmentStatus.slice(1)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              All systems operational. Test environment ready for execution.
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Stat
          title="Total Tests"
          value={dashboard.totalTests}
          icon={TestTube}
          testId="stat-total-tests"
        />
        <Stat
          title="Total Suites"
          value={dashboard.totalSuites}
          icon={Users}
          testId="stat-total-suites"
        />
        {dashboard.lastRunSummary && (
          <Stat
            title="Pass Rate"
            value={`${dashboard.lastRunSummary.passRate}%`}
            icon={CheckCircle}
            testId="stat-pass-rate"
          />
        )}
        <Stat
          title="Active Runs"
          value={0}
          icon={Activity}
        />
      </div>

      {/* Quick Actions & Last Run Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/test-bank')}
                className="w-full button button-primary px-4 py-2 flex items-center justify-center gap-2"
                data-testid="quick-create-suite"
              >
                <Plus className="h-4 w-4" />
                Create Suite
              </button>
              <button
                onClick={() => navigate('/reports')}
                className="w-full button button-secondary px-4 py-2 flex items-center justify-center gap-2"
                data-testid="quick-open-reports"
              >
                <FileText className="h-4 w-4" />
                Open Reports
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Last Run Summary */}
        {dashboard.lastRunSummary ? (
          <Card data-testid="last-run-card">
            <CardHeader>
              <CardTitle>Last Run Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status:</span>
                  <span 
                    className={`status-badge ${getStatusColor(dashboard.lastRunSummary.status)}`}
                    data-testid="last-run-status"
                  >
                    {dashboard.lastRunSummary.status}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Duration:</span>
                  <span data-testid="last-run-duration">
                    {Math.floor(dashboard.lastRunSummary.duration / 1000)}s
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Pass Rate:</span>
                  <span>{dashboard.lastRunSummary.passRate}%</span>
                </div>
                <button
                  onClick={() => navigate(`/reports`)}
                  className="w-full button button-outline px-4 py-2 flex items-center justify-center gap-2"
                  data-testid="last-run-details-link"
                >
                  <FileText className="h-4 w-4" />
                  View Details
                </button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Last Run Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={Clock}
                title="No Recent Runs"
                description="Run your first test suite to see results here."
                action={{
                  label: "Create Suite",
                  onClick: () => navigate('/test-bank')
                }}
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div data-testid="activity-feed">
            {dashboard.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {dashboard.recentActivity.map((activity) => (
                  <div 
                    key={activity.id} 
                    className="flex items-center gap-4 p-4 border rounded-lg"
                    data-testid="activity-item"
                  >
                    <div className="flex-shrink-0">
                      {activity.type === 'run_completed' && <Play className="h-4 w-4 text-blue-600" />}
                      {activity.type === 'suite_created' && <Plus className="h-4 w-4 text-green-600" />}
                      {activity.type === 'test_added' && <TestTube className="h-4 w-4 text-purple-600" />}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm">{activity.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title="No Recent Activity"
                description="Activity will appear here as you create and run test suites."
                testId="activity-empty"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}