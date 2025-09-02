import { cn } from '@/app/utils';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'secondary';
  };
  className?: string;
  testId?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  testId,
}: EmptyStateProps) {
  return (
    <div 
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center',
        // Prevent this empty state from blocking interactions with elements behind it
        !action && 'pointer-events-none',
        className
      )}
      data-testid={testId || 'empty-state'}
      style={!action ? { pointerEvents: 'none' } : undefined}
    >
      <div className={cn(
        'flex items-center justify-center w-16 h-16 mb-6 bg-muted rounded-full',
        !action && 'pointer-events-none'
      )}>
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground mb-6 max-w-sm">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className={cn(
            'button px-4 py-2',
            action.variant === 'primary' && 'button-primary',
            action.variant === 'secondary' && 'button-secondary',
            !action.variant && 'button-primary'
          )}
        >
          {action.label}
        </button>
      )}
    </div>
  );
}