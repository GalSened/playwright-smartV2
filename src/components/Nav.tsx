import { NavLink } from 'react-router-dom';
import { cn } from '@/app/utils';
import { BarChart3, Database, FileText, Home, TestTube, BrainCircuit, Upload, Wrench, Calendar, Bot, PenTool } from 'lucide-react';
import { DarkModeToggle } from './DarkModeToggle';

const navItems = [
  {
    to: '/',
    label: 'Dashboard',
    icon: Home,
    testId: 'nav-dashboard',
    priority: 'primary',
  },
  {
    to: '/test-bank',
    label: 'Test Bank',
    icon: TestTube,
    testId: 'nav-test-bank',
    priority: 'primary',
  },
  {
    to: '/wesign',
    label: 'WeSign',
    icon: PenTool,
    testId: 'nav-wesign',
    priority: 'primary',
  },
  {
    to: '/scheduler',
    label: 'Scheduler',
    icon: Calendar,
    testId: 'nav-scheduler',
    priority: 'secondary',
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: FileText,
    testId: 'nav-reports',
    priority: 'secondary',
  },
  {
    to: '/self-healing',
    label: 'Self-Healing',
    icon: Wrench,
    testId: 'nav-self-healing',
    priority: 'secondary',
  },
  {
    to: '/ai-assistant',
    label: 'AI Assistant',
    icon: BrainCircuit,
    testId: 'nav-ai-assistant',
    priority: 'tools',
  },
  {
    to: '/knowledge-upload',
    label: 'Knowledge Base',
    icon: Upload,
    testId: 'nav-knowledge-upload',
    priority: 'tools',
  },
  {
    to: '/sub-agents',
    label: 'Sub-Agents',
    icon: Bot,
    testId: 'nav-sub-agents',
    priority: 'tools',
  },
];

export function Nav() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">QA Intelligence</h1>
            </div>
            <nav className="flex items-center gap-1">
              {/* Primary Navigation */}
              {navItems.filter(item => item.priority === 'primary').map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    data-testid={item.testId}
                    className={({ isActive }) =>
                      cn(
                        'nav-link flex items-center gap-2 font-medium',
                        isActive && 'active'
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}

              {/* Divider */}
              <div className="w-px h-6 bg-border mx-2" />

              {/* Secondary Navigation */}
              {navItems.filter(item => item.priority === 'secondary').map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    data-testid={item.testId}
                    className={({ isActive }) =>
                      cn(
                        'nav-link flex items-center gap-2 text-sm',
                        isActive && 'active'
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}

              {/* Tools Dropdown - Simplified for now */}
              <div className="w-px h-6 bg-border mx-2" />
              {navItems.filter(item => item.priority === 'tools').slice(0, 2).map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    data-testid={item.testId}
                    className={({ isActive }) =>
                      cn(
                        'nav-link flex items-center gap-2 text-sm text-muted-foreground',
                        isActive && 'active'
                      )
                    }
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-sm text-muted-foreground">
              Environment: <span className="text-foreground font-medium">Staging</span>
            </div>
            <DarkModeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}