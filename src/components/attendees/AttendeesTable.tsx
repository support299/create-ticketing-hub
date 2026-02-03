import { useState } from 'react';
import { Attendee, Contact } from '@/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Check, QrCode, Mail, Undo2 } from 'lucide-react';
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

interface AttendeesTableProps {
  attendees: (Attendee & { contact: Contact })[];
  onCheckIn?: (attendeeId: string) => void;
  onCheckOut?: (attendeeId: string) => void;
}

export function AttendeesTable({ attendees, onCheckIn, onCheckOut }: AttendeesTableProps) {
  const [selectedAttendee, setSelectedAttendee] = useState<(Attendee & { contact: Contact }) | null>(null);

  const handleSendTicket = (attendee: Attendee & { contact: Contact }) => {
    toast.success(`Ticket sent to ${attendee.contact.email}`, {
      description: `Ticket ${attendee.ticketNumber} has been emailed.`,
    });
  };

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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleSendTicket(attendee)}
                          >
                            <Mail className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Send Ticket</TooltipContent>
                      </Tooltip>
                      {canCheckIn && onCheckIn && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-success hover:text-success hover:bg-success/10"
                              onClick={() => onCheckIn(attendee.id)}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Check In</TooltipContent>
                        </Tooltip>
                      )}
                      {canCheckOut && onCheckOut && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-warning hover:text-warning hover:bg-warning/10"
                              onClick={() => onCheckOut(attendee.id)}
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
              <Button
                className="w-full gradient-primary"
                onClick={() => handleSendTicket(selectedAttendee)}
              >
                <Mail className="h-4 w-4 mr-2" />
                Email Ticket
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
