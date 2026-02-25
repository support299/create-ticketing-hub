import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AttendeesTable } from '@/components/attendees/AttendeesTable';
import { AttendanceTable } from '@/components/attendees/AttendanceTable';
import { useAttendees, useCheckInAttendee, useCheckOutAttendee } from '@/hooks/useAttendees';
import { useEvents } from '@/hooks/useEvents';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function Attendees() {
  const { data: attendees = [], isLoading } = useAttendees();
  const { data: events = [] } = useEvents();
  const checkInMutation = useCheckInAttendee();
  const checkOutMutation = useCheckOutAttendee();
  const [search, setSearch] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('all');

  const handleCheckIn = (attendeeId: string) => {
    const attendee = attendees.find(a => a.id === attendeeId);
    checkInMutation.mutate(attendeeId, {
      onSuccess: () => {
        toast.success('Checked in successfully!', {
          description: `${attendee?.contact.name} has been checked in.`,
        });
      },
      onError: (error) => {
        toast.error('Failed to check in', {
          description: error instanceof Error ? error.message : undefined,
        });
      },
    });
  };

  const handleCheckOut = (attendeeId: string) => {
    const attendee = attendees.find(a => a.id === attendeeId);
    checkOutMutation.mutate(attendeeId, {
      onSuccess: () => {
        toast.success('Check-in undone', {
          description: `${attendee?.contact.name}'s last check-in has been reversed.`,
        });
      },
      onError: (error) => {
        toast.error('Failed to undo check-in', {
          description: error instanceof Error ? error.message : undefined,
        });
      },
    });
  };

  const totalTickets = attendees.reduce((sum, a) => sum + a.totalTickets, 0);
  const totalCheckedIn = attendees.reduce((sum, a) => sum + a.checkInCount, 0);

  const filteredAttendees = useMemo(() => {
    return attendees.filter(a => {
      if (selectedEventId !== 'all' && a.eventTitle !== events.find(e => e.id === selectedEventId)?.title) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        a.contact.name.toLowerCase().includes(q) ||
        a.contact.email.toLowerCase().includes(q) ||
        a.ticketNumber.toLowerCase().includes(q) ||
        a.eventTitle.toLowerCase().includes(q)
      );
    });
  }, [attendees, search, selectedEventId, events]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Attendees</h1>
            <p className="text-muted-foreground mt-1">Manage tickets and track attendance</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-48 bg-card">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Events</SelectItem>
                {events.map(event => (
                  <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, email, ticket..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Tickets</p>
            <p className="text-2xl font-bold font-display">{totalTickets}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Checked In</p>
            <p className="text-2xl font-bold font-display text-success">{totalCheckedIn}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Remaining</p>
            <p className="text-2xl font-bold font-display text-muted-foreground">
              {totalTickets - totalCheckedIn}
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="tickets" className="w-full">
          <TabsList>
            <TabsTrigger value="tickets">Ticket Management</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="tickets">
            {filteredAttendees.length === 0 ? (
              <div className="text-center py-12 rounded-2xl border border-dashed border-border">
                <p className="text-muted-foreground">
                  {search ? 'No matching tickets found.' : 'No attendees yet.'}
                </p>
              </div>
            ) : (
              <AttendeesTable 
                attendees={filteredAttendees} 
                onCheckIn={handleCheckIn}
                onCheckOut={handleCheckOut}
              />
            )}
          </TabsContent>

          <TabsContent value="attendance">
            <AttendanceTable searchQuery={search} eventFilter={selectedEventId === 'all' ? 'all' : (events.find(e => e.id === selectedEventId)?.title || 'all')} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
