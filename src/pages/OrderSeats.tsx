import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSeatAssignmentsByOrder, useUpdateSeatAssignment } from '@/hooks/useSeatAssignments';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Check, Ticket, User, Mail, Phone, Loader2, ShieldCheck } from 'lucide-react';

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
    if (!form.isMinor && !form.email.trim()) {
      toast.error('Email is required for non-minor attendees');
      return;
    }
    if (form.isMinor && (!form.guardianName.trim() || !form.guardianEmail.trim())) {
      toast.error('Guardian name and email are required for minors');
      return;
    }

    setSavingId(seatId);
    updateSeat.mutate(
      {
        id: seatId,
        name: form.name.trim(),
        email: form.isMinor ? '' : form.email.trim(),
        phone: form.isMinor ? '' : form.phone.trim(),
        is_minor: form.isMinor,
        guardian_name: form.isMinor ? form.guardianName.trim() : '',
        guardian_email: form.isMinor ? form.guardianEmail.trim() : '',
        guardian_phone: form.isMinor ? form.guardianPhone.trim() : '',
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
            const aAssigned = !!a.name && (!!a.email || a.isMinor);
            const bAssigned = !!b.name && (!!b.email || b.isMinor);
            if (aAssigned === bAssigned) return a.seatNumber - b.seatNumber;
            return aAssigned ? 1 : -1;
          }).map((seat) => {
            const form = getFormValue(seat.id, seat);
            const isAssigned = !!seat.name && (!!seat.email || seat.isMinor);
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
                        <span className="text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded font-medium">Minor</span>
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
                        This seat is for a minor
                      </Label>
                    </div>

                    {!form.isMinor ? (
                      <>
                        <div>
                          <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                            <Mail className="h-3 w-3" /> Email *
                          </Label>
                          <Input
                            type="email"
                            placeholder="john@example.com"
                            value={form.email}
                            onChange={(e) => setFormValue(seat.id, 'email', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                            <Phone className="h-3 w-3" /> Phone
                          </Label>
                          <Input
                            type="tel"
                            placeholder="+1234567890"
                            value={form.phone}
                            onChange={(e) => setFormValue(seat.id, 'phone', e.target.value)}
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
                            value={form.guardianName}
                            onChange={(e) => setFormValue(seat.id, 'guardianName', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                            <Mail className="h-3 w-3" /> Guardian Email *
                          </Label>
                          <Input
                            type="email"
                            placeholder="jane@example.com"
                            value={form.guardianEmail}
                            onChange={(e) => setFormValue(seat.id, 'guardianEmail', e.target.value)}
                          />
                        </div>
                        <div>
                          <Label className="text-xs flex items-center gap-1.5 mb-1.5">
                            <Phone className="h-3 w-3" /> Guardian Phone
                          </Label>
                          <Input
                            type="tel"
                            placeholder="+1234567890"
                            value={form.guardianPhone}
                            onChange={(e) => setFormValue(seat.id, 'guardianPhone', e.target.value)}
                          />
                        </div>
                      </div>
                    )}
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
