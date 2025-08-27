import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './AppShell';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';
import { TestBankPage } from '@/pages/TestBank/TestBankPage';
import { ReportsPage } from '@/pages/Reports/ReportsPage';
import { AnalyticsPage } from '@/pages/Analytics/AnalyticsPage';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <AppShell />,
    children: [
      {
        index: true,
        element: <DashboardPage />,
      },
      {
        path: 'test-bank',
        element: <TestBankPage />,
      },
      {
        path: 'reports',
        element: <ReportsPage />,
      },
      {
        path: 'analytics',
        element: <AnalyticsPage />,
      },
    ],
  },
]);