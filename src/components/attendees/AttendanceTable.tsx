import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Check, Undo2, UserX, Loader2, ShieldCheck } from 'lucide-react';
import { confirmContactOnCheckIn, splitName } from '@/lib/confirmContact';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
import { useCheckInSeat, useCheckOutSeat } from '@/hooks/useSeatAssignments';
import { useCheckInAttendee, useCheckOutAttendee } from '@/hooks/useAttendees';

interface AttendanceRecord {
  seatId: string;
  attendeeId: string;
  name: string;
  email: string;
  phone: string;
  eventTitle: string;
  mainPurchaser: string;
  checkedInAt: string | null;
  ticketNumber: string;
  isMinor: boolean;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
  locationId: string;
}

interface AttendanceTableProps {
  searchQuery?: string;
}

type ConfirmAction = {
  type: 'checkin' | 'checkout' | 'unassign';
  record: AttendanceRecord;
};

function useAttendanceRecords() {
  return useQuery({
    queryKey: ['attendance_records'],
    queryFn: async () => {
      const { data: seats, error: seatsError } = await supabase
        .from('seat_assignments')
        .select('id, attendee_id, name, email, phone, checked_in_at, is_minor, guardian_name, guardian_email, guardian_phone')
        .not('name', 'is', null)
        .order('checked_in_at', { ascending: false, nullsFirst: false });

      if (seatsError) throw seatsError;
      if (!seats || seats.length === 0) return [];

      const attendeeIds = [...new Set(seats.map(s => s.attendee_id))];

      const { data: attendees, error: attError } = await supabase
        .from('attendees')
        .select('id, event_title, contact_id, ticket_number, location_id')
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
          ticketNumber: attendee?.ticket_number || '',
          isMinor: seat.is_minor ?? false,
          guardianName: seat.guardian_name || '',
          guardianEmail: seat.guardian_email || '',
          guardianPhone: seat.guardian_phone || '',
          locationId: attendee?.location_id || '',
        };
      });

      return records;
    },
  });
}

function useUnassignSeat() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (seatId: string) => {
      const { error } = await supabase
        .from('seat_assignments')
        .update({ name: null, email: null, phone: null, checked_in_at: null })
        .eq('id', seatId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendance_records'] });
      queryClient.invalidateQueries({ queryKey: ['seat_assignments'] });
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    },
  });
}

const confirmMessages: Record<ConfirmAction['type'], { title: string; description: (name: string) => string; action: string }> = {
  checkin: {
    title: 'Confirm Check-In',
    description: (name) => `Are you sure you want to check in ${name}?`,
    action: 'Check In',
  },
  checkout: {
    title: 'Confirm Check-Out',
    description: (name) => `Are you sure you want to check out ${name}?`,
    action: 'Check Out',
  },
  unassign: {
    title: 'Confirm Unassign',
    description: (name) => `Are you sure you want to unassign ${name} from this seat? This will remove their details and check-in status.`,
    action: 'Unassign',
  },
};

export function AttendanceTable({ searchQuery = '' }: AttendanceTableProps) {
  const { data: records = [], isLoading } = useAttendanceRecords();
  const checkInSeat = useCheckInSeat();
  const checkInAttendee = useCheckInAttendee();
  const checkOutSeat = useCheckOutSeat();
  const checkOutAttendee = useCheckOutAttendee();
  const unassignSeat = useUnassignSeat();
  const queryClient = useQueryClient();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction | null>(null);
  const [guardianRecord, setGuardianRecord] = useState<AttendanceRecord | null>(null);

  const filteredRecords = useMemo(() => {
    if (!searchQuery) return records;
    const q = searchQuery.toLowerCase();
    return records.filter(r =>
      r.name.toLowerCase().includes(q) ||
      r.email.toLowerCase().includes(q) ||
      r.phone.toLowerCase().includes(q) ||
      r.eventTitle.toLowerCase().includes(q) ||
      r.mainPurchaser.toLowerCase().includes(q) ||
      r.ticketNumber.toLowerCase().includes(q)
    );
  }, [records, searchQuery]);

  const handleConfirm = () => {
    if (!confirmAction) return;
    const { type, record } = confirmAction;
    setConfirmAction(null);

    if (type === 'checkin') {
      checkInSeat.mutate(record.seatId, {
        onSuccess: () => {
          checkInAttendee.mutate(record.attendeeId, {
            onSuccess: () => {
              const email = record.isMinor ? record.guardianEmail : record.email;
              const phone = record.isMinor ? record.guardianPhone : record.phone;
              const { firstName, lastName } = splitName(record.name);
              confirmContactOnCheckIn({
                email,
                firstName,
                lastName,
                phone,
                eventName: record.eventTitle,
                locationId: record.locationId,
              });
              toast.success('Checked in successfully', { description: `${record.name} has been checked in.` });
              queryClient.invalidateQueries({ queryKey: ['attendance_records'] });
            },
          });
        },
        onError: () => toast.error('Failed to check in'),
      });
    } else if (type === 'checkout') {
      checkOutSeat.mutate(record.seatId, {
        onSuccess: () => {
          checkOutAttendee.mutate(record.attendeeId, {
            onSuccess: () => {
              toast.success('Checked out successfully', { description: `${record.name} has been checked out.` });
              queryClient.invalidateQueries({ queryKey: ['attendance_records'] });
            },
          });
        },
        onError: () => toast.error('Failed to check out'),
      });
    } else if (type === 'unassign') {
      unassignSeat.mutate(record.seatId, {
        onSuccess: () => {
          toast.success('Seat unassigned', { description: `${record.name} has been removed from the seat.` });
        },
        onError: () => toast.error('Failed to unassign seat'),
      });
    }
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

  const msg = confirmAction ? confirmMessages[confirmAction.type] : null;

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-display">Ticket #</TableHead>
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
                <TableCell className="font-mono text-sm">{record.ticketNumber}</TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-1.5">
                    {record.name}
                    {record.isMinor && (
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-amber-500/40 text-amber-600 dark:text-amber-400">Child</Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm">{record.email || '—'}</TableCell>
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
                    {record.isMinor && (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
                            onClick={() => setGuardianRecord(record)}
                          >
                            <ShieldCheck className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View Guardian Details</TooltipContent>
                      </Tooltip>
                    )}
                    {record.checkedInAt ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-warning hover:text-warning hover:bg-warning/10"
                            onClick={() => setConfirmAction({ type: 'checkout', record })}
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
                            onClick={() => setConfirmAction({ type: 'checkin', record })}
                            disabled={checkInSeat.isPending}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Check In</TooltipContent>
                      </Tooltip>
                    )}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setConfirmAction({ type: 'unassign', record })}
                          disabled={unassignSeat.isPending}
                        >
                          <UserX className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Unassign Seat</TooltipContent>
                    </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!confirmAction} onOpenChange={(open) => { if (!open) setConfirmAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{msg?.title}</AlertDialogTitle>
            <AlertDialogDescription>
              {msg?.description(confirmAction?.record.name || '')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {msg?.action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!guardianRecord} onOpenChange={(open) => { if (!open) setGuardianRecord(null); }}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              Guardian Details
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <p className="text-xs text-muted-foreground">Child</p>
              <p className="font-medium">{guardianRecord?.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Guardian Name</p>
              <p className="font-medium">{guardianRecord?.guardianName || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Guardian Email</p>
              <p className="font-medium">{guardianRecord?.guardianEmail || '—'}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Guardian Phone</p>
              <p className="font-medium">{guardianRecord?.guardianPhone || '—'}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
