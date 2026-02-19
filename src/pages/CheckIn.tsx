import { useState } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { QrCode, Check, X, Search, User, Ticket, Loader2, Mail, Phone, ShieldCheck } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { useFindAttendeeByTicket, useCheckInAttendee } from '@/hooks/useAttendees';
import { useSeatAssignmentsByAttendee, useCheckInSeat, useUpdateSeatAssignment } from '@/hooks/useSeatAssignments';
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
  const [selectedSeatId, setSelectedSeatId] = useState<string | null>(null);
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [assignForm, setAssignForm] = useState({ name: '', email: '', phone: '', isMinor: false, guardianName: '', guardianEmail: '', guardianPhone: '' });

  const findAttendee = useFindAttendeeByTicket();
  const checkInMutation = useCheckInAttendee();
  const checkInSeat = useCheckInSeat();
  const updateSeat = useUpdateSeatAssignment();

  // Fetch seat assignments when we have an attendee
  const { data: seats = [], isLoading: seatsLoading } = useSeatAssignmentsByAttendee(
    result?.attendee?.id
  );

  const handleLookup = (ticket: string) => {
    const trimmed = ticket.trim();
    if (!trimmed) {
      toast.error('Please enter a ticket number');
      return;
    }

    setTicketNumber(trimmed);
    setSelectedSeatId(null);

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
            ? `Ticket verified! Select an attendee to check in.`
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
    if (!result?.attendee || !selectedSeatId) {
      toast.error('Please select an attendee to check in');
      return;
    }

    // Check in both the seat and increment the attendee counter
    checkInSeat.mutate(selectedSeatId, {
      onSuccess: () => {
        checkInMutation.mutate(result.attendee!.id, {
          onSuccess: () => {
            const seat = seats.find(s => s.id === selectedSeatId);
            toast.success('Check-in complete!', {
              description: `${seat?.name || 'Attendee'} has been checked in.`,
            });
            setResult(null);
            setTicketNumber('');
            setSelectedSeatId(null);
          },
          onError: () => {
            toast.error('Failed to update check-in count');
          },
        });
      },
      onError: () => {
        toast.error('Failed to check in seat');
      },
    });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Filter seats: only show assigned & not yet checked in
  const availableSeats = seats.filter(s => s.name && !s.checkedInAt);
  const checkedInSeats = seats.filter(s => !!s.checkedInAt);
  const unassignedSeats = seats.filter(s => !s.name);

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
                'rounded-2xl border-2 p-8',
                result.success
                  ? 'border-success bg-success/5'
                  : 'border-destructive bg-destructive/5'
              )}
            >
              <div className="text-center">
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
              </div>

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

                  {/* Seat Selection */}
                  {result.success && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-sm">Select attendee to check in:</h3>
                      
                      {seatsLoading && (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      )}

                      {/* Unassigned seats - allow inline assign & check in */}
                      {unassignedSeats.map((seat) => (
                        <div key={seat.id} className="rounded-xl border border-dashed border-border p-4">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground text-sm font-bold">
                                {seat.seatNumber}
                              </div>
                              <p className="text-sm text-muted-foreground italic">Unassigned</p>
                            </div>
                            {assigningId !== seat.id && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setAssigningId(seat.id);
                                  setSelectedSeatId(null);
                                  setAssignForm({ name: '', email: '', phone: '', isMinor: false, guardianName: '', guardianEmail: '', guardianPhone: '' });
                                }}
                              >
                                Assign & Check In
                              </Button>
                            )}
                          </div>
                          {assigningId === seat.id && (
                            <div className="space-y-3 mt-3 pt-3 border-t border-border">
                              <div>
                                <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                                  <User className="h-3 w-3" /> Full Name *
                                </Label>
                                <Input
                                  value={assignForm.name}
                                  onChange={(e) => setAssignForm(f => ({ ...f, name: e.target.value }))}
                                  placeholder="Full name"
                                />
                              </div>

                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`minor-checkin-${seat.id}`}
                                  checked={assignForm.isMinor}
                                  onCheckedChange={(checked) => setAssignForm(f => ({ ...f, isMinor: !!checked }))}
                                />
                                <Label htmlFor={`minor-checkin-${seat.id}`} className="text-sm cursor-pointer">
                                  This seat is for a child
                                </Label>
                              </div>

                              {!assignForm.isMinor ? (
                                <>
                                  <div>
                                    <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                                      <Mail className="h-3 w-3" /> Email *
                                    </Label>
                                    <Input
                                      type="email"
                                      value={assignForm.email}
                                      onChange={(e) => setAssignForm(f => ({ ...f, email: e.target.value }))}
                                      placeholder="email@example.com"
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                                      <Phone className="h-3 w-3" /> Phone
                                    </Label>
                                    <Input
                                      value={assignForm.phone}
                                      onChange={(e) => setAssignForm(f => ({ ...f, phone: e.target.value }))}
                                      placeholder="Phone number"
                                    />
                                  </div>
                                </>
                              ) : (
                                <div className="rounded-lg border border-dashed border-muted-foreground/30 p-3 space-y-3">
                                  <p className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                    <ShieldCheck className="h-3.5 w-3.5" /> Guardian / Parent Details
                                  </p>
                                  <div>
                                    <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                                      <User className="h-3 w-3" /> Guardian Name *
                                    </Label>
                                    <Input
                                      placeholder="Jane Doe"
                                      value={assignForm.guardianName}
                                      onChange={(e) => setAssignForm(f => ({ ...f, guardianName: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                                      <Mail className="h-3 w-3" /> Guardian Email *
                                    </Label>
                                    <Input
                                      type="email"
                                      placeholder="jane@example.com"
                                      value={assignForm.guardianEmail}
                                      onChange={(e) => setAssignForm(f => ({ ...f, guardianEmail: e.target.value }))}
                                    />
                                  </div>
                                  <div>
                                    <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                                      <Phone className="h-3 w-3" /> Guardian Phone
                                    </Label>
                                    <Input
                                      type="tel"
                                      placeholder="+1234567890"
                                      value={assignForm.guardianPhone}
                                      onChange={(e) => setAssignForm(f => ({ ...f, guardianPhone: e.target.value }))}
                                    />
                                  </div>
                                </div>
                              )}
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    if (!assignForm.name) {
                                      toast.error('Name is required');
                                      return;
                                    }
                                    if (!assignForm.isMinor && !assignForm.email) {
                                      toast.error('Email is required for non-child attendees');
                                      return;
                                    }
                                    if (assignForm.isMinor && (!assignForm.guardianName || !assignForm.guardianEmail)) {
                                      toast.error('Guardian name and email are required for children');
                                      return;
                                    }
                                    updateSeat.mutate(
                                      {
                                        id: seat.id,
                                        name: assignForm.name,
                                        email: assignForm.isMinor ? '' : assignForm.email,
                                        phone: assignForm.isMinor ? '' : assignForm.phone,
                                        is_minor: assignForm.isMinor,
                                        guardian_name: assignForm.isMinor ? assignForm.guardianName : '',
                                        guardian_email: assignForm.isMinor ? assignForm.guardianEmail : '',
                                        guardian_phone: assignForm.isMinor ? assignForm.guardianPhone : '',
                                      },
                                      {
                                        onSuccess: () => {
                                          // Now check in the seat
                                          checkInSeat.mutate(seat.id, {
                                            onSuccess: () => {
                                              checkInMutation.mutate(result!.attendee!.id, {
                                                onSuccess: () => {
                                                  toast.success('Check-in complete!', {
                                                    description: `${assignForm.name} has been checked in.`,
                                                  });
                                                  setResult(null);
                                                  setTicketNumber('');
                                                  setSelectedSeatId(null);
                                                  setAssigningId(null);
                                                  setAssignForm({ name: '', email: '', phone: '', isMinor: false, guardianName: '', guardianEmail: '', guardianPhone: '' });
                                                },
                                              });
                                            },
                                            onError: () => toast.error('Failed to check in seat'),
                                          });
                                        },
                                        onError: () => toast.error('Failed to assign seat'),
                                      }
                                    );
                                  }}
                                  disabled={updateSeat.isPending || checkInSeat.isPending}
                                >
                                  <Check className="h-3.5 w-3.5 mr-1" />
                                  Confirm
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => setAssigningId(null)}>
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}

                      {!seatsLoading && availableSeats.length === 0 && unassignedSeats.length === 0 && (
                        <div className="rounded-xl border border-muted bg-muted/50 p-4 text-center">
                          <p className="text-sm text-muted-foreground">
                            All assigned attendees have been checked in.
                          </p>
                        </div>
                      )}

                      {availableSeats.map((seat) => (
                        <button
                          key={seat.id}
                          onClick={() => setSelectedSeatId(seat.id)}
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

                      {selectedSeatId && (
                        <Button
                          onClick={handleCheckIn}
                          disabled={checkInSeat.isPending || checkInMutation.isPending}
                          size="lg"
                          className="w-full gradient-primary glow-primary h-14 text-lg"
                        >
                          <Check className="h-5 w-5 mr-2" />
                          {checkInSeat.isPending || checkInMutation.isPending ? 'Checking in...' : 'Confirm Check-In'}
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="text-center mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setResult(null);
                    setTicketNumber('');
                    setSelectedSeatId(null);
                  }}
                >
                  Search Another Ticket
                </Button>
              </div>
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
                  Each attendee must be assigned to a seat before check-in
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">•</span>
                  Select the specific attendee to check in from the list
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
