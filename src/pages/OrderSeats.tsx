import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useSeatAssignmentsByOrder, useUpdateSeatAssignment } from '@/hooks/useSeatAssignments';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, Ticket, User, Mail, Phone, Loader2 } from 'lucide-react';

interface SeatForm {
  name: string;
  email: string;
  phone: string;
}

export default function OrderSeats() {
  const { orderId } = useParams<{ orderId: string }>();
  const { data: seats = [], isLoading: seatsLoading } = useSeatAssignmentsByOrder(orderId);
  const updateSeat = useUpdateSeatAssignment();
  const [editingForms, setEditingForms] = useState<Record<string, SeatForm>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const { data: orderInfo, isLoading: orderLoading } = useQuery({
    queryKey: ['order-detail', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*, contacts(*)')
        .eq('id', orderId!)
        .single();
      if (error) throw error;

      const { data: attendee } = await supabase
        .from('attendees')
        .select('event_title')
        .eq('order_id', orderId!)
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
    enabled: !!orderId,
  });

  const isLoading = seatsLoading || orderLoading;

  const getFormValue = (seatId: string, seat: any): SeatForm => {
    if (editingForms[seatId]) return editingForms[seatId];
    return {
      name: seat.name || '',
      email: seat.email || '',
      phone: seat.phone || '',
    };
  };

  const setFormValue = (seatId: string, field: keyof SeatForm, value: string) => {
    setEditingForms(prev => ({
      ...prev,
      [seatId]: {
        ...getFormValue(seatId, seats.find(s => s.id === seatId)),
        [field]: value,
      },
    }));
  };

  const handleSave = (seatId: string) => {
    const form = editingForms[seatId];
    if (!form) return;

    if (!form.name.trim() || !form.email.trim()) {
      toast.error('Name and email are required');
      return;
    }

    setSavingId(seatId);
    updateSeat.mutate(
      { id: seatId, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() },
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

          {seats.map((seat) => {
            const form = getFormValue(seat.id, seat);
            const isAssigned = !!seat.name && !!seat.email;
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
                  </div>
                  {isAssigned && !isDirty && (
                    <span className="text-xs text-success font-medium">Assigned</span>
                  )}
                </div>

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
                </div>

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
