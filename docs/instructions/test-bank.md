# Test Bank Page Instructions

## Purpose & KPIs  
- Browse and manage test definitions
- Create test suites by selecting multiple tests
- Execute suites and track run status
- Success metrics: Suite creation < 30s, run initiation success rate > 95%

## Data Models

### TestDefinition
```typescript
interface TestDefinition {
  id: string;
  name: string;
  module: string;
  tags: string[];
  risk: 'low' | 'med' | 'high';
  description?: string;
  estimatedDuration?: number;
}
```

### SuiteDraft
```typescript
interface SuiteDraft {
  name: string;
  description?: string;
  testIds: string[];
  tags: string[];
}
```

### SuiteRunRequest
```typescript
interface SuiteRunRequest {
  suiteId: string;
  environment?: string;
  parallel?: boolean;
  tags?: string[];
}
```

## User Flows
1. **Filter & Search**: Filter by module, risk, tags; search by name
2. **Test Selection**: Multi-select tests via checkboxes 
3. **Suite Building**: Create suite with name, add selected tests
4. **Suite Execution**: Run suite, show progress, navigate to results

## UI Layout
```
┌─────────────────────────────────────┐
│ Filters & Search Bar                │
├─────────────────┬───────────────────┤
│ Tests Table     │ Suite Builder     │
│ (with selection)│ (selected tests)  │
├─────────────────┴───────────────────┤
│ Existing Suites List               │
└─────────────────────────────────────┘
```

## Table Configuration (TanStack Table)
### Columns
- Selection checkbox
- Name (sortable, searchable)
- Module (filterable)
- Risk level (badge, filterable)
- Tags (chip list)
- Duration estimate
- Actions (run single test)

### Features
- Row selection (multi)
- Column sorting
- Global search
- Tag filtering
- Pagination (50 per page)

## MCP Test Selectors

### Page Structure
- `[data-testid="test-bank-page"]` - Main container
- `[data-testid="tests-section"]` - Tests table section
- `[data-testid="suite-builder-section"]` - Suite creation section
- `[data-testid="existing-suites-section"]` - Saved suites section

### Filters & Search
- `[data-testid="test-search"]` - Search input field
- `[data-testid="filter-module"]` - Module filter dropdown
- `[data-testid="filter-risk"]` - Risk level filter
- `[data-testid="filter-tags"]` - Tags multi-select
- `[data-testid="clear-filters"]` - Reset filters button

### Tests Table
- `[data-testid="tests-table"]` - Main table container
- `[data-testid="test-row"]` - Individual test rows
- `[data-testid="test-checkbox"]` - Selection checkboxes
- `[data-testid="test-name"]` - Test name cells
- `[data-testid="test-module"]` - Module cells
- `[data-testid="test-risk-badge"]` - Risk level badges
- `[data-testid="test-tags"]` - Tags containers
- `[data-testid="test-duration"]` - Duration estimates
- `[data-testid="run-single-test"]` - Single test run buttons
- `[data-testid="select-all-tests"]` - Select all checkbox

### Suite Builder
- `[data-testid="suite-builder-panel"]` - Builder container
- `[data-testid="selected-tests-count"]` - Count display
- `[data-testid="selected-tests-list"]` - Selected tests list
- `[data-testid="suite-name-input"]` - Suite name field
- `[data-testid="suite-description-input"]` - Description field
- `[data-testid="suite-tags-input"]` - Tags input
- `[data-testid="create-suite-button"]` - Create suite button
- `[data-testid="clear-selection"]` - Clear selection button
- `[data-testid="estimated-duration"]` - Total duration display

### Suite Execution
- `[data-testid="run-suite-button"]` - Run suite button
- `[data-testid="run-options"]` - Execution options panel
- `[data-testid="parallel-execution"]` - Parallel run checkbox
- `[data-testid="environment-select"]` - Environment selector
- `[data-testid="start-run-button"]` - Final run trigger
- `[data-testid="run-progress"]` - Progress indicator
- `[data-testid="run-status"]` - Current status display

### Existing Suites
- `[data-testid="suites-list"]` - Suites list container
- `[data-testid="suite-item"]` - Individual suite cards
- `[data-testid="suite-name"]` - Suite name display
- `[data-testid="suite-test-count"]` - Test count badge
- `[data-testid="suite-last-run"]` - Last run info
- `[data-testid="run-existing-suite"]` - Run existing suite button
- `[data-testid="edit-suite"]` - Edit suite button
- `[data-testid="delete-suite"]` - Delete suite button

## EPU Steps & Assertions

### 1. Page Load & Initial State
```javascript
await page.goto('/test-bank');
await expect(page.getByTestId('test-bank-page')).toBeVisible();
await expect(page.getByTestId('page-title')).toHaveText('Test Bank');

// Verify main sections render
await expect(page.getByTestId('tests-section')).toBeVisible();
await expect(page.getByTestId('suite-builder-section')).toBeVisible();
await expect(page.getByTestId('tests-table')).toBeVisible();

// Verify initial state
await expect(page.getByTestId('selected-tests-count')).toHaveText('0 tests selected');
```

### 2. Test Selection & Suite Creation
```javascript
// Search and filter tests
await page.getByTestId('test-search').fill('login');
await expect(page.getByTestId('test-row')).toHaveCount(3); // Assuming 3 login tests

// Select multiple tests
await page.getByTestId('test-checkbox').first().click();
await page.getByTestId('test-checkbox').nth(1).click();
await expect(page.getByTestId('selected-tests-count')).toHaveText('2 tests selected');

// Create suite
await page.getByTestId('suite-name-input').fill('Login Test Suite');
await page.getByTestId('suite-description-input').fill('Comprehensive login testing');
await page.getByTestId('create-suite-button').click();

// Verify suite creation
await expect(page.getByText('Suite created successfully')).toBeVisible();
await expect(page.getByTestId('selected-tests-count')).toHaveText('0 tests selected');
```

### 3. Suite Execution Flow  
```javascript
// Find and run the created suite
const suiteCard = page.getByTestId('suite-item').filter({ hasText: 'Login Test Suite' });
await suiteCard.getByTestId('run-existing-suite').click();

// Configure run options
await expect(page.getByTestId('run-options')).toBeVisible();
await page.getByTestId('parallel-execution').check();
await page.getByTestId('environment-select').selectOption('staging');
await page.getByTestId('start-run-button').click();

// Verify run initiation
await expect(page.getByTestId('run-progress')).toBeVisible();
await expect(page.getByTestId('run-status')).toHaveText('Running...');

// Wait for completion and navigation
await expect(page.getByText('Run completed')).toBeVisible({ timeout: 30000 });
await expect(page).toHaveURL(/\/reports\/.+/);
```

### 4. Table Functionality
```javascript
// Test sorting
await page.getByRole('columnheader', { name: 'Name' }).click();
const firstTestName = await page.getByTestId('test-name').first().textContent();
await page.getByRole('columnheader', { name: 'Name' }).click();
const newFirstTestName = await page.getByTestId('test-name').first().textContent();
expect(firstTestName).not.toBe(newFirstTestName);

// Test filtering
await page.getByTestId('filter-risk').selectOption('high');
await expect(page.getByTestId('test-risk-badge').filter({ hasText: 'HIGH' })).toHaveCount(
  await page.getByTestId('test-row').count()
);

// Test select all
await page.getByTestId('select-all-tests').click();
const rowCount = await page.getByTestId('test-row').count();
await expect(page.getByTestId('selected-tests-count')).toHaveText(`${rowCount} tests selected`);
```

## Empty States
- No tests found: "No tests match your criteria" with clear filters action
- No selected tests: "Select tests to create a suite" 
- No existing suites: "Create your first test suite" with helpful tips

## Loading States
- Initial page load: Skeleton table rows
- Suite creation: Button loading spinner
- Suite execution: Progress bar with status updates
- Search/filter: Dimmed table with spinner

## Error Handling
- Suite creation failure: Toast notification with retry option
- Run execution failure: Error modal with details and retry
- Network errors: Offline banner with refresh action

## Accessibility Features
- Table has proper headers and row/column structure
- All interactive elements are keyboard accessible
- Selection state is announced to screen readers
- Progress indicators have accessible labels
- Error messages are associated with relevant fields