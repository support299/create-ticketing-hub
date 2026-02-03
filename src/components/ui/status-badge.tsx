import { cn } from '@/lib/utils';

type StatusType = 'pending' | 'completed' | 'cancelled' | 'refunded' | 'checked-in' | 'not-checked-in' | 'partial';

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
}

const statusStyles: Record<StatusType, string> = {
  pending: 'bg-warning/15 text-warning border-warning/30',
  completed: 'bg-success/15 text-success border-success/30',
  cancelled: 'bg-destructive/15 text-destructive border-destructive/30',
  refunded: 'bg-muted text-muted-foreground border-muted-foreground/30',
  'checked-in': 'bg-success/15 text-success border-success/30',
  'not-checked-in': 'bg-muted text-muted-foreground border-muted-foreground/30',
  'partial': 'bg-warning/15 text-warning border-warning/30',
};

const statusLabels: Record<StatusType, string> = {
  pending: 'Pending',
  completed: 'Completed',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
  'checked-in': 'Checked In',
  'not-checked-in': 'Not Checked In',
  'partial': 'Partial',
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
        statusStyles[status],
        className
      )}
    >
      {statusLabels[status]}
    </span>
  );
}
