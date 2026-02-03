import { Ticket, TrendingUp } from 'lucide-react';
import { TicketType } from '@/types';
import { format, isPast, isFuture } from 'date-fns';
import { cn } from '@/lib/utils';

interface TicketTypeCardProps {
  ticketType: TicketType;
}

export function TicketTypeCard({ ticketType }: TicketTypeCardProps) {
  const soldPercentage = Math.round((ticketType.sold / ticketType.quantity) * 100);
  const remaining = ticketType.quantity - ticketType.sold;
  
  const salesStarted = isPast(new Date(ticketType.salesStart));
  const salesEnded = isPast(new Date(ticketType.salesEnd));
  const isOnSale = salesStarted && !salesEnded;
  const isSoldOut = remaining === 0;

  const getStatus = () => {
    if (isSoldOut) return { label: 'Sold Out', color: 'bg-destructive/15 text-destructive' };
    if (salesEnded) return { label: 'Ended', color: 'bg-muted text-muted-foreground' };
    if (!salesStarted) return { label: 'Coming Soon', color: 'bg-warning/15 text-warning' };
    return { label: 'On Sale', color: 'bg-success/15 text-success' };
  };

  const status = getStatus();

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card p-5 card-hover">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Ticket className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h4 className="font-semibold font-display">{ticketType.name}</h4>
            <p className="text-2xl font-bold text-primary font-display">
              {ticketType.price === 0 ? 'Free' : `$${ticketType.price}`}
            </p>
          </div>
        </div>
        <span className={cn('rounded-full px-3 py-1 text-xs font-medium', status.color)}>
          {status.label}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Sold</p>
          <p className="font-semibold font-display">{ticketType.sold}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Remaining</p>
          <p className="font-semibold font-display">{remaining}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Revenue</p>
          <p className="font-semibold text-primary font-display">
            ${(ticketType.sold * ticketType.price).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
          <span>{soldPercentage}% sold</span>
          <span>{ticketType.quantity} total</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              isSoldOut ? 'bg-destructive' : 'gradient-primary'
            )}
            style={{ width: `${soldPercentage}%` }}
          />
        </div>
      </div>

      {/* Sale Period */}
      <div className="mt-4 pt-4 border-t border-border text-xs text-muted-foreground">
        <div className="flex justify-between">
          <span>Sales: {format(new Date(ticketType.salesStart), 'MMM d')} - {format(new Date(ticketType.salesEnd), 'MMM d, yyyy')}</span>
        </div>
      </div>
    </div>
  );
}
