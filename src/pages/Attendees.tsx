import { MainLayout } from '@/components/layout/MainLayout';
import { AttendeesTable } from '@/components/attendees/AttendeesTable';
import { useAttendees, useCheckInAttendee, useCheckOutAttendee } from '@/hooks/useAttendees';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function Attendees() {
  const { data: attendees = [], isLoading } = useAttendees();
  const checkInMutation = useCheckInAttendee();
  const checkOutMutation = useCheckOutAttendee();

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
            <p className="text-muted-foreground mt-1">Manage attendees and tickets</p>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search attendees..." 
              className="pl-9"
            />
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

        {/* Attendees Table */}
        {attendees.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">No attendees yet.</p>
          </div>
        ) : (
          <AttendeesTable 
            attendees={attendees} 
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
          />
        )}
      </div>
    </MainLayout>
  );
}
