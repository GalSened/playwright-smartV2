import { NavLink } from 'react-router-dom';
import { cn } from '@/app/utils';
import { BarChart3, Database, FileText, Home, TestTube } from 'lucide-react';
import { DarkModeToggle } from './DarkModeToggle';

const navItems = [
  {
    to: '/',
    label: 'Dashboard',
    icon: Home,
    testId: 'nav-dashboard',
  },
  {
    to: '/test-bank',
    label: 'Test Bank',
    icon: TestTube,
    testId: 'nav-test-bank',
  },
  {
    to: '/reports',
    label: 'Reports',
    icon: FileText,
    testId: 'nav-reports',
  },
  {
    to: '/analytics',
    label: 'Analytics',
    icon: BarChart3,
    testId: 'nav-analytics',
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
              <h1 className="text-xl font-bold">Playwright Smart</h1>
            </div>
            <nav className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    data-testid={item.testId}
                    className={({ isActive }) =>
                      cn(
                        'nav-link flex items-center gap-2',
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