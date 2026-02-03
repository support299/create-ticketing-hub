import { useState } from 'react';
import { Attendee, Contact } from '@/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { Button } from '@/components/ui/button';
import { Check, QrCode, Mail } from 'lucide-react';
import { format } from 'date-fns';
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

interface AttendeesTableProps {
  attendees: (Attendee & { contact: Contact })[];
  onCheckIn?: (attendeeId: string) => void;
}

export function AttendeesTable({ attendees, onCheckIn }: AttendeesTableProps) {
  const [selectedAttendee, setSelectedAttendee] = useState<(Attendee & { contact: Contact }) | null>(null);

  const handleSendTicket = (attendee: Attendee & { contact: Contact }) => {
    toast.success(`Ticket sent to ${attendee.contact.email}`, {
      description: `Ticket ${attendee.ticketNumber} has been emailed.`,
    });
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
              <TableHead className="font-display">Ticket Type</TableHead>
              <TableHead className="font-display">Status</TableHead>
              <TableHead className="font-display">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attendees.map((attendee) => (
              <TableRow key={attendee.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-sm">{attendee.ticketNumber}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{attendee.contact.name}</p>
                    <p className="text-xs text-muted-foreground">{attendee.contact.email}</p>
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{attendee.eventTitle}</TableCell>
                <TableCell>{attendee.ticketTypeName}</TableCell>
                <TableCell>
                  <StatusBadge 
                    status={attendee.checkedInAt ? 'checked-in' : 'not-checked-in'} 
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedAttendee(attendee)}
                    >
                      <QrCode className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSendTicket(attendee)}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    {!attendee.checkedInAt && onCheckIn && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-success hover:text-success hover:bg-success/10"
                        onClick={() => onCheckIn(attendee.id)}
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
