import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { formatRelativeTime, getRiskColor } from '@/app/utils';
import { 
  Wrench, 
  AlertTriangle, 
  CheckCircle, 
  Bug, 
  TrendingUp,
  Eye,
  RefreshCw,
  Filter,
  Download,
  X,
  Clock,
  Zap,
  Target,
  Activity
} from 'lucide-react';

interface HealingQueueItem {
  id: number;
  test_id: string;
  test_name: string;
  failure_type: string;
  error_message: string;
  original_selector?: string;
  healed_selector?: string;
  confidence_score?: number;
  status: string;
  healing_attempts: number;
  created_at: string;
}

interface HealingStats {
  pending: number;
  healed: number;
  bugs: number;
  total: number;
  successRate: number;
  avgConfidence: number;
}

export function SelfHealingDashboard() {
  const [queue, setQueue] = useState<HealingQueueItem[]>([]);
  const [stats, setStats] = useState<HealingStats>({
    pending: 0,
    healed: 0,
    bugs: 0,
    total: 0,
    successRate: 0,
    avgConfidence: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<HealingQueueItem | null>(null);
  const [filters, setFilters] = useState({
    status: '',
    failureType: '',
  });

  // Load healing data
  useEffect(() => {
    loadHealingData();
  }, [filters]);

  const loadHealingData = async () => {
    setLoading(true);
    try {
      // Load stats and queue in parallel
      const { apiUrls } = await import('@/config/api');
      const [statsResponse, queueResponse] = await Promise.all([
        fetch(apiUrls.healingStatsUrl()),
        fetch(apiUrls.healingQueueUrl({
          ...(filters.status && { status: filters.status }),
          ...(filters.failureType && { failure_type: filters.failureType }),
          limit: '50'
        }))
      ]);

      if (statsResponse.ok && queueResponse.ok) {
        const [statsData, queueData] = await Promise.all([
          statsResponse.json(),
          queueResponse.json()
        ]);
        
        setStats(statsData);
        setQueue(queueData.items || []);
      } else {
        console.error('Failed to load healing data');
      }
    } catch (error) {
      console.error('Error loading healing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFailureTypeColor = (type: string): string => {
    switch (type) {
      case 'SELECTOR_ISSUE':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPLICATION_BUG':
        return 'bg-red-100 text-red-800';
      case 'TIMING_ISSUE':
        return 'bg-blue-100 text-blue-800';
      case 'DOM_CHANGE':
        return 'bg-purple-100 text-purple-800';
      case 'NETWORK_ISSUE':
        return 'bg-orange-100 text-orange-800';
      case 'AUTH_ISSUE':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'healed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'analyzing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'bug_confirmed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const clearFilters = () => {
    setFilters({ status: '', failureType: '' });
  };

  if (loading) {
    return (
      <div className="p-6" data-testid="self-healing-page">
        <h1 className="text-3xl font-bold mb-8" data-testid="page-title">Self-Healing System</h1>
        <Loading text="Loading healing data..." />
      </div>
    );
  }

  return (
    <div className="p-6" data-testid="self-healing-page">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2" data-testid="page-title">
          <Wrench className="w-8 h-8 text-blue-600" />
          Self-Healing System
        </h1>
        <p className="text-muted-foreground">
          Automatically detect and repair test failures through intelligent analysis
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8" data-testid="healing-stats">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending Healings</p>
                <p className="text-3xl font-bold text-yellow-600" data-testid="pending-count">
                  {stats.pending}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Awaiting analysis
                </p>
              </div>
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Auto-Healed</p>
                <p className="text-3xl font-bold text-green-600" data-testid="healed-count">
                  {stats.healed}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Successfully repaired
                </p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Bugs Found</p>
                <p className="text-3xl font-bold text-red-600" data-testid="bugs-count">
                  {stats.bugs}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Application issues
                </p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <Bug className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                <p className="text-3xl font-bold" data-testid="success-rate">
                  {stats.successRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Avg confidence: {stats.avgConfidence}%
                </p>
              </div>
              <div className="p-2 bg-blue-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Healing Queue */}
      <Card data-testid="healing-queue-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Healing Queue
            </CardTitle>
            <div className="flex items-center gap-2">
              <button
                onClick={loadHealingData}
                className="button button-outline px-3 py-1 text-sm flex items-center gap-1"
                data-testid="refresh-queue"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </button>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mt-4">
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="input w-36 text-sm"
              data-testid="filter-status"
            >
              <option value="">All Status</option>
              <option value="pending">Pending</option>
              <option value="analyzing">Analyzing</option>
              <option value="healed">Healed</option>
              <option value="failed">Failed</option>
              <option value="bug_confirmed">Bug Confirmed</option>
            </select>

            <select
              value={filters.failureType}
              onChange={(e) => setFilters(prev => ({ ...prev, failureType: e.target.value }))}
              className="input w-40 text-sm"
              data-testid="filter-failure-type"
            >
              <option value="">All Types</option>
              <option value="SELECTOR_ISSUE">Selector Issues</option>
              <option value="TIMING_ISSUE">Timing Issues</option>
              <option value="APPLICATION_BUG">Application Bugs</option>
              <option value="DOM_CHANGE">DOM Changes</option>
              <option value="NETWORK_ISSUE">Network Issues</option>
              <option value="AUTH_ISSUE">Auth Issues</option>
              <option value="UNKNOWN">Unknown</option>
            </select>

            {(filters.status || filters.failureType) && (
              <button
                onClick={clearFilters}
                className="button button-outline px-2 py-1 text-xs flex items-center gap-1"
                data-testid="clear-filters"
              >
                <X className="h-3 w-3" />
                Clear
              </button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {queue.length === 0 ? (
            <EmptyState
              icon={Target}
              title="No healing items"
              description="No test failures are currently in the healing queue."
            />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" data-testid="healing-queue-table">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Test Name</th>
                    <th className="text-left py-3 px-4 font-medium">Failure Type</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">Confidence</th>
                    <th className="text-left py-3 px-4 font-medium">Attempts</th>
                    <th className="text-left py-3 px-4 font-medium">Created</th>
                    <th className="text-center py-3 px-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.map((item) => (
                    <tr key={item.id} className="border-b hover:bg-muted/50" data-testid="healing-queue-row">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium" data-testid="test-name">
                            {item.test_name}
                          </div>
                          <div className="text-sm text-muted-foreground truncate max-w-xs">
                            {item.error_message}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-medium ${getFailureTypeColor(item.failure_type)}`}
                          data-testid="failure-type"
                        >
                          {item.failure_type.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span 
                          className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(item.status)}`}
                          data-testid="healing-status"
                        >
                          {item.status.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span data-testid="confidence-score">
                            {item.confidence_score ? `${Math.round(item.confidence_score * 100)}%` : '-'}
                          </span>
                          {item.confidence_score && item.confidence_score > 0.8 && (
                            <Zap className="h-3 w-3 text-green-500" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4" data-testid="healing-attempts">
                        {item.healing_attempts}
                      </td>
                      <td className="py-3 px-4 text-sm text-muted-foreground" data-testid="created-at">
                        {formatRelativeTime(item.created_at)}
                      </td>
                      <td className="text-center py-3 px-4">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="button button-outline px-3 py-1 text-xs flex items-center gap-1"
                          data-testid="view-details"
                        >
                          <Eye className="h-3 w-3" />
                          Details
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Details Modal */}
      {selectedItem && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" data-testid="details-modal">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Healing Details - {selectedItem.test_name}</CardTitle>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="button button-outline px-2 py-2"
                  data-testid="close-modal"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Test ID</label>
                  <p className="text-sm text-muted-foreground">{selectedItem.test_id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Failure Type</label>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getFailureTypeColor(selectedItem.failure_type)}`}>
                    {selectedItem.failure_type.replace('_', ' ')}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Error Message</label>
                <pre className="text-sm bg-muted p-3 rounded mt-1 overflow-x-auto">
                  {selectedItem.error_message}
                </pre>
              </div>

              {selectedItem.original_selector && (
                <div>
                  <label className="text-sm font-medium">Original Selector</label>
                  <code className="text-sm bg-muted p-2 rounded mt-1 block">
                    {selectedItem.original_selector}
                  </code>
                </div>
              )}

              {selectedItem.healed_selector && (
                <div>
                  <label className="text-sm font-medium">Healed Selector</label>
                  <code className="text-sm bg-green-100 p-2 rounded mt-1 block">
                    {selectedItem.healed_selector}
                  </code>
                </div>
              )}

              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Created: {new Date(selectedItem.created_at).toLocaleString()}</span>
                <span>Attempts: {selectedItem.healing_attempts}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}