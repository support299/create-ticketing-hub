import { Calendar, MapPin, Users, Clock, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Event } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface EventCardProps {
  event: Event;
}

export function EventCard({ event }: EventCardProps) {
  const [copied, setCopied] = useState(false);
  const ticketsSold = event.ticketsSold || 0;
  const revenue = ticketsSold * (event.ticketPrice || 0);
  const soldPercentage = event.capacity > 0 ? Math.round((ticketsSold / event.capacity) * 100) : 0;
  const isMultiDay = event.date !== event.endDate;

  const copyEventId = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(event.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Link
      to={`/events/${event.id}`}
      className="group block overflow-hidden rounded-2xl border border-border bg-card card-hover animate-fade-in"
    >
      {/* Cover Image */}
      <div className="relative aspect-[2/1] overflow-hidden">
        <img
          src={event.coverImage}
          alt={event.title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white font-display">{event.title}</h3>
        </div>
        {/* Status Badge */}
        <div className="absolute top-3 right-3">
          <span className={cn(
            'px-3 py-1 rounded-full text-xs font-medium',
            event.isActive 
              ? 'bg-success/90 text-success-foreground' 
              : 'bg-muted/90 text-muted-foreground'
          )}>
            {event.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Calendar className="h-4 w-4 text-primary" />
            <span>
              {format(new Date(event.date), 'MMM d')}
              {isMultiDay && ` - ${format(new Date(event.endDate), 'MMM d')}`}
            </span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4 text-primary" />
            <span>{event.time}</span>
          </div>
          <div className="flex items-center gap-2 text-muted-foreground col-span-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="truncate">{event.venue}</span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">{ticketsSold}/{event.capacity}</span>
            <span className="text-xs text-muted-foreground">({soldPercentage}%)</span>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary font-display">
              {event.ticketPrice === 0 ? 'Free' : `$${revenue.toLocaleString()}`}
            </p>
            <p className="text-xs text-muted-foreground">revenue</p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full gradient-primary transition-all duration-500"
            style={{ width: `${soldPercentage}%` }}
          />
        </div>

        {/* Event ID */}
        <button
          onClick={copyEventId}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg bg-muted/50 hover:bg-muted transition-colors text-left"
        >
          <span className="text-xs text-muted-foreground">ID:</span>
          <code className="text-xs font-mono text-foreground flex-1 truncate">{event.id}</code>
          {copied ? (
            <Check className="h-3.5 w-3.5 text-success shrink-0" />
          ) : (
            <Copy className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
        </button>
      </div>
    </Link>
  );
}
