# Playwright Smart - Overall Architecture

## System Overview
Playwright Smart is a web application for managing, running, and analyzing automated tests. It provides a comprehensive dashboard for test management and insights.

## Architecture
- **Frontend**: React + TypeScript + Vite
- **Styling**: TailwindCSS + shadcn/ui
- **Routing**: React Router
- **State**: Zustand (lightweight store)
- **Tables**: TanStack Table
- **Charts**: Recharts
- **Testing**: Playwright MCP integration

## Component Breakdown
```
AppShell (nav + routing)
├── Dashboard (overview + quick actions)
├── TestBank (test management + suite creation)
├── Reports (execution history + details)
└── Analytics (AI insights + coverage)
```

## Routing Map
- `/` → Dashboard
- `/test-bank` → Test Bank
- `/reports` → Reports  
- `/analytics` → Analytics

## State Management (Zustand)
```typescript
interface AppState {
  tests: TestDefinition[];
  suites: Suite[];
  runs: RunRecord[];
  coverage: CoverageMetric[];
  gaps: GapItem[];
  insights: Insight[];
  currentSuite: SuiteDraft | null;
  selectedTests: string[];
}
```

## EPU (End-to-end Product Usecases)
1. **Dashboard Overview**: User lands on Dashboard, sees environment status and quick actions
2. **Suite Creation**: User goes to Test Bank, selects tests → assembles a Suite → runs suite  
3. **Results Review**: Run produces artifacts, User views Reports and opens run details
4. **Analytics Insights**: User views Analytics for coverage gaps and AI insights

## MCP Testing Protocol
After each page increment:
1. Start dev server (`npm run dev`)
2. Use Playwright MCP to navigate to target route
3. Execute EPU actions using `data-testid` selectors
4. Assert expected elements/states
5. If failures occur, fix code and retry until green

## UI Conventions
- **Colors**: Dark-mode friendly with Tailwind palette
- **Layout**: Responsive grid, `rounded-2xl` cards, soft shadows
- **Spacing**: Consistent `p-6`, `gap-4` patterns
- **Focus**: Clear focus states for accessibility
- **Empty States**: Friendly placeholders with actions
- **Loading**: Skeleton states during data fetching

## Accessibility
- Proper ARIA roles and labels
- Keyboard navigation support
- Focus management in modals
- Screen reader friendly text
- Color contrast compliance

## Global Selectors (used across pages)
- `[data-testid="nav-dashboard"]` - Dashboard nav link
- `[data-testid="nav-test-bank"]` - Test Bank nav link  
- `[data-testid="nav-reports"]` - Reports nav link
- `[data-testid="nav-analytics"]` - Analytics nav link
- `[data-testid="page-title"]` - Page header title
- `[data-testid="loading-spinner"]` - Loading indicators
- `[data-testid="empty-state"]` - Empty state messages