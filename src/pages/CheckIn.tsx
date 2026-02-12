import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { QrCode, Check, X, Search, User, Ticket } from 'lucide-react';
import { useFindAttendeeByTicket, useCheckInAttendee } from '@/hooks/useAttendees';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Attendee, Contact } from '@/types';
import { QrScanner } from '@/components/checkin/QrScanner';

interface CheckInResult {
  success: boolean;
  attendee?: Attendee & { contact: Contact };
  message: string;
}

export default function CheckIn() {
  const [ticketNumber, setTicketNumber] = useState('');
  const [result, setResult] = useState<CheckInResult | null>(null);
  
  const findAttendee = useFindAttendeeByTicket();
  const checkInMutation = useCheckInAttendee();

  const handleLookup = (ticket: string) => {
    const trimmed = ticket.trim();
    if (!trimmed) {
      toast.error('Please enter a ticket number');
      return;
    }

    setTicketNumber(trimmed);

    findAttendee.mutate(trimmed, {
      onSuccess: (attendee) => {
        if (!attendee) {
          setResult({
            success: false,
            message: 'Ticket not found. Please verify the ticket number.',
          });
          return;
        }

        const hasCapacity = attendee.checkInCount < attendee.totalTickets;

        setResult({
          success: hasCapacity,
          attendee,
          message: hasCapacity
            ? `Ticket verified! Checked in ${attendee.checkInCount}/${attendee.totalTickets}.`
            : `All ${attendee.totalTickets} tickets already checked in.`,
        });
      },
      onError: () => {
        setResult({
          success: false,
          message: 'Error searching for ticket. Please try again.',
        });
      },
    });
  };

  const handleSearch = () => handleLookup(ticketNumber);

  const handleQrScan = (decodedText: string) => {
    handleLookup(decodedText);
  };

  const handleCheckIn = () => {
    if (result?.attendee) {
      checkInMutation.mutate(result.attendee.id, {
        onSuccess: () => {
          toast.success('Check-in complete!', {
            description: `${result.attendee!.contact.name} has been checked in.`,
          });
          setResult(null);
          setTicketNumber('');
        },
        onError: () => {
          toast.error('Failed to check in');
        },
      });
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto">
          <div className="flex justify-center mb-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl gradient-primary glow-primary">
              <QrCode className="h-8 w-8 text-primary-foreground" />
            </div>
          </div>
          <h1 className="text-3xl font-bold font-display">Check-In Station</h1>
          <p className="text-muted-foreground mt-2">
            Enter a ticket number or scan a QR code to check in attendees
          </p>
        </div>

        {/* Search Input */}
        <div className="max-w-xl mx-auto">
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Enter ticket number (e.g., TKT-001-A)"
                value={ticketNumber}
                onChange={(e) => setTicketNumber(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-12 h-14 text-lg rounded-xl"
              />
              <Button
                onClick={handleSearch}
                disabled={findAttendee.isPending}
                className="absolute right-2 top-1/2 -translate-y-1/2 gradient-primary"
              >
                {findAttendee.isPending ? 'Searching...' : 'Search'}
              </Button>
            </div>

            <div className="relative flex items-center gap-4">
              <div className="flex-1 border-t border-border" />
              <span className="text-xs text-muted-foreground uppercase tracking-wider">or</span>
              <div className="flex-1 border-t border-border" />
            </div>

            <QrScanner onScan={handleQrScan} enabled={!result} />
          </div>
        </div>

        {/* Result Card */}
        {result && (
          <div className="max-w-xl mx-auto animate-scale-in">
            <div
              className={cn(
                'rounded-2xl border-2 p-8 text-center',
                result.success
                  ? 'border-success bg-success/5'
                  : 'border-destructive bg-destructive/5'
              )}
            >
              <div
                className={cn(
                  'mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full',
                  result.success ? 'bg-success/20' : 'bg-destructive/20'
                )}
              >
                {result.success ? (
                  <Check className="h-8 w-8 text-success" />
                ) : (
                  <X className="h-8 w-8 text-destructive" />
                )}
              </div>

              <p
                className={cn(
                  'text-lg font-semibold mb-4',
                  result.success ? 'text-success' : 'text-destructive'
                )}
              >
                {result.message}
              </p>

              {result.attendee && (
                <div className="space-y-4">
                  <div className="rounded-xl bg-card border border-border p-6 text-left">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-lg">{result.attendee.contact.name}</p>
                        <p className="text-sm text-muted-foreground">{result.attendee.contact.email}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                      <div>
                        <p className="text-xs text-muted-foreground">Event</p>
                        <p className="font-medium">{result.attendee.eventTitle}</p>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-border">
                      <div className="flex items-center gap-2">
                        <Ticket className="h-4 w-4 text-primary" />
                        <p className="font-mono text-sm">{result.attendee.ticketNumber}</p>
                      </div>
                    </div>
                  </div>

                  {result.success && (
                    <Button
                      onClick={handleCheckIn}
                      disabled={checkInMutation.isPending}
                      size="lg"
                      className="w-full gradient-primary glow-primary h-14 text-lg"
                    >
                      <Check className="h-5 w-5 mr-2" />
                      {checkInMutation.isPending ? 'Checking in...' : 'Confirm Check-In'}
                    </Button>
                  )}
                </div>
              )}

              <Button
                variant="outline"
                onClick={() => {
                  setResult(null);
                  setTicketNumber('');
                }}
                className="mt-4"
              >
                Search Another Ticket
              </Button>
            </div>
          </div>
        )}

        {/* Instructions */}
        {!result && (
          <div className="max-w-xl mx-auto">
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="font-semibold font-display mb-4">Quick Tips</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Enter the full ticket number (e.g., TKT-001-A)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Ticket numbers are case-insensitive
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Each ticket can only be used once for check-in
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Use the camera scanner for quick QR-based check-in
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
}
