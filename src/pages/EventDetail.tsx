import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Clock, Users, Edit, Trash2, Power } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { getEventById, mockAttendees, mockContacts, checkInAttendee, toggleEventStatus, updateEvent, deleteEvent } from '@/data/mockData';
import { format } from 'date-fns';
import { AttendeesTable } from '@/components/attendees/AttendeesTable';
import { EditEventDialog } from '@/components/events/EditEventDialog';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { toast } from 'sonner';
import { Event } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [, forceUpdate] = useState(0);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  
  const event = getEventById(id || '');

  // Get attendees for this event
  const eventAttendees = mockAttendees
    .filter(a => a.eventTitle === event?.title)
    .map(a => ({
      ...a,
      contact: mockContacts.find(c => c.id === a.contactId)!,
    }))
    .filter(a => a.contact);

  const handleCheckIn = (attendeeId: string) => {
    const attendee = eventAttendees.find(a => a.id === attendeeId);
    checkInAttendee(attendeeId);
    toast.success('Checked in successfully!', {
      description: `${attendee?.contact.name} has been checked in.`,
    });
    forceUpdate(n => n + 1);
  };

  const handleToggleStatus = () => {
    if (event) {
      toggleEventStatus(event.id);
      toast.success(event.isActive ? 'Event deactivated' : 'Event activated', {
        description: event.isActive 
          ? 'This event is now inactive and hidden from public view.'
          : 'This event is now active and open for registration.',
      });
      forceUpdate(n => n + 1);
    }
  };

  const handleEventUpdated = (updatedEvent: Event) => {
    updateEvent(updatedEvent.id, updatedEvent);
    forceUpdate(n => n + 1);
  };

  const handleDeleteEvent = () => {
    if (event) {
      deleteEvent(event.id);
      toast.success('Event deleted', {
        description: `"${event.title}" has been permanently deleted.`,
      });
      navigate('/events');
    }
  };

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
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-white font-display">{event.title}</h1>
              <span className={cn(
                'px-3 py-1 rounded-full text-xs font-medium',
                event.isActive 
                  ? 'bg-success/90 text-success-foreground' 
                  : 'bg-muted/90 text-muted-foreground'
              )}>
                {event.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="text-white/80 max-w-2xl">{event.description}</p>
          </div>
          <div className="absolute top-4 right-4 flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setIsEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-1" />
              Edit
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>

        {/* Status Toggle Card */}
        <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              event.isActive ? "bg-success/10" : "bg-muted"
            )}>
              <Power className={cn("h-5 w-5", event.isActive ? "text-success" : "text-muted-foreground")} />
            </div>
            <div>
              <p className="font-semibold">Event Status</p>
              <p className="text-sm text-muted-foreground">
                {event.isActive 
                  ? 'This event is active and open for registration' 
                  : 'This event is inactive and hidden from public'}
              </p>
            </div>
          </div>
          <Switch
            checked={event.isActive}
            onCheckedChange={handleToggleStatus}
          />
        </div>

        {/* Event Info */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Start Date</p>
              <p className="font-semibold">{format(new Date(event.date), 'MMM d, yyyy')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">End Date</p>
              <p className="font-semibold">{format(new Date(event.endDate), 'MMM d, yyyy')}</p>
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
              <p className="text-xs text-muted-foreground">Capacity</p>
              <p className="font-semibold">{event.capacity}</p>
            </div>
          </div>
        </div>

        {/* Attendees */}
        {eventAttendees.length > 0 && (
          <div>
            <div className="mb-6">
              <h3 className="text-lg font-semibold font-display">Attendees</h3>
              <p className="text-sm text-muted-foreground">{eventAttendees.length} registered attendees</p>
            </div>
            <AttendeesTable attendees={eventAttendees} onCheckIn={handleCheckIn} />
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <EditEventDialog
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        event={event}
        onEventUpdated={handleEventUpdated}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Event</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{event.title}"? This action cannot be undone and all associated data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteEvent}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
