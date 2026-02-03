import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, Users, Edit, Trash2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { TicketTypeCard } from '@/components/events/TicketTypeCard';
import { Button } from '@/components/ui/button';
import { getEventById, getTicketTypesByEventId, mockAttendees, mockContacts } from '@/data/mockData';
import { format } from 'date-fns';
import { AttendeesTable } from '@/components/attendees/AttendeesTable';

export default function EventDetail() {
  const { id } = useParams();
  const event = getEventById(id || '');
  const ticketTypes = getTicketTypesByEventId(id || '');

  // Get attendees for this event (simplified - in real app would filter by event)
  const eventAttendees = mockAttendees
    .filter(a => a.eventTitle === event?.title)
    .map(a => ({
      ...a,
      contact: mockContacts.find(c => c.id === a.contactId)!,
    }))
    .filter(a => a.contact);

  if (!event) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-[50vh] space-y-4">
          <p className="text-muted-foreground">Event not found</p>
          <Link to="/events">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Events
            </Button>
          </Link>
        </div>
      </MainLayout>
    );
  }

  const totalSold = ticketTypes.reduce((acc, t) => acc + t.sold, 0);
  const totalCapacity = ticketTypes.reduce((acc, t) => acc + t.quantity, 0);
  const totalRevenue = ticketTypes.reduce((acc, t) => acc + (t.sold * t.price), 0);

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Back Button */}
        <Link to="/events" className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Events
        </Link>

        {/* Hero Section */}
        <div className="relative overflow-hidden rounded-2xl">
          <img
            src={event.coverImage}
            alt={event.title}
            className="w-full h-64 object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
          <div className="absolute bottom-6 left-6 right-6">
            <h1 className="text-3xl font-bold text-white font-display">{event.title}</h1>
            <p className="text-white/80 mt-2 max-w-2xl">{event.description}</p>
          </div>
          <div className="absolute top-4 right-4 flex gap-2">
            <Button size="sm" variant="secondary">
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="destructive">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>

        {/* Event Info */}
        <div className="grid gap-6 md:grid-cols-4">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Date</p>
              <p className="font-semibold">{format(new Date(event.date), 'MMMM d, yyyy')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Time</p>
              <p className="font-semibold">{event.time}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Venue</p>
              <p className="font-semibold truncate">{event.venue}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Attendance</p>
              <p className="font-semibold">{totalSold} / {totalCapacity}</p>
            </div>
          </div>
        </div>

        {/* Revenue Summary */}
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Revenue</p>
              <p className="text-4xl font-bold font-display text-gradient">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Sell-through Rate</p>
              <p className="text-2xl font-bold font-display">
                {Math.round((totalSold / totalCapacity) * 100)}%
              </p>
            </div>
          </div>
        </div>

        {/* Ticket Types */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold font-display">Ticket Types</h3>
              <p className="text-sm text-muted-foreground">Manage your ticket offerings</p>
            </div>
            <Button variant="outline">Add Ticket Type</Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {ticketTypes.map((ticketType, index) => (
              <div
                key={ticketType.id}
                className="animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <TicketTypeCard ticketType={ticketType} />
              </div>
            ))}
          </div>
        </div>

        {/* Attendees */}
        {eventAttendees.length > 0 && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold font-display">Attendees</h3>
              <p className="text-sm text-muted-foreground">{eventAttendees.length} registered attendees</p>
            </div>
            <AttendeesTable attendees={eventAttendees} />
          </div>
        )}
      </div>
    </MainLayout>
  );
}
