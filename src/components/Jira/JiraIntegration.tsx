import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { 
  ExternalLink, 
  Settings, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Bug,
  BarChart3,
  Link,
  RefreshCw,
  Plus,
  Eye
} from 'lucide-react';

interface JiraConfig {
  baseUrl: string;
  authType: 'oauth2' | 'api_token';
  defaultProject: string;
  status: string;
}

interface JiraHealth {
  healthy: boolean;
  status: string;
  health: {
    apiConnection: boolean;
    queueProcessor: boolean;
    database: boolean;
    webhookHandler: boolean;
  };
  timestamp: string;
  error?: string;
}

interface IssueMapping {
  id: string;
  testName: string;
  jiraIssueKey: string;
  jiraProjectKey: string;
  issueSummary: string;
  issueStatus: string;
  issuePriority: string;
  failureCategory: string;
  wesignModule: string;
  language: string;
  resolutionStatus: 'open' | 'in_progress' | 'resolved' | 'closed';
  createdInJiraAt: string;
  lastSyncedAt: string;
}

interface JiraIntegrationProps {
  className?: string;
}

export function JiraIntegration({ className }: JiraIntegrationProps) {
  const [config, setConfig] = useState<JiraConfig | null>(null);
  const [health, setHealth] = useState<JiraHealth | null>(null);
  const [mappings, setMappings] = useState<IssueMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [configuring, setConfiguring] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [formData, setFormData] = useState({
    baseUrl: '',
    authType: 'api_token' as 'oauth2' | 'api_token',
    defaultProject: '',
    email: '',
    apiToken: '',
    clientId: '',
    clientSecret: ''
  });

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        loadConfig(),
        loadHealth(),
        loadMappings()
      ]);
      setLoading(false);
    };

    loadData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      loadHealth();
      loadMappings();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/jira/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data.config);
      }
    } catch (error) {
      console.error('Failed to load Jira config:', error);
    }
  };

  const loadHealth = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/jira/health');
      if (response.ok) {
        const data = await response.json();
        setHealth(data);
      }
    } catch (error) {
      console.error('Failed to load Jira health:', error);
    }
  };

  const loadMappings = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/jira/mappings?limit=10');
      if (response.ok) {
        const data = await response.json();
        setMappings(data.mappings);
      }
    } catch (error) {
      console.error('Failed to load Jira mappings:', error);
    }
  };

  const saveConfiguration = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfiguring(true);
    
    try {
      const response = await fetch('http://localhost:8081/api/jira/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.configured) {
          setShowConfig(false);
          await loadConfig();
          await loadHealth();
        }
      }
    } catch (error) {
      console.error('Failed to save Jira config:', error);
    } finally {
      setConfiguring(false);
    }
  };

  const testConnection = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/jira/test-connection', {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        await loadHealth();
      }
    } catch (error) {
      console.error('Failed to test connection:', error);
    }
  };

  const createTestIssue = async () => {
    const testIssueData = {
      testRunId: 'test-run-' + Date.now(),
      testName: 'Sample Test Failure',
      failureHash: 'test-' + Date.now(),
      summary: 'Test Issue from QA Intelligence',
      description: 'This is a test issue created from the QA Intelligence dashboard.',
      priority: 'Medium' as 'Medium',
      wesignModule: 'signing' as 'signing',
      language: 'english' as 'english',
      environment: 'staging',
      browserType: 'chromium',
      errorMessage: 'Sample error message for testing',
      url: 'https://example.com/test',
      screenshots: []
    };

    try {
      const response = await fetch('http://localhost:8081/api/jira/issues', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testIssueData)
      });
      
      if (response.ok) {
        const data = await response.json();
        await loadMappings();
      }
    } catch (error) {
      console.error('Failed to create test issue:', error);
    }
  };

  const getHealthIcon = (healthy: boolean) => {
    return healthy ? CheckCircle : AlertCircle;
  };

  const getHealthColor = (healthy: boolean) => {
    return healthy ? 'text-green-600' : 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'open': return 'text-blue-600 bg-blue-100';
      case 'in_progress': return 'text-yellow-600 bg-yellow-100';
      case 'resolved': return 'text-green-600 bg-green-100';
      case 'closed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className={className}>
        <Loading text="Loading Jira integration..." />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Jira Integration Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <ExternalLink className="h-6 w-6 text-blue-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Jira Integration</h3>
            <p className="text-sm text-gray-500">
              Automated issue tracking and QA workflow integration
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => loadHealth()}
            className="p-2 text-gray-400 hover:text-gray-600"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Settings className="h-4 w-4" />
            Configure
          </button>
        </div>
      </div>

      {/* Configuration Form */}
      {showConfig && (
        <Card>
          <CardHeader>
            <CardTitle>Jira Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={saveConfiguration} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Jira Base URL
                  </label>
                  <input
                    type="url"
                    value={formData.baseUrl}
                    onChange={(e) => setFormData({ ...formData, baseUrl: e.target.value })}
                    placeholder="https://your-domain.atlassian.net"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Default Project Key
                  </label>
                  <input
                    type="text"
                    value={formData.defaultProject}
                    onChange={(e) => setFormData({ ...formData, defaultProject: e.target.value })}
                    placeholder="QA"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Authentication Type
                </label>
                <select
                  value={formData.authType}
                  onChange={(e) => setFormData({ ...formData, authType: e.target.value as 'oauth2' | 'api_token' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="api_token">API Token</option>
                  <option value="oauth2">OAuth 2.0</option>
                </select>
              </div>

              {formData.authType === 'api_token' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="your-email@domain.com"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      API Token
                    </label>
                    <input
                      type="password"
                      value={formData.apiToken}
                      onChange={(e) => setFormData({ ...formData, apiToken: e.target.value })}
                      placeholder="Your Jira API token"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              )}

              {formData.authType === 'oauth2' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client ID
                    </label>
                    <input
                      type="text"
                      value={formData.clientId}
                      onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Client Secret
                    </label>
                    <input
                      type="password"
                      value={formData.clientSecret}
                      onChange={(e) => setFormData({ ...formData, clientSecret: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-3 pt-4">
                <button
                  type="submit"
                  disabled={configuring}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {configuring ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4" />
                      Save Configuration
                    </>
                  )}
                </button>
                
                <button
                  type="button"
                  onClick={() => setShowConfig(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                <button
                  type="button"
                  onClick={testConnection}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  <Link className="h-4 w-4" />
                  Test Connection
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Health Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Integration Health
            </CardTitle>
          </CardHeader>
          <CardContent>
            {health ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Overall Status</span>
                  <div className={`flex items-center gap-1 ${getHealthColor(health.healthy)}`}>
                    {(() => {
                      const HealthIcon = getHealthIcon(health.healthy);
                      return <HealthIcon className="h-4 w-4" />;
                    })()}
                    <span className="text-sm font-medium">
                      {health.healthy ? 'Healthy' : 'Unhealthy'}
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  {Object.entries(health.health).map(([component, status]) => {
                    const ComponentIcon = getHealthIcon(status);
                    return (
                      <div key={component} className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 capitalize">
                          {component.replace(/([A-Z])/g, ' $1')}
                        </span>
                        <ComponentIcon className={`h-4 w-4 ${getHealthColor(status)}`} />
                      </div>
                    );
                  })}
                </div>

                {health.error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-sm text-red-600">{health.error}</p>
                  </div>
                )}

                <div className="pt-2 border-t">
                  <p className="text-xs text-gray-500">
                    Last checked: {new Date(health.timestamp).toLocaleString()}
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>Health status unavailable</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bug className="h-5 w-5 text-orange-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button
                onClick={createTestIssue}
                className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Plus className="h-4 w-4 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium">Create Test Issue</p>
                  <p className="text-sm text-gray-500">Create a sample issue in Jira</p>
                </div>
              </button>

              <button
                onClick={() => window.open(config?.baseUrl, '_blank')}
                disabled={!config?.baseUrl}
                className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <ExternalLink className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Open Jira</p>
                  <p className="text-sm text-gray-500">View issues in Jira dashboard</p>
                </div>
              </button>

              <button
                onClick={() => loadMappings()}
                className="w-full flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
              >
                <div className="p-2 bg-purple-100 rounded-lg">
                  <RefreshCw className="h-4 w-4 text-purple-600" />
                </div>
                <div>
                  <p className="font-medium">Sync Issues</p>
                  <p className="text-sm text-gray-500">Refresh issue mappings</p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Issue Mappings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5 text-purple-600" />
            Recent Issue Mappings
          </CardTitle>
        </CardHeader>
        <CardContent>
          {mappings.length > 0 ? (
            <div className="space-y-3">
              {mappings.map((mapping) => (
                <div 
                  key={mapping.id}
                  className="flex items-center justify-between p-3 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium text-sm">{mapping.jiraIssueKey}</h4>
                      <span className="text-xs text-gray-500">→</span>
                      <span className="text-sm text-gray-600">{mapping.testName}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{mapping.issueSummary}</p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(mapping.resolutionStatus)}`}>
                      {mapping.resolutionStatus.replace('_', ' ')}
                    </span>
                    <button
                      onClick={() => window.open(`${config?.baseUrl}/browse/${mapping.jiraIssueKey}`, '_blank')}
                      className="p-1 text-gray-400 hover:text-gray-600"
                      title="View in Jira"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Bug className="h-8 w-8 mx-auto mb-2" />
              <p>No issue mappings found</p>
              <p className="text-sm">Issues will appear here when test failures are tracked in Jira</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}