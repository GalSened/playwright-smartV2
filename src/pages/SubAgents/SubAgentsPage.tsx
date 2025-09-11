import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { JiraIntegration } from '@/components/Jira/JiraIntegration';
import { 
  Bot, 
  Activity, 
  CheckCircle, 
  AlertCircle, 
  Clock,
  Zap,
  Brain,
  Settings,
  Play,
  RefreshCw,
  BarChart3,
  TrendingUp
} from 'lucide-react';

interface Agent {
  id: string;
  type: string;
  status: 'idle' | 'active' | 'busy' | 'error' | 'offline';
  capabilities: string[];
  lastActivity?: string;
  performance?: {
    tasksCompleted: number;
    averageExecutionTime: number;
    successRate: number;
    errorsToday: number;
  };
  resourceUsage?: {
    cpuPercent: number;
    memoryMB: number;
  };
}

interface AgentMetrics {
  agentId: string;
  type: string;
  performance: {
    tasksCompleted: number;
    averageExecutionTime: number;
    successRate: number;
    errorsToday: number;
  };
  resourceUsage: {
    cpuPercent: number;
    memoryMB: number;
  };
  status: string;
  lastActivity: string;
  healthScore: number;
  currentTasks: number;
}

interface AgentStatus {
  totalAgents: number;
  agents: Record<string, Agent>;
  orchestratorStatus: {
    uptime: number;
    memoryUsage: any;
    timestamp: string;
  };
}

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  estimatedDuration: number;
  testFiles?: string[];
}

interface TestData {
  tests: any[];
  totalTests: number;
  statistics: {
    totalFiles: number;
    totalTestCases: number;
    avgTestsPerFile: number;
    lastScanDate: string | null;
  };
  categories: {
    name: string;
    count: number;
    percentage: number;
  }[];
  testTypes: {
    name: string;
    count: number;
    percentage: number;
  }[];
}

interface TestAnalytics {
  insights: {
    testCoverage: {
      totalFiles: number;
      totalTestCases: number;
      averageTestsPerFile: number;
    };
    categoryDistribution: any[];
    typeDistribution: any[];
    recommendations: string[];
    healthScore: number;
  };
}

export function SubAgentsPage() {
  const [agentStatus, setAgentStatus] = useState<AgentStatus | null>(null);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [testData, setTestData] = useState<TestData | null>(null);
  const [analytics, setAnalytics] = useState<TestAnalytics | null>(null);
  const [metrics, setMetrics] = useState<{ agentMetrics: AgentMetrics[], summary: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Load agent status
  const loadAgentStatus = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/sub-agents/status');
      if (response.ok) {
        const data = await response.json();
        setAgentStatus(data.data);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.error('Failed to load agent status:', error);
    }
  };

  // Load workflow templates
  const loadTemplates = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/sub-agents/workflow-templates');
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.data.templates);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  };

  // Load real test data
  const loadTestData = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/sub-agents/test-data?limit=10');
      if (response.ok) {
        const data = await response.json();
        setTestData(data.data);
      }
    } catch (error) {
      console.error('Failed to load test data:', error);
    }
  };

  // Load test analytics
  const loadAnalytics = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/sub-agents/test-data/analytics');
      if (response.ok) {
        const data = await response.json();
        setAnalytics(data.data);
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
    }
  };

  // Load real metrics data
  const loadMetrics = async () => {
    try {
      const response = await fetch('http://localhost:8081/api/sub-agents/metrics');
      if (response.ok) {
        const data = await response.json();
        setMetrics(data.data);
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  // Trigger test discovery scan
  const performTestScan = async () => {
    setScanning(true);
    try {
      const response = await fetch('http://localhost:8081/api/sub-agents/test-data/scan', {
        method: 'POST'
      });
      if (response.ok) {
        const data = await response.json();
        console.log('Test scan completed:', data);
        // Refresh all data after scan
        await Promise.all([loadTestData(), loadAnalytics(), loadTemplates()]);
      }
    } catch (error) {
      console.error('Test scan failed:', error);
    } finally {
      setScanning(false);
    }
  };

  // Execute workflow template with real test data
  const executeTemplate = async (templateId: string) => {
    setExecuting(templateId);
    try {
      const template = templates.find(t => t.id === templateId);
      const response = await fetch(`http://localhost:8081/api/sub-agents/execute-template/${templateId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            availableTests: testData?.tests || [],
            testContext: {
              totalTestFiles: testData?.totalTests || 0,
              categories: testData?.categories || [],
              healthScore: analytics?.insights.healthScore || 0
            },
            templateInfo: {
              testFiles: template?.testFiles || []
            }
          },
          context: {
            timestamp: new Date(),
            testStatistics: testData?.statistics
          }
        })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Template execution started with real data:', result);
        // Refresh status and data
        await Promise.all([loadAgentStatus(), loadTestData(), loadAnalytics()]);
      }
    } catch (error) {
      console.error('Failed to execute template:', error);
    } finally {
      setExecuting(null);
    }
  };

  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await Promise.all([
        loadAgentStatus(), 
        loadTemplates(), 
        loadTestData(), 
        loadAnalytics(),
        loadMetrics()
      ]);
      setLoading(false);
    };

    initialize();

    // Auto-refresh every 15 seconds for real-time data
    const interval = setInterval(async () => {
      await Promise.all([loadAgentStatus(), loadTestData(), loadMetrics()]);
    }, 15000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: Agent['status']) => {
    switch (status) {
      case 'idle': return 'text-gray-500 bg-gray-100';
      case 'active': return 'text-green-600 bg-green-100';
      case 'busy': return 'text-blue-600 bg-blue-100';
      case 'error': return 'text-red-600 bg-red-100';
      case 'offline': return 'text-gray-400 bg-gray-50';
      default: return 'text-gray-500 bg-gray-100';
    }
  };

  const getStatusIcon = (status: Agent['status']) => {
    switch (status) {
      case 'idle': return Clock;
      case 'active': return CheckCircle;
      case 'busy': return Activity;
      case 'error': return AlertCircle;
      case 'offline': return Bot;
      default: return Clock;
    }
  };

  const formatUptime = (uptimeSeconds: number) => {
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  const formatMemoryUsage = (bytes: number) => {
    return `${Math.round(bytes / 1024 / 1024)}MB`;
  };

  if (loading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Sub-Agents Management</h1>
        <Loading text="Loading sub-agents status..." />
      </div>
    );
  }

  if (!agentStatus) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-8">Sub-Agents Management</h1>
        <EmptyState
          icon={Bot}
          title="No Agent Data"
          description="Unable to load agent status. Please check the backend connection."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sub-Agents Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => Promise.all([loadAgentStatus(), loadTestData(), loadAnalytics(), loadMetrics()])}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh All
          </button>
          <button
            onClick={performTestScan}
            disabled={scanning}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {scanning ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Scanning Tests...
              </>
            ) : (
              <>
                <Activity className="h-4 w-4" />
                Scan Tests
              </>
            )}
          </button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Total Agents</p>
                <p className="text-3xl font-bold text-gray-900">{agentStatus.totalAgents}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Bot className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">System Uptime</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatUptime(agentStatus.orchestratorStatus.uptime)}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Memory Usage</p>
                <p className="text-3xl font-bold text-gray-900">
                  {formatMemoryUsage(agentStatus.orchestratorStatus.memoryUsage.heapUsed)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Agents Status with Real Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Active Agents
            {metrics && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                {metrics.agentMetrics.length} agents with real-time data
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(metrics?.agentMetrics?.length > 0 || Object.keys(agentStatus?.agents || {}).length > 0) ? (
            <div className="space-y-4">
              {/* Display agents with real metrics first */}
              {metrics?.agentMetrics?.map((agentMetric) => {
                const agent = agentStatus?.agents[agentMetric.agentId];
                const StatusIcon = getStatusIcon(agentMetric.status as Agent['status']);
                return (
                  <div 
                    key={agentMetric.agentId}
                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <Brain className="h-5 w-5 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="font-medium">{agentMetric.agentId}</h3>
                        <p className="text-sm text-gray-500">{agentMetric.type}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-gray-600">
                            Health: {Math.round(agentMetric.healthScore * 100)}%
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-600">
                            Tasks: {agentMetric.performance.tasksCompleted}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="text-gray-600">
                            <div>CPU: {Math.round(agentMetric.resourceUsage.cpuPercent)}%</div>
                            <div>Mem: {Math.round(agentMetric.resourceUsage.memoryMB)}MB</div>
                          </div>
                          <div className="text-gray-600">
                            <div>Success: {Math.round(agentMetric.performance.successRate * 100)}%</div>
                            <div>Avg: {Math.round(agentMetric.performance.averageExecutionTime)}ms</div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 mt-1">
                          Last: {new Date(agentMetric.lastActivity).toLocaleTimeString()}
                        </p>
                      </div>
                      
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(agentMetric.status as Agent['status'])}`}>
                        <StatusIcon className="h-4 w-4" />
                        {agentMetric.status.toUpperCase()}
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Display remaining agents without metrics */}
              {Object.values(agentStatus?.agents || {})
                .filter(agent => !metrics?.agentMetrics?.some(m => m.agentId === agent.id))
                .map((agent) => {
                  const StatusIcon = getStatusIcon(agent.status);
                  return (
                    <div 
                      key={agent.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 opacity-75"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <Brain className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{agent.id}</h3>
                          <p className="text-sm text-gray-500">{agent.type}</p>
                          <p className="text-xs text-orange-600">No metrics available</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            {agent.capabilities.slice(0, 2).map((cap) => (
                              <span 
                                key={cap}
                                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full"
                              >
                                {cap.split('-')[0]}
                              </span>
                            ))}
                            {agent.capabilities.length > 2 && (
                              <span className="text-xs text-gray-500">
                                +{agent.capabilities.length - 2}
                              </span>
                            )}
                          </div>
                          {agent.lastActivity && (
                            <p className="text-xs text-gray-400 mt-1">
                              Last: {new Date(agent.lastActivity).toLocaleTimeString()}
                            </p>
                          )}
                        </div>
                        
                        <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(agent.status)}`}>
                          <StatusIcon className="h-4 w-4" />
                          {agent.status.toUpperCase()}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <EmptyState
              icon={Bot}
              title="No Active Agents"
              description="No agents are currently registered in the system. Try initializing agents first."
            />
          )}
        </CardContent>
      </Card>

      {/* Test Data Overview */}
      {testData && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Test Files</p>
                  <p className="text-3xl font-bold text-gray-900">{testData.statistics.totalFiles}</p>
                </div>
                <div className="p-3 bg-indigo-100 rounded-lg">
                  <Settings className="h-6 w-6 text-indigo-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Total Test Cases</p>
                  <p className="text-3xl font-bold text-gray-900">{testData.statistics.totalTestCases}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Avg Tests/File</p>
                  <p className="text-3xl font-bold text-gray-900">{testData.statistics.avgTestsPerFile}</p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Health Score</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {analytics?.insights.healthScore || 0}%
                  </p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Test Analytics & Insights */}
      {analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-blue-600" />
                Test Categories Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {analytics.insights.categoryDistribution.map((category, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm font-medium">{category.category}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full">
                        <div 
                          className="h-2 bg-blue-500 rounded-full"
                          style={{ width: `${category.percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{category.count}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Test Intelligence Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-900 mb-2">Test Coverage</h4>
                  <p className="text-sm text-blue-700">
                    {analytics.insights.testCoverage.totalFiles} files with {analytics.insights.testCoverage.totalTestCases} test cases
                  </p>
                </div>
                
                {analytics.insights.recommendations.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-gray-900">Recommendations</h4>
                    {analytics.insights.recommendations.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-500 mt-0.5" />
                        <p className="text-sm text-gray-600">{rec}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Workflow Templates */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Workflow Templates
            {templates.length > 0 && testData && (
              <span className="ml-2 px-2 py-1 text-xs bg-green-100 text-green-700 rounded-full">
                Based on {testData.totalTests} discovered tests
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {templates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <div 
                  key={template.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-medium text-gray-900">{template.name}</h3>
                      <p className="text-sm text-gray-500 mt-1">{template.description}</p>
                      {template.testFiles && template.testFiles.length > 0 && (
                        <p className="text-xs text-blue-600 mt-1">
                          {template.testFiles.length} test files included
                        </p>
                      )}
                    </div>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full">
                      {template.category}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {Math.round(template.estimatedDuration / 60)}m
                      </div>
                    </div>
                    
                    <button
                      onClick={() => executeTemplate(template.id)}
                      disabled={executing === template.id}
                      className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {executing === template.id ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          Running
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          Execute
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={Settings}
              title="No Templates Available"
              description={testData ? 
                `Discovered ${testData.totalTests} tests but no templates generated yet. Try refreshing or scanning tests.` :
                "No workflow templates are currently configured."
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Jira Integration Section */}
      <JiraIntegration className="mt-8" />
    </div>
  );
}