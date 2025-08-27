import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/app/store';
import { api } from '@/app/api';
import { Loading } from '@/components/Loading';
import { EmptyState } from '@/components/EmptyState';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/Card';
import { Stat } from '@/components/Stat';
import { BarChartComponent, LineChartComponent, PieChartComponent } from '@/components/Chart';
import { formatRelativeTime, getRiskColor } from '@/app/utils';
import type { CoverageMetric, GapItem, Insight } from '@/app/types';
import { 
  BarChart3, 
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Filter,
  RefreshCw,
  Download,
  X,
  ChevronDown,
  ChevronRight,
  Target,
  Zap,
  Brain
} from 'lucide-react';

export function AnalyticsPage() {
  const { 
    coverage,
    gaps,
    insights,
    loading,
    setCoverage,
    setGaps,
    setInsights,
    setLoading 
  } = useAppStore();

  const [gapsFilter, setGapsFilter] = useState({
    severity: '',
    type: '',
    module: ''
  });
  const [insightsFilter, setInsightsFilter] = useState({
    category: '',
    priority: ''
  });
  const [expandedGaps, setExpandedGaps] = useState<Set<string>>(new Set());
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  // Load analytics data on mount
  useEffect(() => {
    async function loadAnalytics() {
      setLoading('analytics', true);
      try {
        const [coverageData, gapsData, insightsData] = await Promise.all([
          api.getCoverage(),
          api.getGaps(),
          api.getInsights()
        ]);
        setCoverage(coverageData);
        setGaps(gapsData);
        setInsights(insightsData);
      } catch (error) {
        console.error('Failed to load analytics data:', error);
      } finally {
        setLoading('analytics', false);
      }
    }

    loadAnalytics();
  }, [setCoverage, setGaps, setInsights, setLoading]);

  // Calculate overall coverage
  const overallCoverage = useMemo(() => {
    if (coverage.length === 0) return { percent: 0, covered: 0, total: 0 };
    
    const totalCovered = coverage.reduce((sum, item) => sum + item.coveredElements, 0);
    const totalElements = coverage.reduce((sum, item) => sum + item.totalElements, 0);
    
    return {
      percent: totalElements > 0 ? Math.round((totalCovered / totalElements) * 100) : 0,
      covered: totalCovered,
      total: totalElements
    };
  }, [coverage]);

  // Calculate coverage by category
  const coverageByCategory = useMemo(() => {
    if (coverage.length === 0) return { routes: 0, components: 0, functions: 0 };
    
    const routes = coverage.reduce((sum, item) => sum + item.categories.routes.covered, 0);
    const routesTotal = coverage.reduce((sum, item) => sum + item.categories.routes.total, 0);
    
    const components = coverage.reduce((sum, item) => sum + item.categories.components.covered, 0);
    const componentsTotal = coverage.reduce((sum, item) => sum + item.categories.components.total, 0);
    
    const functions = coverage.reduce((sum, item) => sum + item.categories.functions.covered, 0);
    const functionsTotal = coverage.reduce((sum, item) => sum + item.categories.functions.total, 0);
    
    return {
      routes: routesTotal > 0 ? Math.round((routes / routesTotal) * 100) : 0,
      components: componentsTotal > 0 ? Math.round((components / componentsTotal) * 100) : 0,
      functions: functionsTotal > 0 ? Math.round((functions / functionsTotal) * 100) : 0
    };
  }, [coverage]);

  // Prepare chart data
  const moduleChartData = useMemo(() => {
    return coverage.map(item => ({
      module: item.module,
      coverage: item.coveragePercent
    }));
  }, [coverage]);

  const trendChartData = useMemo(() => {
    // Mock trend data (in real app would come from API)
    const dates = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      dates.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        overall: Math.max(50, overallCoverage.percent - Math.random() * 10),
        routes: Math.max(40, coverageByCategory.routes - Math.random() * 15),
        components: Math.max(45, coverageByCategory.components - Math.random() * 12),
        functions: Math.max(48, coverageByCategory.functions - Math.random() * 8)
      });
    }
    return dates;
  }, [overallCoverage.percent, coverageByCategory]);

  const gapChartData = useMemo(() => {
    const severityCounts = gaps.reduce((acc, gap) => {
      acc[gap.severity] = (acc[gap.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const colors = {
      critical: '#dc2626', // red-600
      high: '#ea580c',     // orange-600
      medium: '#ca8a04',   // yellow-600
      low: '#2563eb'       // blue-600
    };

    return Object.entries(severityCounts).map(([severity, count]) => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: count,
      color: colors[severity as keyof typeof colors] || '#6b7280'
    }));
  }, [gaps]);

  // Filter functions
  const filteredGaps = useMemo(() => {
    return gaps.filter(gap => {
      const matchesSeverity = !gapsFilter.severity || gap.severity === gapsFilter.severity;
      const matchesType = !gapsFilter.type || gap.type === gapsFilter.type;
      const matchesModule = !gapsFilter.module || gap.affectedModule === gapsFilter.module;
      
      return matchesSeverity && matchesType && matchesModule;
    });
  }, [gaps, gapsFilter]);

  const filteredInsights = useMemo(() => {
    return insights.filter(insight => {
      const matchesCategory = !insightsFilter.category || insight.category === insightsFilter.category;
      const matchesPriority = !insightsFilter.priority || insight.priority === insightsFilter.priority;
      
      return matchesCategory && matchesPriority;
    });
  }, [insights, insightsFilter]);

  // Get unique values for filters
  const gapModules = useMemo(() => [...new Set(gaps.map(gap => gap.affectedModule))], [gaps]);
  const gapTypes = useMemo(() => [...new Set(gaps.map(gap => gap.type))], [gaps]);

  // Toggle expansion functions
  const toggleGapExpansion = (gapId: string) => {
    const newExpanded = new Set(expandedGaps);
    if (newExpanded.has(gapId)) {
      newExpanded.delete(gapId);
    } else {
      newExpanded.add(gapId);
    }
    setExpandedGaps(newExpanded);
  };

  const toggleInsightExpansion = (insightId: string) => {
    const newExpanded = new Set(expandedInsights);
    if (newExpanded.has(insightId)) {
      newExpanded.delete(insightId);
    } else {
      newExpanded.add(insightId);
    }
    setExpandedInsights(newExpanded);
  };

  const clearGapsFilters = () => {
    setGapsFilter({ severity: '', type: '', module: '' });
  };

  const clearInsightsFilters = () => {
    setInsightsFilter({ category: '', priority: '' });
  };

  if (loading.analytics) {
    return (
      <div data-testid="analytics-page">
        <h1 className="text-3xl font-bold mb-8" data-testid="page-title">Analytics</h1>
        <Loading text="Loading analytics..." />
      </div>
    );
  }

  return (
    <div data-testid="analytics-page" className="space-y-6">
      <h1 className="text-3xl font-bold" data-testid="page-title">Analytics</h1>
      
      {/* Coverage Overview Cards */}
      <div data-testid="coverage-overview">
        <h2 className="text-xl font-semibold mb-4">Coverage Overview</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card data-testid="overall-coverage-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overall Coverage</p>
                  <p className="text-3xl font-bold" data-testid="overall-coverage-percent">
                    {overallCoverage.percent}%
                  </p>
                  <p className="text-xs text-muted-foreground" data-testid="coverage-last-updated">
                    {overallCoverage.covered} of {overallCoverage.total} elements
                  </p>
                </div>
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Target className="h-6 w-6 text-blue-600" />
                </div>
              </div>
              <div className="mt-4">
                <div 
                  className={`text-xs font-medium ${overallCoverage.percent >= 80 ? 'text-green-600' : overallCoverage.percent >= 60 ? 'text-yellow-600' : 'text-red-600'}`}
                  data-testid="overall-coverage-trend"
                >
                  {overallCoverage.percent >= 80 ? '↑ Excellent' : overallCoverage.percent >= 60 ? '→ Good' : '↓ Needs Improvement'}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="routes-coverage-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Routes Coverage</p>
                  <p className="text-3xl font-bold">{coverageByCategory.routes}%</p>
                </div>
                <div className="p-2 bg-green-100 rounded-lg">
                  <Target className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="components-coverage-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Components Coverage</p>
                  <p className="text-3xl font-bold">{coverageByCategory.components}%</p>
                </div>
                <div className="p-2 bg-purple-100 rounded-lg">
                  <Target className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card data-testid="functions-coverage-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Functions Coverage</p>
                  <p className="text-3xl font-bold">{coverageByCategory.functions}%</p>
                </div>
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Target className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6" data-testid="coverage-charts">
        {/* Coverage by Module Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Coverage by Module</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChartComponent
              data={moduleChartData}
              xKey="module"
              yKey="coverage"
              testId="coverage-by-module-chart"
            />
          </CardContent>
        </Card>

        {/* Coverage Trend Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Coverage Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChartComponent
              data={trendChartData}
              xKey="date"
              lines={[
                { key: 'overall', color: '#3b82f6', name: 'Overall' },
                { key: 'routes', color: '#10b981', name: 'Routes' },
                { key: 'components', color: '#8b5cf6', name: 'Components' },
                { key: 'functions', color: '#f59e0b', name: 'Functions' }
              ]}
              testId="coverage-trend-chart"
            />
          </CardContent>
        </Card>

        {/* Gap Distribution Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Gap Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <PieChartComponent
              data={gapChartData}
              testId="gap-distribution-chart"
            />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gaps Panel */}
        <Card data-testid="gaps-panel">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-500" />
              Gaps & Risks
            </CardTitle>
            
            {/* Gaps Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={gapsFilter.severity}
                onChange={(e) => setGapsFilter(prev => ({ ...prev, severity: e.target.value }))}
                className="input w-32 text-sm"
                data-testid="gaps-filter-severity"
              >
                <option value="">All Severity</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              <select
                value={gapsFilter.type}
                onChange={(e) => setGapsFilter(prev => ({ ...prev, type: e.target.value }))}
                className="input w-40 text-sm"
                data-testid="gaps-filter-type"
              >
                <option value="">All Types</option>
                {gapTypes.map(type => (
                  <option key={type} value={type}>
                    {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </option>
                ))}
              </select>
              
              <select
                value={gapsFilter.module}
                onChange={(e) => setGapsFilter(prev => ({ ...prev, module: e.target.value }))}
                className="input w-32 text-sm"
                data-testid="gaps-filter-module"
              >
                <option value="">All Modules</option>
                {gapModules.map(module => (
                  <option key={module} value={module}>{module}</option>
                ))}
              </select>
              
              {(gapsFilter.severity || gapsFilter.type || gapsFilter.module) && (
                <button
                  onClick={clearGapsFilters}
                  className="button button-outline px-2 py-1 text-xs flex items-center gap-1"
                  data-testid="clear-gaps-filters"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="space-y-3" data-testid="gaps-list">
              {filteredGaps.length === 0 ? (
                <EmptyState
                  icon={Target}
                  title="No gaps found"
                  description="No gaps match your current filters or all gaps have been resolved."
                />
              ) : (
                filteredGaps.map((gap) => (
                  <div key={gap.id} className="border rounded-lg" data-testid="gap-item">
                    <div 
                      className="p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleGapExpansion(gap.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {expandedGaps.has(gap.id) ? (
                            <ChevronDown className="h-4 w-4 mt-0.5" data-testid="expand-gap-details" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mt-0.5" data-testid="expand-gap-details" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span 
                                className={`status-badge ${getRiskColor(gap.severity)}`}
                                data-testid="gap-severity-badge"
                              >
                                {gap.severity.toUpperCase()}
                              </span>
                              <span 
                                className="status-badge bg-secondary text-secondary-foreground text-xs"
                                data-testid="gap-type"
                              >
                                {gap.type.replace('_', ' ')}
                              </span>
                            </div>
                            <h4 className="font-medium" data-testid="gap-title">{gap.title}</h4>
                            <p className="text-sm text-muted-foreground" data-testid="gap-module">
                              Module: {gap.affectedModule}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span 
                            className="status-badge bg-accent text-accent-foreground text-xs"
                            data-testid="gap-effort-badge"
                          >
                            {gap.effort} effort
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {expandedGaps.has(gap.id) && (
                      <div className="p-3 pt-0 space-y-3" data-testid="gap-details-panel">
                        <p className="text-sm">{gap.description}</p>
                        <div>
                          <h5 className="font-medium mb-1">Impact</h5>
                          <p className="text-sm text-muted-foreground">{gap.estimatedImpact}</p>
                        </div>
                        <div>
                          <h5 className="font-medium mb-1">Recommendation</h5>
                          <p className="text-sm" data-testid="gap-recommendation">{gap.recommendation}</p>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Detected: {formatRelativeTime(gap.lastDetected)}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Insights Panel */}
        <Card data-testid="insights-panel">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-500" />
                AI Insights
              </div>
              <button
                className="button button-outline px-2 py-1 text-xs flex items-center gap-1"
                data-testid="refresh-insights"
              >
                <RefreshCw className="h-3 w-3" />
                Refresh
              </button>
            </CardTitle>
            
            {/* Insights Filters */}
            <div className="flex flex-wrap gap-2">
              <select
                value={insightsFilter.category}
                onChange={(e) => setInsightsFilter(prev => ({ ...prev, category: e.target.value }))}
                className="input w-36 text-sm"
                data-testid="insights-filter-category"
              >
                <option value="">All Categories</option>
                <option value="coverage">Coverage</option>
                <option value="performance">Performance</option>
                <option value="reliability">Reliability</option>
                <option value="maintenance">Maintenance</option>
              </select>
              
              <select
                value={insightsFilter.priority}
                onChange={(e) => setInsightsFilter(prev => ({ ...prev, priority: e.target.value }))}
                className="input w-32 text-sm"
                data-testid="insights-filter-priority"
              >
                <option value="">All Priority</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
              
              {(insightsFilter.category || insightsFilter.priority) && (
                <button
                  onClick={clearInsightsFilters}
                  className="button button-outline px-2 py-1 text-xs flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </CardHeader>
          
          <CardContent className="max-h-96 overflow-y-auto">
            <div className="space-y-3" data-testid="insights-list">
              {filteredInsights.length === 0 ? (
                <EmptyState
                  icon={Lightbulb}
                  title="No insights available"
                  description="AI insights will appear here as we analyze your test data."
                />
              ) : (
                filteredInsights.map((insight) => (
                  <div key={insight.id} className="border rounded-lg" data-testid="insight-item">
                    <div 
                      className="p-3 cursor-pointer hover:bg-muted/50"
                      onClick={() => toggleInsightExpansion(insight.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2">
                          {expandedInsights.has(insight.id) ? (
                            <ChevronDown className="h-4 w-4 mt-0.5" data-testid="expand-insight" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mt-0.5" data-testid="expand-insight" />
                          )}
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span 
                                className={`status-badge ${getRiskColor(insight.priority)}`}
                                data-testid="insight-priority"
                              >
                                {insight.priority.toUpperCase()}
                              </span>
                              <span 
                                className="status-badge bg-secondary text-secondary-foreground text-xs"
                                data-testid="insight-category-badge"
                              >
                                {insight.category}
                              </span>
                            </div>
                            <h4 className="font-medium" data-testid="insight-title">{insight.title}</h4>
                            <p className="text-sm text-muted-foreground" data-testid="insight-summary">
                              {insight.summary}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-xs text-muted-foreground" data-testid="insight-confidence">
                            {Math.round(insight.confidence * 100)}% confidence
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {expandedInsights.has(insight.id) && (
                      <div className="p-3 pt-0 space-y-3" data-testid="insight-details">
                        <p className="text-sm">{insight.details}</p>
                        
                        {insight.actionItems.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2">Action Items</h5>
                            <ul className="space-y-1" data-testid="insight-action-items">
                              {insight.actionItems.map((item, index) => (
                                <li key={index} className="text-sm flex items-start gap-2">
                                  <Zap className="h-3 w-3 mt-0.5 text-yellow-500 flex-shrink-0" />
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {insight.dataPoints.length > 0 && (
                          <div>
                            <h5 className="font-medium mb-2">Supporting Data</h5>
                            <div className="space-y-1" data-testid="insight-data-points">
                              {insight.dataPoints.map((point, index) => (
                                <div key={index} className="text-sm flex justify-between">
                                  <span>{point.metric}:</span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{point.value}</span>
                                    {point.benchmark && (
                                      <span className="text-muted-foreground">
                                        (target: {point.benchmark})
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="text-xs text-muted-foreground">
                          Generated: {formatRelativeTime(insight.generatedAt)}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}