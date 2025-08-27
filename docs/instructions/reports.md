# Reports Page Instructions

## Purpose & KPIs
- Display execution history and run artifacts
- Enable drill-down into run details and individual test results  
- Support filtering, sorting, and searching of run records
- Success metrics: Load time < 2s, detail view access < 1s

## Data Models

### RunRecord
```typescript
interface RunRecord {
  id: string;
  suiteId: string;
  suiteName: string;
  startedAt: string;
  finishedAt?: string;
  status: 'queued' | 'running' | 'passed' | 'failed' | 'cancelled';
  environment: string;
  totals: {
    passed: number;
    failed: number;
    skipped: number;
    total: number;
  };
  duration?: number;
  steps?: RunStep[];
  metadata?: Record<string, any>;
}
```

### RunStep
```typescript
interface RunStep {
  id: string;
  testId: string;
  testName: string;
  status: 'passed' | 'failed' | 'skipped';
  startedAt: string;
  finishedAt?: string;
  duration?: number;
  errorMessage?: string;
  logs?: string[];
  screenshots?: string[];
  artifacts?: RunArtifact[];
}
```

### RunArtifact
```typescript
interface RunArtifact {
  id: string;
  type: 'screenshot' | 'video' | 'log' | 'trace' | 'report';
  name: string;
  url: string;
  size?: number;
  createdAt: string;
}
```

## UI Layout
```
┌─────────────────────────────────────┐
│ Filters & Search Bar                │
├─────────────────┬───────────────────┤
│ Runs Table      │ Run Details Panel │
│ (main list)     │ (when run selected)│
│                 │ ├─ Overview        │
│                 │ ├─ Test Steps      │  
│                 │ └─ Artifacts       │
└─────────────────┴───────────────────┘
```

## Table Configuration (TanStack Table)
### Columns
- Status (badge with icon)
- Suite Name (link to details)
- Environment (filterable)
- Started At (sortable, relative time)
- Duration (sortable)
- Results (passed/failed/total bars)
- Actions (view, rerun, export)

### Features  
- Row selection and bulk actions
- Status filtering (passed/failed/running)
- Date range filtering
- Environment filtering
- Suite name search
- Results sorting by pass rate

## Run Details Behavior
- Click row → opens details panel (split view)
- Panel shows: run overview, expandable test steps, artifacts gallery
- Step expansion shows: logs, error details, screenshots
- Artifacts downloadable with preview support

## MCP Test Selectors

### Page Structure
- `[data-testid="reports-page"]` - Main container
- `[data-testid="runs-table-section"]` - Table section
- `[data-testid="run-details-panel"]` - Details panel
- `[data-testid="filters-bar"]` - Filters and search

### Filters & Search
- `[data-testid="runs-search"]` - Search input
- `[data-testid="filter-status"]` - Status filter dropdown
- `[data-testid="filter-environment"]` - Environment filter
- `[data-testid="filter-suite"]` - Suite filter
- `[data-testid="date-range-picker"]` - Date range selector
- `[data-testid="clear-all-filters"]` - Reset filters button
- `[data-testid="active-filters"]` - Applied filters chips

### Runs Table
- `[data-testid="runs-table"]` - Main table
- `[data-testid="run-row"]` - Individual run rows
- `[data-testid="run-status-badge"]` - Status indicators
- `[data-testid="run-suite-name"]` - Suite name links
- `[data-testid="run-environment"]` - Environment cells
- `[data-testid="run-started-at"]` - Start time cells
- `[data-testid="run-duration"]` - Duration cells
- `[data-testid="run-results-bar"]` - Pass/fail progress bars
- `[data-testid="run-passed-count"]` - Passed test counts
- `[data-testid="run-failed-count"]` - Failed test counts
- `[data-testid="run-total-count"]` - Total test counts
- `[data-testid="run-actions"]` - Action buttons
- `[data-testid="view-run-details"]` - View details button
- `[data-testid="rerun-suite"]` - Rerun button
- `[data-testid="export-run"]` - Export button

### Run Details Panel
- `[data-testid="run-details-container"]` - Panel container
- `[data-testid="run-details-header"]` - Header with run info
- `[data-testid="run-overview-section"]` - Overview tab
- `[data-testid="run-steps-section"]` - Steps tab
- `[data-testid="run-artifacts-section"]` - Artifacts tab
- `[data-testid="close-details"]` - Close panel button

### Run Overview
- `[data-testid="run-summary-card"]` - Summary stats
- `[data-testid="run-timeline"]` - Execution timeline
- `[data-testid="run-environment-info"]` - Environment details
- `[data-testid="run-configuration"]` - Run settings
- `[data-testid="run-metadata"]` - Additional metadata

### Test Steps
- `[data-testid="steps-list"]` - Steps container
- `[data-testid="step-item"]` - Individual step items
- `[data-testid="step-name"]` - Step/test names
- `[data-testid="step-status"]` - Step status badges
- `[data-testid="step-duration"]` - Step durations
- `[data-testid="expand-step"]` - Step expand button
- `[data-testid="step-details"]` - Expanded step content
- `[data-testid="step-error-message"]` - Error details
- `[data-testid="step-logs"]` - Log content
- `[data-testid="step-screenshots"]` - Screenshot gallery

### Artifacts
- `[data-testid="artifacts-gallery"]` - Artifacts container
- `[data-testid="artifact-item"]` - Individual artifacts
- `[data-testid="artifact-name"]` - Artifact names
- `[data-testid="artifact-type"]` - Type badges
- `[data-testid="artifact-size"]` - File sizes
- `[data-testid="download-artifact"]` - Download buttons
- `[data-testid="preview-artifact"]` - Preview buttons
- `[data-testid="artifact-preview-modal"]` - Preview modal

### Bulk Actions
- `[data-testid="select-all-runs"]` - Select all checkbox
- `[data-testid="selected-runs-count"]` - Selection counter
- `[data-testid="bulk-actions-bar"]` - Bulk actions toolbar
- `[data-testid="bulk-export"]` - Export selected
- `[data-testid="bulk-delete"]` - Delete selected
- `[data-testid="bulk-rerun"]` - Rerun selected

## EPU Steps & Assertions

### 1. Page Load & Table Rendering
```javascript
await page.goto('/reports');
await expect(page.getByTestId('reports-page')).toBeVisible();
await expect(page.getByTestId('page-title')).toHaveText('Reports');

// Verify table loads with data
await expect(page.getByTestId('runs-table')).toBeVisible();
const rowCount = await page.getByTestId('run-row').count();
expect(rowCount).toBeGreaterThan(0);

// Verify table columns
await expect(page.getByRole('columnheader', { name: 'Status' })).toBeVisible();
await expect(page.getByRole('columnheader', { name: 'Suite' })).toBeVisible();
await expect(page.getByRole('columnheader', { name: 'Results' })).toBeVisible();
```

### 2. Run Details Drill-down
```javascript
// Click on first run row
await page.getByTestId('run-row').first().click();
await expect(page.getByTestId('run-details-panel')).toBeVisible();

// Verify overview displays
await expect(page.getByTestId('run-summary-card')).toBeVisible();
await expect(page.getByTestId('run-timeline')).toBeVisible();

// Switch to steps tab
await page.getByRole('tab', { name: 'Test Steps' }).click();
await expect(page.getByTestId('run-steps-section')).toBeVisible();
await expect(page.getByTestId('steps-list')).toBeVisible();

// Expand a failed step (if any)
const failedStep = page.getByTestId('step-item').filter({ 
  has: page.getByTestId('step-status').filter({ hasText: 'failed' }) 
});
if (await failedStep.count() > 0) {
  await failedStep.first().getByTestId('expand-step').click();
  await expect(failedStep.first().getByTestId('step-details')).toBeVisible();
  await expect(failedStep.first().getByTestId('step-error-message')).toBeVisible();
}
```

### 3. Filtering & Search
```javascript
// Test status filtering
await page.getByTestId('filter-status').selectOption('failed');
await expect(page.getByTestId('run-status-badge').filter({ hasText: 'Failed' })).toHaveCount(
  await page.getByTestId('run-row').count()
);

// Test search functionality  
await page.getByTestId('runs-search').fill('login');
await expect(page.getByTestId('run-suite-name').filter({ hasText: /login/i })).toHaveCount(
  await page.getByTestId('run-row').count()
);

// Clear filters
await page.getByTestId('clear-all-filters').click();
await expect(page.getByTestId('runs-search')).toHaveValue('');
```

### 4. Results Bar Verification
```javascript
// Verify results bars show correct data
const firstRow = page.getByTestId('run-row').first();
const passedCount = await firstRow.getByTestId('run-passed-count').textContent();
const failedCount = await firstRow.getByTestId('run-failed-count').textContent();
const totalCount = await firstRow.getByTestId('run-total-count').textContent();

// Verify totals match
expect(parseInt(passedCount) + parseInt(failedCount)).toBeLessThanOrEqual(parseInt(totalCount));

// Verify results bar reflects counts
const resultsBar = firstRow.getByTestId('run-results-bar');
await expect(resultsBar).toBeVisible();
```

### 5. Artifacts Access
```javascript
// Open a run with artifacts
await page.getByTestId('run-row').first().click();
await page.getByRole('tab', { name: 'Artifacts' }).click();
await expect(page.getByTestId('run-artifacts-section')).toBeVisible();

// If artifacts exist, test download functionality
const artifactItems = page.getByTestId('artifact-item');
if (await artifactItems.count() > 0) {
  await expect(artifactItems.first().getByTestId('artifact-name')).toBeVisible();
  await expect(artifactItems.first().getByTestId('download-artifact')).toBeVisible();
  
  // Test preview if supported
  const previewButton = artifactItems.first().getByTestId('preview-artifact');
  if (await previewButton.isVisible()) {
    await previewButton.click();
    await expect(page.getByTestId('artifact-preview-modal')).toBeVisible();
    await page.keyboard.press('Escape');
  }
}
```

## Empty States
- No runs: "No test runs found" with "Run your first suite" action
- No search results: "No runs match your criteria" with clear filters
- No artifacts: "No artifacts generated for this run"
- No steps: "Run details not available"

## Loading States  
- Initial table load: Skeleton rows
- Details panel load: Skeleton content
- Step expansion: Spinner in step content
- Artifact preview: Loading modal

## Error Handling
- Failed to load runs: Error banner with retry
- Details fetch failure: Error in panel with reload option  
- Artifact download failure: Toast notification
- Network errors: Offline indicator

## Accessibility Features
- Table has proper ARIA labels and relationships
- Status badges use color + text + icons
- Details panel is keyboard navigable
- Step expansion maintains focus
- Screen reader friendly result summaries
- Proper heading hierarchy in details panel