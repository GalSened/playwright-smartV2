import { TestRunScheduler } from '@/components/TestRunScheduler';

export function SchedulerPage() {
  return (
    <div data-testid="scheduler-page">
      <h1 className="text-3xl font-bold mb-8" data-testid="page-title">
        Test Scheduler
      </h1>
      <TestRunScheduler />
    </div>
  );
}