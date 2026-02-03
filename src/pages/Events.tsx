import { useState } from 'react';
import { Plus } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { EventCard } from '@/components/events/EventCard';
import { CreateEventDialog } from '@/components/events/CreateEventDialog';
import { Button } from '@/components/ui/button';
import { mockEvents as initialEvents, mockTicketTypes, getTicketTypesByEventId } from '@/data/mockData';
import { Event } from '@/types';

export default function Events() {
  const [events, setEvents] = useState<Event[]>(initialEvents);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const handleEventCreated = (newEvent: Event) => {
    setEvents(prev => [newEvent, ...prev]);
  };

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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event, index) => (
            <div
              key={event.id}
              className="animate-slide-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <EventCard 
                event={event} 
                ticketTypes={getTicketTypesByEventId(event.id)} 
              />
            </div>
          ))}
        </div>

        {/* Create Event Dialog */}
        <CreateEventDialog 
          open={isCreateDialogOpen} 
          onOpenChange={setIsCreateDialogOpen}
          onEventCreated={handleEventCreated}
        />
      </div>
    </MainLayout>
  );
}
