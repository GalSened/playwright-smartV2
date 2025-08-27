import { Outlet } from 'react-router-dom';
import { Nav } from '@/components/Nav';

export function AppShell() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />
      <main className="container mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}