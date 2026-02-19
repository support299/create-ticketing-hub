import { useState } from 'react';
import { Attendee, Contact } from '@/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Check, QrCode, Undo2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  useSeatAssignmentsByAttendee,
  useCheckInSeat,
  useCheckOutSeat,
} from '@/hooks/useSeatAssignments';
import { useCheckInAttendee, useCheckOutAttendee } from '@/hooks/useAttendees';

interface AttendeesTableProps {
  attendees: (Attendee & { contact: Contact })[];
  onCheckIn?: (attendeeId: string) => void;
  onCheckOut?: (attendeeId: string) => void;
}

function SeatCheckOutDialog({
  attendee,
  open,
  onOpenChange,
}: {
  attendee: Attendee & { contact: Contact };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: seats = [], isLoading } = useSeatAssignmentsByAttendee(open ? attendee.id : undefined);
  const checkOutSeat = useCheckOutSeat();
  const checkOutAttendee = useCheckOutAttendee();
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);

  const checkedInSeats = seats.filter(s => !!s.checkedInAt);

  const handleCheckOutSeat = (seatId: string) => {
    checkOutSeat.mutate(seatId, {
      onSuccess: () => {
        checkOutAttendee.mutate(attendee.id, {
          onSuccess: () => {
            const seat = seats.find(s => s.id === seatId);
            toast.success('Check-out complete!', {
              description: `${seat?.name || 'Attendee'} has been checked out.`,
            });
            setSelectedSeatId(null);
            onOpenChange(false);
          },
        });
      },
      onError: () => toast.error('Failed to check out seat'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Select Attendee to Check Out</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            {attendee.contact.name} — {attendee.ticketNumber} ({attendee.checkInCount}/{attendee.totalTickets} checked in)
          </p>

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {checkedInSeats.map((seat) => (
            <button
              key={seat.id}
              onClick={() => setSelectedSeatId(seat.id)}
              className={cn(
                'w-full rounded-xl border p-4 text-left transition-all',
                selectedSeatId === seat.id
                  ? 'border-warning bg-warning/10 ring-2 ring-warning/30'
                  : 'border-border bg-card hover:border-warning/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  selectedSeatId === seat.id ? 'bg-warning text-warning-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {seat.seatNumber}
                </div>
                <div>
                  <p className="font-medium">{seat.name}</p>
                  <p className="text-xs text-muted-foreground">{seat.email}</p>
                </div>
              </div>
            </button>
          ))}

          {selectedSeatId && (
            <Button
              onClick={() => handleCheckOutSeat(selectedSeatId)}
              disabled={checkOutSeat.isPending || checkOutAttendee.isPending}
              size="lg"
              variant="outline"
              className="w-full border-warning text-warning hover:bg-warning/10 h-12"
            >
              <Undo2 className="h-5 w-5 mr-2" />
              {checkOutSeat.isPending ? 'Checking out...' : 'Confirm Check-Out'}
            </Button>
          )}

          {!isLoading && checkedInSeats.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              No seats are currently checked in.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SeatCheckInDialog({
  attendee,
  open,
  onOpenChange,
}: {
  attendee: Attendee & { contact: Contact };
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: seats = [], isLoading } = useSeatAssignmentsByAttendee(open ? attendee.id : undefined);
  const checkInSeat = useCheckInSeat();
  const checkInAttendee = useCheckInAttendee();
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);

  const availableSeats = seats.filter(s => s.name && !s.checkedInAt);
  const unassignedSeats = seats.filter(s => !s.name && !s.checkedInAt);
  const checkedInSeats = seats.filter(s => !!s.checkedInAt);

  const handleCheckInSeat = (seatId: string) => {
    checkInSeat.mutate(seatId, {
      onSuccess: () => {
        checkInAttendee.mutate(attendee.id, {
          onSuccess: () => {
            const seat = seats.find(s => s.id === seatId);
            toast.success('Check-in complete!', {
              description: `${seat?.name || 'Attendee'} has been checked in.`,
            });
            setSelectedSeatId(null);
            onOpenChange(false);
          },
        });
      },
      onError: () => toast.error('Failed to check in seat'),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display">Select Attendee to Check In</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            {attendee.contact.name} — {attendee.ticketNumber} ({attendee.checkInCount}/{attendee.totalTickets} checked in)
          </p>

          {isLoading && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Assigned seats available for check-in */}
          {availableSeats.map((seat) => (
            <button
              key={seat.id}
              onClick={() => {
                setSelectedSeatId(seat.id);
              }}
              className={cn(
                'w-full rounded-xl border p-4 text-left transition-all',
                selectedSeatId === seat.id
                  ? 'border-primary bg-primary/10 ring-2 ring-primary/30'
                  : 'border-border bg-card hover:border-primary/50'
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold',
                  selectedSeatId === seat.id ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                )}>
                  {seat.seatNumber}
                </div>
                <div>
                  <p className="font-medium">{seat.name}</p>
                  <p className="text-xs text-muted-foreground">{seat.email}</p>
                </div>
              </div>
            </button>
          ))}

          {/* Unassigned seats */}
          {unassignedSeats.map((seat) => (
            <div key={seat.id} className="rounded-xl border border-dashed border-border p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-bold">
                  {seat.seatNumber}
                </div>
                <p className="text-sm text-muted-foreground italic">Unassigned — assign a seat before checking in</p>
              </div>
            </div>
          ))}

          {/* Already checked in */}
          {checkedInSeats.length > 0 && (
            <div className="mt-2">
              <p className="text-xs text-muted-foreground mb-2">Already checked in:</p>
              {checkedInSeats.map((seat) => (
                <div key={seat.id} className="rounded-xl border border-success/30 bg-success/5 p-3 mb-2 flex items-center gap-3 opacity-60">
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-success/20 text-success text-xs font-bold">
                    <Check className="h-3.5 w-3.5" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{seat.name}</p>
                    <p className="text-xs text-muted-foreground">{seat.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Check-in button for selected assigned seat */}
          {selectedSeatId && (
            <Button
              onClick={() => handleCheckInSeat(selectedSeatId)}
              disabled={checkInSeat.isPending || checkInAttendee.isPending}
              size="lg"
              className="w-full gradient-primary glow-primary h-12"
            >
              <Check className="h-5 w-5 mr-2" />
              {checkInSeat.isPending ? 'Checking in...' : 'Confirm Check-In'}
            </Button>
          )}

          {!isLoading && availableSeats.length === 0 && unassignedSeats.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-2">
              All seats have been checked in.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function AttendeesTable({ attendees, onCheckOut }: AttendeesTableProps) {
  const [selectedAttendee, setSelectedAttendee] = useState<(Attendee & { contact: Contact }) | null>(null);
  const [checkInAttendee, setCheckInAttendee] = useState<(Attendee & { contact: Contact }) | null>(null);
  const [checkOutAttendee, setCheckOutAttendee] = useState<(Attendee & { contact: Contact }) | null>(null);

  const getCheckInStatus = (attendee: Attendee) => {
    if (attendee.checkInCount === 0) return 'not-checked-in';
    if (attendee.checkInCount >= attendee.totalTickets) return 'checked-in';
    return 'partial';
  };

  return (
    <>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-display">Ticket #</TableHead>
              <TableHead className="font-display">Attendee</TableHead>
              <TableHead className="font-display">Event</TableHead>
              <TableHead className="font-display">Check-ins</TableHead>
              <TableHead className="font-display">Status</TableHead>
              <TableHead className="font-display">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendees.map((attendee) => {
              const status = getCheckInStatus(attendee);
              const canCheckIn = attendee.checkInCount < attendee.totalTickets;
              const canCheckOut = attendee.checkInCount > 0;
              
              return (
                <TableRow key={attendee.id} className="hover:bg-muted/30 transition-colors">
                  <TableCell className="font-mono text-sm">{attendee.ticketNumber}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{attendee.contact.name}</p>
                      <p className="text-xs text-muted-foreground">{attendee.contact.email}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{attendee.eventTitle}</TableCell>
                  <TableCell>
                    <span className="font-medium">
                      {attendee.checkInCount}/{attendee.totalTickets}
                    </span>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={status} />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedAttendee(attendee)}
                          >
                            <QrCode className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>View QR Code</TooltipContent>
                      </Tooltip>
                      {canCheckIn && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-success hover:text-success hover:bg-success/10"
                              onClick={() => setCheckInAttendee(attendee)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Check In</TooltipContent>
                        </Tooltip>
                      )}
                      {canCheckOut && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-warning hover:text-warning hover:bg-warning/10"
                              onClick={() => setCheckOutAttendee(attendee)}
                            >
                              <Undo2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Undo Check-in</TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* QR Code Dialog */}
      <Dialog open={!!selectedAttendee} onOpenChange={() => setSelectedAttendee(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Ticket QR Code</DialogTitle>
          </DialogHeader>
          {selectedAttendee && (
            <div className="flex flex-col items-center gap-4 py-4">
              <img
                src={selectedAttendee.qrCodeUrl}
                alt="Ticket QR Code"
                className="w-48 h-48 rounded-lg border"
              />
              <div className="text-center">
                <p className="font-mono text-lg font-bold">{selectedAttendee.ticketNumber}</p>
                <p className="text-sm text-muted-foreground">{selectedAttendee.contact.name}</p>
                <p className="text-xs text-muted-foreground">{selectedAttendee.eventTitle}</p>
                <p className="text-sm font-medium mt-2">
                  Check-ins: {selectedAttendee.checkInCount}/{selectedAttendee.totalTickets}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Seat Check-In Dialog */}
      {checkInAttendee && (
        <SeatCheckInDialog
          attendee={checkInAttendee}
          open={!!checkInAttendee}
          onOpenChange={(open) => { if (!open) setCheckInAttendee(null); }}
        />
      )}

      {/* Seat Check-Out Dialog */}
      {checkOutAttendee && (
        <SeatCheckOutDialog
          attendee={checkOutAttendee}
          open={!!checkOutAttendee}
          onOpenChange={(open) => { if (!open) setCheckOutAttendee(null); }}
        />
      )}
    </>
  );
}
