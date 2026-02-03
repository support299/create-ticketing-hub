import { useState } from 'react';
import { Plus } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { Button } from '@/components/ui/button';
import { useEvents } from '@/hooks/useEvents';
import { Skeleton } from '@/components/ui/skeleton';

export default function Events() {
  const { data: events = [], isLoading } = useEvents();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Events</h1>
            <p className="text-muted-foreground mt-1">Manage your events and ticket sales</p>
          </div>
          <Button className="gradient-primary glow-primary" onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Event
          </Button>
        </div>

        {/* Events Grid */}
        {isLoading ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[300px] rounded-2xl" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">No events yet. Create your first event!</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {events.map((event, index) => (
              <div
                key={event.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <EventCard event={event} />
              </div>
            ))}
          </div>
        )}

        {/* Create Event Dialog */}
        <CreateEventDialog 
          open={isCreateDialogOpen} 
          onOpenChange={setIsCreateDialogOpen}
        />
      </div>
    </MainLayout>
  );
}
