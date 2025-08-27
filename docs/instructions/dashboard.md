# Dashboard Page Instructions

## Purpose & KPIs
- Provide one-glance system overview
- Enable quick access to common actions
- Display environment health and recent activity
- Success metrics: Load time < 1s, click-through to actions

## Data Contracts

### DashboardSnapshot
```typescript
interface DashboardSnapshot {
  environmentStatus: 'healthy' | 'warning' | 'error';
  totalTests: number;
  totalSuites: number;
  lastRunSummary?: {
    id: string;
    status: 'passed' | 'failed' | 'running';
    duration: number;
    passRate: number;
  };
  recentActivity: ActivityItem[];
}
```

### ActivityItem
```typescript
interface ActivityItem {
  id: string;
  type: 'suite_created' | 'run_completed' | 'test_added';
  timestamp: string;
  description: string;
}
```

## UI Wire (Sections & Components)

### Layout
```
┌─────────────────────────────────────┐
│ Environment Status Card             │
├─────────────────┬───────────────────┤
│ Quick Actions   │ Last Run Summary  │
├─────────────────┴───────────────────┤
│ Recent Activity Feed                │
└─────────────────────────────────────┘
```

### Components Used
- `Card` - Container for each widget
- `Stat` - Numeric displays (test counts, pass rates)
- `EmptyState` - When no recent activity
- `Loading` - During data fetch

## MCP Test Selectors

### Navigation & Core Elements
- `[data-testid="dashboard-page"]` - Main container
- `[data-testid="environment-status"]` - Status indicator
- `[data-testid="environment-status-healthy"]` - Green status
- `[data-testid="environment-status-warning"]` - Yellow status  
- `[data-testid="environment-status-error"]` - Red status

### Quick Actions
- `[data-testid="quick-create-suite"]` - Create Suite button
- `[data-testid="quick-run-last"]` - Run Last Suite button
- `[data-testid="quick-open-reports"]` - Open Reports button

### Statistics
- `[data-testid="stat-total-tests"]` - Total tests count
- `[data-testid="stat-total-suites"]` - Total suites count
- `[data-testid="stat-pass-rate"]` - Last run pass rate

### Last Run Summary
- `[data-testid="last-run-card"]` - Container
- `[data-testid="last-run-status"]` - Run status badge
- `[data-testid="last-run-duration"]` - Duration display
- `[data-testid="last-run-details-link"]` - Link to full details

### Recent Activity
- `[data-testid="activity-feed"]` - Activity list container
- `[data-testid="activity-item"]` - Individual activity items
- `[data-testid="activity-empty"]` - Empty state message

## EPU Steps & Assertions

### 1. Page Load Verification
```javascript
// Navigate to dashboard
await page.goto('/');
await expect(page.getByTestId('dashboard-page')).toBeVisible();
await expect(page.getByTestId('page-title')).toHaveText('Dashboard');

// Verify core widgets render
await expect(page.getByTestId('environment-status')).toBeVisible();
await expect(page.getByTestId('stat-total-tests')).toBeVisible();
await expect(page.getByTestId('stat-total-suites')).toBeVisible();
```

### 2. Quick Actions Navigation
```javascript
// Test Create Suite navigation
await page.getByTestId('quick-create-suite').click();
await expect(page).toHaveURL('/test-bank');
await page.goBack();

// Test Reports navigation  
await page.getByTestId('quick-open-reports').click();
await expect(page).toHaveURL('/reports');
await page.goBack();
```

### 3. Last Run Integration (if run exists)
```javascript
// Verify last run summary displays
const lastRunCard = page.getByTestId('last-run-card');
if (await lastRunCard.isVisible()) {
  await expect(page.getByTestId('last-run-status')).toBeVisible();
  await expect(page.getByTestId('last-run-duration')).toBeVisible();
  
  // Test navigation to run details
  await page.getByTestId('last-run-details-link').click();
  await expect(page).toHaveURL(/\/reports\/.+/);
}
```

### 4. Activity Feed Verification
```javascript
// Check activity feed renders
const activityFeed = page.getByTestId('activity-feed');
await expect(activityFeed).toBeVisible();

// Verify either has items or empty state
const hasItems = await page.getByTestId('activity-item').count() > 0;
const hasEmpty = await page.getByTestId('activity-empty').isVisible();
expect(hasItems || hasEmpty).toBe(true);
```

## Error Scenarios
- Network failure: Show error state with retry option
- No data: Display empty states with helpful actions
- Slow loading: Show skeleton/loading states

## Accessibility Features
- Environment status uses color + text + icon
- All buttons have descriptive labels
- Activity feed has proper heading structure
- Skip links for keyboard users