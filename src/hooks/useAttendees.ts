import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Attendee, Contact } from '@/types';

export function useAttendees() {
  return useQuery({
    queryKey: ['attendees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          *,
          contacts (*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((row): Attendee & { contact: Contact } => ({
        id: row.id,
        orderId: row.order_id,
        contactId: row.contact_id,
        ticketNumber: row.ticket_number,
        qrCodeUrl: row.qr_code_url || '',
        checkedInAt: row.checked_in_at,
        eventTitle: row.event_title,
        totalTickets: row.total_tickets,
        checkInCount: row.check_in_count,
        contact: {
          id: row.contacts.id,
          name: row.contacts.name,
          email: row.contacts.email,
          phone: row.contacts.phone || undefined,
        },
      }));
    },
  });
}

export function useAttendeesByEvent(eventTitle: string) {
  return useQuery({
    queryKey: ['attendees', 'event', eventTitle],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          *,
          contacts (*)
        `)
        .eq('event_title', eventTitle)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((row): Attendee & { contact: Contact } => ({
        id: row.id,
        orderId: row.order_id,
        contactId: row.contact_id,
        ticketNumber: row.ticket_number,
        qrCodeUrl: row.qr_code_url || '',
        checkedInAt: row.checked_in_at,
        eventTitle: row.event_title,
        totalTickets: row.total_tickets,
        checkInCount: row.check_in_count,
        contact: {
          id: row.contacts.id,
          name: row.contacts.name,
          email: row.contacts.email,
          phone: row.contacts.phone || undefined,
        },
      }));
    },
    enabled: !!eventTitle,
  });
}

export function useCheckInAttendee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendeeId: string) => {
      // First get current check-in count
      const { data: attendee, error: fetchError } = await supabase
        .from('attendees')
        .select('check_in_count, total_tickets')
        .eq('id', attendeeId)
        .single();

      if (fetchError) throw fetchError;
      
      if (attendee.check_in_count >= attendee.total_tickets) {
        throw new Error('All tickets already checked in');
      }

      const { error } = await supabase
        .from('attendees')
        .update({ 
          check_in_count: attendee.check_in_count + 1,
          checked_in_at: new Date().toISOString() 
        })
        .eq('id', attendeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    },
  });
}

export function useCheckOutAttendee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendeeId: string) => {
      // First get current check-in count
      const { data: attendee, error: fetchError } = await supabase
        .from('attendees')
        .select('check_in_count')
        .eq('id', attendeeId)
        .single();

      if (fetchError) throw fetchError;
      
      if (attendee.check_in_count <= 0) {
        throw new Error('No check-ins to undo');
      }

      const newCount = attendee.check_in_count - 1;
      const { error } = await supabase
        .from('attendees')
        .update({ 
          check_in_count: newCount,
          checked_in_at: newCount === 0 ? null : new Date().toISOString() 
        })
        .eq('id', attendeeId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
    },
  });
}

export function useFindAttendeeByTicket() {
  return useMutation({
    mutationFn: async (ticketNumber: string) => {
      const { data, error } = await supabase
        .from('attendees')
        .select(`
          *,
          contacts (*)
        `)
        .ilike('ticket_number', ticketNumber)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return {
        id: data.id,
        orderId: data.order_id,
        contactId: data.contact_id,
        ticketNumber: data.ticket_number,
        qrCodeUrl: data.qr_code_url || '',
        checkedInAt: data.checked_in_at,
        eventTitle: data.event_title,
        totalTickets: data.total_tickets,
        checkInCount: data.check_in_count,
        contact: {
          id: data.contacts.id,
          name: data.contacts.name,
          email: data.contacts.email,
          phone: data.contacts.phone || undefined,
        },
      } as Attendee & { contact: Contact };
    },
  });
}
