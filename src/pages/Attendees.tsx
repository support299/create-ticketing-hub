import { useState, useMemo, useRef } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { AttendeesTable } from '@/components/attendees/AttendeesTable';
import { AttendanceTable } from '@/components/attendees/AttendanceTable';
import { useAttendees, useCheckInAttendee, useCheckOutAttendee } from '@/hooks/useAttendees';
import { useEvents } from '@/hooks/useEvents';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Download } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function downloadCsv(headers: string[], rows: string[][], filename: string) {
  const escape = (val: string) => `"${val.replace(/"/g, '""')}"`;
  const csv = [headers.map(escape).join(','), ...rows.map(r => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Attendees() {
  const { data: attendees = [], isLoading } = useAttendees();
  const { data: events = [] } = useEvents();
  const checkInMutation = useCheckInAttendee();
  const checkOutMutation = useCheckOutAttendee();
  const [search, setSearch] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [activeTab, setActiveTab] = useState('tickets');
  const attendanceTableRef = useRef<{ getFilteredRecords: () => { name: string; email: string; phone: string; eventTitle: string; mainPurchaser: string; checkedInAt: string | null; ticketNumber: string }[] }>(null);

  const handleDownloadTicketsCsv = () => {
    if (filteredAttendees.length === 0) return;
    const headers = ['Ticket #', 'Buyer Name', 'Email', 'Event', 'Total Tickets', 'Checked In', 'Status'];
    const rows = filteredAttendees.map(a => [
      a.ticketNumber,
      a.contact.name,
      a.contact.email,
      a.eventTitle,
      String(a.totalTickets),
      String(a.checkInCount),
      a.checkInCount >= a.totalTickets ? 'Fully Checked In' : a.checkInCount > 0 ? 'Partially Checked In' : 'Not Checked In',
    ]);
    downloadCsv(headers, rows, 'ticket-management.csv');
  };

  const handleDownloadAttendanceCsv = () => {
    const records = attendanceTableRef.current?.getFilteredRecords();
    if (!records || records.length === 0) return;
    const headers = ['Ticket #', 'Name', 'Email', 'Phone', 'Event', 'Main Purchaser', 'Status'];
    const rows = records.map(r => [
      r.ticketNumber,
      r.name,
      r.email,
      r.phone,
      r.eventTitle,
      r.mainPurchaser,
      r.checkedInAt ? 'Checked In' : 'Not Checked In',
    ]);
    downloadCsv(headers, rows, 'attendance.csv');
  };

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
        <Tabs defaultValue="tickets" value={activeTab} onValueChange={setActiveTab} className="w-full">
          <div className="flex items-center justify-between">
            <TabsList>
              <TabsTrigger value="tickets">Ticket Management</TabsTrigger>
              <TabsTrigger value="attendance">Attendance</TabsTrigger>
            </TabsList>
            <Button
              variant="outline"
              size="sm"
              onClick={activeTab === 'tickets' ? handleDownloadTicketsCsv : handleDownloadAttendanceCsv}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Download CSV
            </Button>
          </div>

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
            <AttendanceTable ref={attendanceTableRef} searchQuery={search} eventFilter={selectedEventId === 'all' ? 'all' : (events.find(e => e.id === selectedEventId)?.title || 'all')} />
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
}
