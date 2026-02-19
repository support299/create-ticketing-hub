import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Check, Undo2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useCheckInSeat, useCheckOutSeat } from '@/hooks/useSeatAssignments';
import { useCheckInAttendee, useCheckOutAttendee } from '@/hooks/useAttendees';
import { useQueryClient } from '@tanstack/react-query';

interface AttendanceRecord {
  seatId: string;
  attendeeId: string;
  name: string;
  email: string;
  phone: string;
  eventTitle: string;
  mainPurchaser: string;
  checkedInAt: string | null;
}

interface AttendanceTableProps {
  searchQuery?: string;
}

function useAttendanceRecords() {
  return useQuery({
    queryKey: ['attendance_records'],
    queryFn: async () => {
      const { data: seats, error: seatsError } = await supabase
        .from('seat_assignments')
        .select('id, attendee_id, name, email, phone, checked_in_at')
        .not('name', 'is', null)
        .order('checked_in_at', { ascending: false, nullsFirst: false });

      if (seatsError) throw seatsError;
      if (!seats || seats.length === 0) return [];

      const attendeeIds = [...new Set(seats.map(s => s.attendee_id))];

      const { data: attendees, error: attError } = await supabase
        .from('attendees')
        .select('id, event_title, contact_id')
        .in('id', attendeeIds);

      if (attError) throw attError;

      const contactIds = [...new Set((attendees || []).map(a => a.contact_id))];
      const { data: contacts, error: conError } = await supabase
        .from('contacts')
        .select('id, name')
        .in('id', contactIds);

      if (conError) throw conError;

      const attendeeMap = new Map((attendees || []).map(a => [a.id, a]));
      const contactMap = new Map((contacts || []).map(c => [c.id, c]));

      const records: AttendanceRecord[] = seats.map(seat => {
        const attendee = attendeeMap.get(seat.attendee_id);
        const contact = attendee ? contactMap.get(attendee.contact_id) : null;
        return {
          seatId: seat.id,
          attendeeId: seat.attendee_id,
          name: seat.name || '',
          email: seat.email || '',
          phone: seat.phone || '',
          eventTitle: attendee?.event_title || '',
          mainPurchaser: contact?.name || '',
          checkedInAt: seat.checked_in_at,
        };
      });

      return records;
    },
  });
}

export function AttendanceTable({ searchQuery = '' }: AttendanceTableProps) {
  const { data: records = [], isLoading } = useAttendanceRecords();
  const checkInSeat = useCheckInSeat();
  const checkInAttendee = useCheckInAttendee();
  const checkOutSeat = useCheckOutSeat();
  const checkOutAttendee = useCheckOutAttendee();
  const queryClient = useQueryClient();

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.eventTitle.toLowerCase().includes(q) ||
      r.mainPurchaser.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  const handleCheckIn = (record: AttendanceRecord) => {
    checkInSeat.mutate(record.seatId, {
      onSuccess: () => {
        checkInAttendee.mutate(record.attendeeId, {
          onSuccess: () => {
            toast.success('Checked in successfully', {
              description: `${record.name} has been checked in.`,
            });
            queryClient.invalidateQueries({ queryKey: ['attendance_records'] });
          },
        });
      },
      onError: () => toast.error('Failed to check in'),
    });
  };

  const handleCheckOut = (record: AttendanceRecord) => {
    checkOutSeat.mutate(record.seatId, {
      onSuccess: () => {
        checkOutAttendee.mutate(record.attendeeId, {
          onSuccess: () => {
            toast.success('Checked out successfully', {
              description: `${record.name} has been checked out.`,
            });
            queryClient.invalidateQueries({ queryKey: ['attendance_records'] });
          },
        });
      },
      onError: () => toast.error('Failed to check out'),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (filteredRecords.length === 0) {
    return (
      <div className="text-center py-12 rounded-2xl border border-dashed border-border">
        <p className="text-muted-foreground">
          {searchQuery ? 'No matching attendees found.' : 'No assigned attendees yet.'}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-display">Name</TableHead>
            <TableHead className="font-display">Email</TableHead>
            <TableHead className="font-display">Phone</TableHead>
            <TableHead className="font-display">Event</TableHead>
            <TableHead className="font-display">Main Purchaser</TableHead>
            <TableHead className="font-display">Status</TableHead>
            <TableHead className="font-display">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRecords.map((record) => (
            <TableRow key={record.seatId} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-medium">{record.name}</TableCell>
              <TableCell className="text-sm">{record.email}</TableCell>
              <TableCell className="text-sm">{record.phone || '—'}</TableCell>
              <TableCell className="max-w-[200px] truncate">{record.eventTitle}</TableCell>
              <TableCell className="text-sm">{record.mainPurchaser}</TableCell>
              <TableCell>
                {record.checkedInAt ? (
                  <Badge variant="default" className="bg-green-600 hover:bg-green-600 text-white">Checked In</Badge>
                ) : (
                  <Badge variant="secondary">Not Checked In</Badge>
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {record.checkedInAt ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-warning hover:text-warning hover:bg-warning/10"
                          onClick={() => handleCheckOut(record)}
                          disabled={checkOutSeat.isPending}
                        >
                          <Undo2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Check Out</TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-success hover:text-success hover:bg-success/10"
                          onClick={() => handleCheckIn(record)}
                          disabled={checkInSeat.isPending}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Check In</TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
