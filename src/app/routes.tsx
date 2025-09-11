import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from './AppShell';
import { DashboardPage } from '@/pages/Dashboard/DashboardPage';
import { TestBankPage } from '@/pages/TestBank/TestBankPage';
import { ReportsPage } from '@/pages/Reports/ReportsPage';
import { AnalyticsPage } from '@/pages/Analytics/AnalyticsPage';
import { LoginPage } from '@/pages/Auth/LoginPage';
import { RegisterPage } from '@/pages/Auth/RegisterPage';
import { AITestPage } from '@/pages/AIAssistant/AITestPage';
import { AIAssistantPage } from '@/pages/AIAssistant/AIAssistantPage';
import { KnowledgeUpload } from '@/pages/Knowledge/KnowledgeUpload';
import { KnowledgeBasePage } from '@/pages/Knowledge/KnowledgeBasePage';
import { SelfHealingDashboard } from '@/pages/SelfHealing/SelfHealingDashboard';
import { SchedulerPage } from '@/pages/Scheduler/SchedulerPage';
import { SubAgentsPage } from '@/pages/SubAgents/SubAgentsPage';

export const router = createBrowserRouter([
  {
    path: '/auth/login',
    element: <LoginPage />,
  },
  {
    path: '/auth/register',
    element: <RegisterPage />,
  },
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
      {
        path: 'self-healing',
        element: <SelfHealingDashboard />,
      },
      {
        path: 'ai-test',
        element: <AITestPage />,
      },
      {
        path: 'ai-assistant',
        element: <AIAssistantPage />,
      },
      {
        path: 'knowledge-upload',
        element: <KnowledgeUpload />,
      },
      {
        path: 'knowledge-base',
        element: <KnowledgeBasePage />,
      },
      {
        path: 'scheduler',
        element: <SchedulerPage />,
      },
      {
        path: 'sub-agents',
        element: <SubAgentsPage />,
      },
    ],
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);