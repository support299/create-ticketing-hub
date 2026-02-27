import { useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSeatAssignmentsByOrder, useUpdateSeatAssignment } from '@/hooks/useSeatAssignments';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Check, Ticket, User, Mail, Phone, Loader2, ArrowLeft } from 'lucide-react';
import { isValidPhone, isValidEmail } from '@/lib/validation';

interface SeatForm {
  name: string;
  email: string;
  phone: string;
  isMinor: boolean;
  guardianName: string;
  guardianEmail: string;
  guardianPhone: string;
}

export default function OrderSeats() {
  const { ticketNumber } = useParams<{ ticketNumber: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const locationId = searchParams.get('id');

  // Resolve ticket number to order ID
  const { data: resolvedOrderId, isLoading: resolving } = useQuery({
    queryKey: ['resolve-ticket', ticketNumber],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendees')
        .select('order_id')
        .eq('ticket_number', ticketNumber!)
        .single();
      if (error) throw error;
      return data.order_id;
    },
    enabled: !!ticketNumber,
  });

  const { data: seats = [], isLoading: seatsLoading } = useSeatAssignmentsByOrder(resolvedOrderId);
  const updateSeat = useUpdateSeatAssignment();
  const [editingForms, setEditingForms] = useState<Record<string, SeatForm>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: orderInfo, isLoading: orderLoading } = useQuery({
    queryKey: ['order-detail', resolvedOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, contacts(*)')
        .eq('id', resolvedOrderId!)
        .single();
      if (error) throw error;

      const { data: attendee } = await supabase
        .from('attendees')
        .select('event_title')
        .eq('order_id', resolvedOrderId!)
        .single();

      return {
        id: data.id,
        quantity: data.quantity,
        total: data.total,
        contactName: data.contacts?.name || 'Unknown',
        contactEmail: data.contacts?.email || '',
        eventTitle: attendee?.event_title || 'Unknown Event',
      };
    },
    enabled: !!resolvedOrderId,
  });

  const isLoading = resolving || seatsLoading || orderLoading;

  const getFormValue = (seatId: string, seat: any): SeatForm => {
    if (editingForms[seatId]) return editingForms[seatId];
    return {
      name: seat.name || '',
      email: seat.email || '',
      phone: seat.phone || '',
      isMinor: seat.isMinor ?? false,
      guardianName: seat.guardianName || '',
      guardianEmail: seat.guardianEmail || '',
      guardianPhone: seat.guardianPhone || '',
    };
  };

  const setFormValue = (seatId: string, field: keyof SeatForm, value: string | boolean) => {
    setEditingForms(prev => ({
      ...prev,
      [seatId]: {
        ...getFormValue(seatId, seats.find(s => s.id === seatId)),
        [field]: field === 'isMinor' ? !!value : value,
      },
    }));
  };

  const handleSave = (seatId: string) => {
    const form = editingForms[seatId];
    if (!form) return;

    if (!form.name.trim()) {
      toast.error('Name is required');
      return;
    }
    if (!form.isMinor && !form.phone.trim()) {
      toast.error('Phone number with country code is required');
      return;
    }
    if (form.phone.trim() && !isValidPhone(form.phone.trim())) {
      toast.error('Please enter a valid phone number (e.g. +1234567890)');
      return;
    }
    if (form.email.trim() && !isValidEmail(form.email.trim())) {
      toast.error('Please enter a valid email address');
      return;
    }

    setSavingId(seatId);
    updateSeat.mutate(
      {
        id: seatId,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        is_minor: form.isMinor,
        guardian_name: form.guardianName?.trim() || '',
        guardian_email: form.guardianEmail?.trim() || '',
        guardian_phone: form.guardianPhone?.trim() || '',
      },
      {
        onSuccess: () => {
          toast.success('Seat assignment saved');
          setSavingId(null);
          setEditingForms(prev => {
            const next = { ...prev };
            delete next[seatId];
            return next;
          });
        },
        onError: () => {
          toast.error('Failed to save');
          setSavingId(null);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!orderInfo) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Order Not Found</h1>
          <p className="text-muted-foreground">This order does not exist or has been removed.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Back button */}
        {locationId && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/orders?id=${locationId}`)}
            className="flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Orders
          </Button>
        )}

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <Ticket className="h-7 w-7" />
            </div>
          </div>
          <h1 className="text-2xl font-bold font-display">{orderInfo.eventTitle}</h1>
          <p className="text-muted-foreground">
            Order by <span className="font-medium text-foreground">{orderInfo.contactName}</span> · {orderInfo.quantity} {orderInfo.quantity === 1 ? 'ticket' : 'tickets'}
          </p>
        </div>

        {/* Seat Assignment Forms */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold font-display">Assign Attendees</h2>
          <p className="text-sm text-muted-foreground">
            Please provide the name, email, and phone for each ticket holder.
          </p>

          {[...seats].sort((a, b) => {
          const aAssigned = !!a.name && (!!a.phone || a.isMinor);
            const bAssigned = !!b.name && (!!b.phone || b.isMinor);
            if (aAssigned === bAssigned) return a.seatNumber - b.seatNumber;
            return aAssigned ? 1 : -1;
          }).map((seat) => {
            const form = getFormValue(seat.id, seat);
            const isAssigned = !!seat.name && (!!seat.phone || seat.isMinor);
            const isDirty = !!editingForms[seat.id];

            return (
              <div
                key={seat.id}
                className={`rounded-xl border p-5 space-y-4 transition-colors ${
                  isAssigned ? 'border-success/50 bg-success/5' : 'border-border bg-card'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${
                      isAssigned ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'
                    }`}>
                      {isAssigned ? <Check className="h-4 w-4" /> : seat.seatNumber}
                    </div>
                    <span className="font-medium">Seat {seat.seatNumber}</span>
                  {isAssigned && !isDirty && (
                    <>
                      <span className="text-xs text-muted-foreground">— {seat.name}</span>
                      {seat.isMinor && (
                        <span className="text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">Child</span>
                      )}
                    </>
                  )}
                </div>
                  {isAssigned && !isDirty && (
                    <span className="text-xs text-success font-medium">Assigned</span>
                  )}
                </div>

                {(!isAssigned || isDirty) && (
                  <div className="grid gap-3">
                    <div>
                      <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                        <User className="h-3 w-3" /> Full Name *
                      </Label>
                      <Input
                        placeholder="John Doe"
                        value={form.name}
                        onChange={(e) => setFormValue(seat.id, 'name', e.target.value)}
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`minor-${seat.id}`}
                        checked={form.isMinor}
                        onCheckedChange={(checked) => setFormValue(seat.id, 'isMinor', checked ? 'true' : '')}
                      />
                      <Label htmlFor={`minor-${seat.id}`} className="text-sm cursor-pointer">
                        This seat is for a child
                      </Label>
                    </div>

                    {form.isMinor && (() => {
                      const nonChildSeats = seats.filter(s => s.id !== seat.id && s.name && !s.isMinor);
                      return nonChildSeats.length > 0 ? (
                        <div>
                          <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                            <User className="h-3 w-3" /> Guardian
                          </Label>
                          <Select
                            value={form.guardianName ? nonChildSeats.find(s => s.name === form.guardianName && s.phone === form.guardianPhone)?.id || '' : ''}
                            onValueChange={(selectedId) => {
                              const guardian = nonChildSeats.find(s => s.id === selectedId);
                              if (guardian) {
                                setEditingForms(prev => ({
                                  ...prev,
                                  [seat.id]: {
                                    ...getFormValue(seat.id, seat),
                                    isMinor: true,
                                    guardianName: guardian.name || '',
                                    guardianEmail: guardian.email || '',
                                    guardianPhone: guardian.phone || '',
                                  },
                                }));
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a guardian" />
                            </SelectTrigger>
                            <SelectContent>
                              {nonChildSeats.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.name} {s.phone ? `(${s.phone})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {form.guardianName && (
                            <div className="mt-2 rounded-lg bg-muted/50 p-3 text-xs space-y-1">
                              <p><span className="text-muted-foreground">Name:</span> {form.guardianName}</p>
                              {form.guardianPhone && <p><span className="text-muted-foreground">Phone:</span> {form.guardianPhone}</p>}
                              {form.guardianEmail && <p><span className="text-muted-foreground">Email:</span> {form.guardianEmail}</p>}
                            </div>
                          )}
                        </div>
                      ) : null;
                    })()}

                    <>
                      <div>
                        <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                          <Phone className="h-3 w-3" /> Phone (with country code) {!form.isMinor && '*'}
                        </Label>
                        <Input
                          type="tel"
                          placeholder="+1234567890"
                          value={form.phone}
                          onChange={(e) => setFormValue(seat.id, 'phone', e.target.value)}
                        />
                      </div>
                      <div>
                        <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                          <Mail className="h-3 w-3" /> Email
                        </Label>
                        <Input
                          type="email"
                          placeholder="john@example.com"
                          value={form.email}
                          onChange={(e) => setFormValue(seat.id, 'email', e.target.value)}
                        />
                      </div>
                    </>
                  </div>
                )}

                {isDirty && (
                  <Button
                    onClick={() => handleSave(seat.id)}
                    disabled={savingId === seat.id}
                    className="w-full"
                    size="sm"
                  >
                    {savingId === seat.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4 mr-2" /> Save
                      </>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        {seats.length === 0 && (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">No seats found for this order.</p>
          </div>
        )}
      </div>
    </div>
  );
}
