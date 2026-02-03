import { MainLayout } from '@/components/layout/MainLayout';
import { AttendeesTable } from '@/components/attendees/AttendeesTable';
import { getAttendeesWithContacts, checkInAttendee } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { useState } from 'react';

export default function Attendees() {
  const [, forceUpdate] = useState(0);
  
  const attendees = getAttendeesWithContacts();

  const handleCheckIn = (attendeeId: string) => {
    const attendee = attendees.find(a => a.id === attendeeId);
    checkInAttendee(attendeeId);
    toast.success('Checked in successfully!', {
      description: `${attendee?.contact.name} has been checked in.`,
    });
    forceUpdate(n => n + 1);
  };

  const checkedIn = attendees.filter(a => a.checkedInAt).length;

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
            <p className="text-sm text-muted-foreground">Total Attendees</p>
            <p className="text-2xl font-bold font-display">{attendees.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Checked In</p>
            <p className="text-2xl font-bold font-display text-success">{checkedIn}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Not Checked In</p>
            <p className="text-2xl font-bold font-display text-muted-foreground">
              {attendees.length - checkedIn}
            </p>
          </div>
        </div>

        {/* Attendees Table */}
        <AttendeesTable attendees={attendees} onCheckIn={handleCheckIn} />
      </div>
    </MainLayout>
  );
}
