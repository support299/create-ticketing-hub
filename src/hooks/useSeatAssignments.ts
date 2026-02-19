import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface SeatAssignment {
  id: string;
  attendeeId: string;
  seatNumber: number;
  name: string | null;
  email: string | null;
  phone: string | null;
  checkedInAt: string | null;
  isMinor: boolean;
  guardianName: string | null;
  guardianEmail: string | null;
  guardianPhone: string | null;
}

function mapRow(row: any): SeatAssignment {
  return {
    id: row.id,
    attendeeId: row.attendee_id,
    seatNumber: row.seat_number,
    name: row.name,
    email: row.email,
    phone: row.phone,
    checkedInAt: row.checked_in_at,
    isMinor: row.is_minor ?? false,
    guardianName: row.guardian_name,
    guardianEmail: row.guardian_email,
    guardianPhone: row.guardian_phone,
  };
}

export function useSeatAssignmentsByOrder(orderId: string | undefined) {
  return useQuery({
    queryKey: ['seat_assignments', 'order', orderId],
    queryFn: async () => {
      // First get attendee for this order
      const { data: attendee, error: attError } = await supabase
        .from('attendees')
        .select('id, total_tickets')
        .eq('order_id', orderId!)
        .single();

      if (attError || !attendee) return [];

      const { data, error } = await supabase
        .from('seat_assignments')
        .select('*')
        .eq('attendee_id', attendee.id)
        .order('seat_number', { ascending: true });

      if (error) throw error;
      return data.map(mapRow);
    },
    enabled: !!orderId,
  });
}

export function useSeatAssignmentsByAttendee(attendeeId: string | undefined) {
  return useQuery({
    queryKey: ['seat_assignments', 'attendee', attendeeId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('seat_assignments')
        .select('*')
        .eq('attendee_id', attendeeId!)
        .order('seat_number', { ascending: true });

      if (error) throw error;
      return data.map(mapRow);
    },
    enabled: !!attendeeId,
  });
}

export function useUpdateSeatAssignment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, name, email, phone, is_minor, guardian_name, guardian_email, guardian_phone }: { id: string; name: string; email: string; phone: string; is_minor?: boolean; guardian_name?: string; guardian_email?: string; guardian_phone?: string }) => {
      const { error } = await supabase
        .from('seat_assignments')
        .update({ name, email, phone, is_minor: is_minor ?? false, guardian_name: guardian_name ?? null, guardian_email: guardian_email ?? null, guardian_phone: guardian_phone ?? null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seat_assignments'] });
    },
  });
}

export function useCheckInSeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seatId: string) => {
      const { error } = await supabase
        .from('seat_assignments')
        .update({ checked_in_at: new Date().toISOString() })
        .eq('id', seatId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seat_assignments'] });
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    },
  });
}

export function useCheckOutSeat() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (seatId: string) => {
      const { error } = await supabase
        .from('seat_assignments')
        .update({ checked_in_at: null })
        .eq('id', seatId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seat_assignments'] });
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    },
  });
}
