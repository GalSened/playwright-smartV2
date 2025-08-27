import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  TestDefinition,
  Suite,
  RunRecord,
  CoverageMetric,
  GapItem,
  Insight,
  DashboardSnapshot,
  SuiteDraft,
} from './types';

interface AppState {
  // Data
  tests: TestDefinition[];
  suites: Suite[];
  runs: RunRecord[];
  coverage: CoverageMetric[];
  gaps: GapItem[];
  insights: Insight[];
  dashboard: DashboardSnapshot | null;
  
  // UI State
  currentSuite: SuiteDraft | null;
  selectedTests: string[];
  selectedRun: string | null;
  loading: {
    tests: boolean;
    suites: boolean;
    runs: boolean;
    dashboard: boolean;
    analytics: boolean;
  };
  
  // Actions
  setTests: (tests: TestDefinition[]) => void;
  setSuites: (suites: Suite[]) => void;
  setRuns: (runs: RunRecord[]) => void;
  setCoverage: (coverage: CoverageMetric[]) => void;
  setGaps: (gaps: GapItem[]) => void;
  setInsights: (insights: Insight[]) => void;
  setDashboard: (dashboard: DashboardSnapshot) => void;
  
  // UI Actions
  setCurrentSuite: (suite: SuiteDraft | null) => void;
  setSelectedTests: (testIds: string[]) => void;
  toggleTestSelection: (testId: string) => void;
  clearSelection: () => void;
  setSelectedRun: (runId: string | null) => void;
  
  // Loading actions
  setLoading: (key: keyof AppState['loading'], loading: boolean) => void;
  
  // CRUD operations
  addSuite: (suite: Suite) => void;
  updateSuite: (id: string, updates: Partial<Suite>) => void;
  deleteSuite: (id: string) => void;
  addRun: (run: RunRecord) => void;
  updateRun: (id: string, updates: Partial<RunRecord>) => void;
}

export const useAppStore = create<AppState>()(
  devtools(
    (set, get) => ({
      // Initial state
      tests: [],
      suites: [],
      runs: [],
      coverage: [],
      gaps: [],
      insights: [],
      dashboard: null,
      
      currentSuite: null,
      selectedTests: [],
      selectedRun: null,
      loading: {
        tests: false,
        suites: false,
        runs: false,
        dashboard: false,
        analytics: false,
      },
      
      // Data setters
      setTests: (tests) => set({ tests }),
      setSuites: (suites) => set({ suites }),
      setRuns: (runs) => set({ runs }),
      setCoverage: (coverage) => set({ coverage }),
      setGaps: (gaps) => set({ gaps }),
      setInsights: (insights) => set({ insights }),
      setDashboard: (dashboard) => set({ dashboard }),
      
      // UI actions
      setCurrentSuite: (currentSuite) => set({ currentSuite }),
      setSelectedTests: (selectedTests) => set({ selectedTests }),
      toggleTestSelection: (testId) =>
        set((state) => ({
          selectedTests: state.selectedTests.includes(testId)
            ? state.selectedTests.filter((id) => id !== testId)
            : [...state.selectedTests, testId],
        })),
      clearSelection: () => set({ selectedTests: [], currentSuite: null }),
      setSelectedRun: (selectedRun) => set({ selectedRun }),
      
      // Loading
      setLoading: (key, loading) =>
        set((state) => ({
          loading: { ...state.loading, [key]: loading },
        })),
      
      // CRUD operations
      addSuite: (suite) =>
        set((state) => ({ suites: [...state.suites, suite] })),
      updateSuite: (id, updates) =>
        set((state) => ({
          suites: state.suites.map((suite) =>
            suite.id === id ? { ...suite, ...updates } : suite
          ),
        })),
      deleteSuite: (id) =>
        set((state) => ({
          suites: state.suites.filter((suite) => suite.id !== id),
        })),
      addRun: (run) => set((state) => ({ runs: [run, ...state.runs] })),
      updateRun: (id, updates) =>
        set((state) => ({
          runs: state.runs.map((run) =>
            run.id === id ? { ...run, ...updates } : run
          ),
        })),
    }),
    {
      name: 'playwright-smart-store',
    }
  )
);