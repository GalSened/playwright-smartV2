# Analytics Page Instructions

## Purpose & KPIs
- Provide AI-driven insights into test coverage and quality gaps
- Display coverage metrics across modules and components
- Surface actionable recommendations for test improvements
- Success metrics: Insight relevance > 80%, coverage visualization accuracy

## Data Models

### CoverageMetric
```typescript
interface CoverageMetric {
  module: string;
  component?: string;
  totalElements: number;
  coveredElements: number;
  coveragePercent: number;
  lastUpdated: string;
  trend: 'up' | 'down' | 'stable';
  categories: {
    routes: { covered: number; total: number; };
    components: { covered: number; total: number; };
    functions: { covered: number; total: number; };
  };
}
```

### GapItem  
```typescript
interface GapItem {
  id: string;
  type: 'untested_route' | 'flaky_test' | 'missing_edge_case' | 'performance_risk';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedModule: string;
  estimatedImpact: string;
  recommendation: string;
  effort: 'low' | 'medium' | 'high';
  lastDetected: string;
}
```

### Insight
```typescript
interface Insight {
  id: string;
  category: 'coverage' | 'performance' | 'reliability' | 'maintenance';
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  summary: string;
  details: string;
  actionItems: string[];
  confidence: number; // 0-1
  dataPoints: Array<{
    metric: string;
    value: number;
    benchmark?: number;
  }>;
  generatedAt: string;
}
```

## UI Layout
```
┌─────────────────────────────────────┐
│ Coverage Overview Cards             │
├─────────────────┬───────────────────┤
│ Coverage Chart  │ Gaps & Risks      │
│ (by module)     │ (prioritized list)│
├─────────────────┼───────────────────┤
│ AI Insights     │ Trend Analysis    │
│ (recommendations)│ (historical data) │
└─────────────────┴───────────────────┘
```

## Chart Configurations (Recharts)
### Coverage by Module (Bar Chart)
- X-axis: Module names
- Y-axis: Coverage percentage (0-100%)  
- Bars colored by coverage level (red < 50%, yellow 50-80%, green > 80%)
- Tooltip shows absolute numbers (covered/total)

### Coverage Trend (Line Chart)  
- X-axis: Time (last 30 days)
- Y-axis: Overall coverage percentage
- Multiple lines for different coverage types (routes, components, functions)
- Interactive hover with data points

### Gap Distribution (Pie Chart)
- Segments: Gap types (untested, flaky, edge cases, performance)
- Colors: Severity-based (critical=red, high=orange, medium=yellow, low=blue)
- Center shows total gap count

## MCP Test Selectors

### Page Structure
- `[data-testid="analytics-page"]` - Main container
- `[data-testid="coverage-overview"]` - Top overview cards
- `[data-testid="coverage-charts"]` - Charts section
- `[data-testid="gaps-panel"]` - Gaps and risks panel
- `[data-testid="insights-panel"]` - AI insights panel
- `[data-testid="trends-panel"]` - Trends analysis panel

### Coverage Overview Cards
- `[data-testid="overall-coverage-card"]` - Main coverage stat
- `[data-testid="overall-coverage-percent"]` - Coverage percentage
- `[data-testid="overall-coverage-trend"]` - Trend indicator
- `[data-testid="routes-coverage-card"]` - Routes coverage
- `[data-testid="components-coverage-card"]` - Components coverage
- `[data-testid="functions-coverage-card"]` - Functions coverage
- `[data-testid="coverage-last-updated"]` - Last update timestamp

### Coverage Charts
- `[data-testid="coverage-by-module-chart"]` - Module coverage bar chart
- `[data-testid="coverage-trend-chart"]` - Coverage timeline chart  
- `[data-testid="gap-distribution-chart"]` - Gap distribution pie chart
- `[data-testid="chart-loading"]` - Chart loading indicators
- `[data-testid="chart-error"]` - Chart error states
- `[data-testid="chart-tooltip"]` - Interactive tooltips

### Chart Interactions
- `[data-testid="module-bar"]` - Individual module bars (clickable)
- `[data-testid="trend-line-point"]` - Trend data points
- `[data-testid="pie-segment"]` - Pie chart segments
- `[data-testid="chart-legend"]` - Chart legends
- `[data-testid="zoom-controls"]` - Chart zoom/pan controls

### Gaps & Risks Panel
- `[data-testid="gaps-list"]` - Gaps container
- `[data-testid="gap-item"]` - Individual gap items
- `[data-testid="gap-severity-badge"]` - Severity indicators
- `[data-testid="gap-type"]` - Gap type labels
- `[data-testid="gap-title"]` - Gap titles
- `[data-testid="gap-module"]` - Affected module names
- `[data-testid="gap-recommendation"]` - Recommendation text
- `[data-testid="gap-effort-badge"]` - Effort estimate badges
- `[data-testid="expand-gap-details"]` - Expand gap button
- `[data-testid="gap-details-panel"]` - Expanded gap details

### Gaps Filtering & Sorting
- `[data-testid="gaps-filter-severity"]` - Severity filter
- `[data-testid="gaps-filter-type"]` - Type filter
- `[data-testid="gaps-filter-module"]` - Module filter
- `[data-testid="gaps-sort-options"]` - Sort dropdown
- `[data-testid="gaps-search"]` - Search gaps
- `[data-testid="clear-gaps-filters"]` - Clear filters

### AI Insights Panel
- `[data-testid="insights-list"]` - Insights container
- `[data-testid="insight-item"]` - Individual insights
- `[data-testid="insight-category-badge"]` - Category labels
- `[data-testid="insight-priority"]` - Priority indicators
- `[data-testid="insight-title"]` - Insight titles
- `[data-testid="insight-summary"]` - Summary text
- `[data-testid="insight-confidence"]` - Confidence scores
- `[data-testid="expand-insight"]` - Expand insight button
- `[data-testid="insight-details"]` - Expanded insight content
- `[data-testid="insight-action-items"]` - Action items list
- `[data-testid="insight-data-points"]` - Supporting data

### Insights Interactions
- `[data-testid="insights-filter-category"]` - Category filter
- `[data-testid="insights-filter-priority"]` - Priority filter
- `[data-testid="insights-sort"]` - Sort options
- `[data-testid="refresh-insights"]` - Regenerate insights button
- `[data-testid="export-insights"]` - Export insights button
- `[data-testid="insight-feedback"]` - Insight rating/feedback

### Trends Analysis
- `[data-testid="trends-section"]` - Trends container
- `[data-testid="coverage-evolution"]` - Coverage over time
- `[data-testid="gap-trends"]` - Gap count trends
- `[data-testid="module-comparison"]` - Module comparison view
- `[data-testid="trends-date-range"]` - Date range selector
- `[data-testid="trends-granularity"]` - Time granularity options

## EPU Steps & Assertions

### 1. Page Load & Overview Cards
```javascript
await page.goto('/analytics');
await expect(page.getByTestId('analytics-page')).toBeVisible();
await expect(page.getByTestId('page-title')).toHaveText('Analytics');

// Verify overview cards render with data
await expect(page.getByTestId('overall-coverage-card')).toBeVisible();
await expect(page.getByTestId('overall-coverage-percent')).toBeVisible();
await expect(page.getByTestId('routes-coverage-card')).toBeVisible();
await expect(page.getByTestId('components-coverage-card')).toBeVisible();
await expect(page.getByTestId('functions-coverage-card')).toBeVisible();

// Verify coverage percentages are valid numbers
const overallPercent = await page.getByTestId('overall-coverage-percent').textContent();
expect(parseFloat(overallPercent.replace('%', ''))).toBeGreaterThanOrEqual(0);
expect(parseFloat(overallPercent.replace('%', ''))).toBeLessThanOrEqual(100);
```

### 2. Charts Rendering & Interaction
```javascript
// Verify charts load and render
await expect(page.getByTestId('coverage-by-module-chart')).toBeVisible();
await expect(page.getByTestId('coverage-trend-chart')).toBeVisible();
await expect(page.getByTestId('gap-distribution-chart')).toBeVisible();

// Test chart interaction - click on module bar
const moduleBar = page.getByTestId('module-bar').first();
if (await moduleBar.isVisible()) {
  await moduleBar.click();
  // Chart should highlight or show details
  await expect(page.getByTestId('chart-tooltip')).toBeVisible();
}

// Verify chart legends are present
await expect(page.getByTestId('chart-legend')).toHaveCount(3);
```

### 3. Gaps List Verification  
```javascript
// Verify gaps panel and list
await expect(page.getByTestId('gaps-panel')).toBeVisible();
await expect(page.getByTestId('gaps-list')).toBeVisible();

const gapCount = await page.getByTestId('gap-item').count();
expect(gapCount).toBeGreaterThan(0);

// Verify gap items have required elements
const firstGap = page.getByTestId('gap-item').first();
await expect(firstGap.getByTestId('gap-severity-badge')).toBeVisible();
await expect(firstGap.getByTestId('gap-title')).toBeVisible();
await expect(firstGap.getByTestId('gap-module')).toBeVisible();

// Test gap expansion
await firstGap.getByTestId('expand-gap-details').click();
await expect(firstGap.getByTestId('gap-details-panel')).toBeVisible();
await expect(firstGap.getByTestId('gap-recommendation')).toBeVisible();
```

### 4. AI Insights Validation
```javascript  
// Verify insights panel renders
await expect(page.getByTestId('insights-panel')).toBeVisible();
await expect(page.getByTestId('insights-list')).toBeVisible();

const insightCount = await page.getByTestId('insight-item').count();
expect(insightCount).toBeGreaterThan(0);

// Verify insight structure
const firstInsight = page.getByTestId('insight-item').first();
await expect(firstInsight.getByTestId('insight-category-badge')).toBeVisible();
await expect(firstInsight.getByTestId('insight-priority')).toBeVisible();
await expect(firstInsight.getByTestId('insight-title')).toBeVisible();
await expect(firstInsight.getByTestId('insight-confidence')).toBeVisible();

// Test insight expansion  
await firstInsight.getByTestId('expand-insight').click();
await expect(firstInsight.getByTestId('insight-details')).toBeVisible();
await expect(firstInsight.getByTestId('insight-action-items')).toBeVisible();
```

### 5. Filtering & Search Functionality
```javascript
// Test gaps filtering
await page.getByTestId('gaps-filter-severity').selectOption('high');
const filteredGaps = await page.getByTestId('gap-item').count();
// Verify all visible gaps have high severity
await expect(page.getByTestId('gap-severity-badge').filter({ hasText: /high/i })).toHaveCount(filteredGaps);

// Test insights filtering
await page.getByTestId('insights-filter-category').selectOption('coverage');
const filteredInsights = await page.getByTestId('insight-item').count();
// Verify all visible insights are coverage-related
await expect(page.getByTestId('insight-category-badge').filter({ hasText: /coverage/i })).toHaveCount(filteredInsights);

// Clear filters
await page.getByTestId('clear-gaps-filters').click();
await page.getByTestId('insights-filter-category').selectOption('all');
```

### 6. Data Accuracy Cross-Checks
```javascript
// Verify gap distribution chart matches gaps list
const criticalGapsInChart = await page.evaluate(() => {
  // This would extract data from the pie chart segments
  const criticalSegment = document.querySelector('[data-testid="pie-segment"][data-severity="critical"]');
  return criticalSegment ? parseInt(criticalSegment.getAttribute('data-value')) : 0;
});

const criticalGapsInList = await page.getByTestId('gap-item').filter({
  has: page.getByTestId('gap-severity-badge').filter({ hasText: /critical/i })
}).count();

expect(criticalGapsInChart).toBe(criticalGapsInList);

// Verify coverage consistency across cards and charts
const overallCoverage = parseFloat(await page.getByTestId('overall-coverage-percent').textContent().replace('%', ''));
// This coverage should be reflected accurately in the main chart
```

## Empty States
- No coverage data: "Coverage analysis not available" with "Run tests to generate data"
- No gaps found: "Great! No significant gaps detected" with celebration icon
- No insights: "Generating insights..." with refresh option
- Chart data unavailable: "Chart data loading..." with skeleton

## Loading States
- Page load: Skeleton cards and chart placeholders
- Chart rendering: Shimmer effect on chart areas
- Insight generation: Spinning indicator with "Analyzing..." text
- Gap analysis: Progressive loading of gap items

## Error Handling
- Coverage calculation failure: Error card with retry option
- Chart render failure: "Chart unavailable" with fallback table
- AI insights failure: "Insights temporarily unavailable" with refresh
- Network errors: Offline mode with cached data where available

## Accessibility Features  
- All charts have accessible descriptions and data tables
- Coverage percentages announced to screen readers
- Color-blind friendly chart colors with patterns/textures
- Keyboard navigation through interactive chart elements
- Gap and insight priority clearly indicated with text + color
- Proper ARIA roles for dynamic content updates
- Focus management in expandable panels