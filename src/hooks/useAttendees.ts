import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Attendee, Contact } from '@/types';

function mapAttendeeRow(row: any): Attendee & { contact: Contact } {
  return {
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
  };
}

export function useAttendees() {
  const queryClient = useQueryClient();

  // Subscribe to realtime changes
  useEffect(() => {
    const channel = supabase
      .channel('attendees-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendees' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['attendees'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return useQuery({
    queryKey: ['attendees'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendees')
        .select(`*, contacts (*)`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(mapAttendeeRow);
    },
  });
}

export function useAttendeesByEvent(eventTitle: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = supabase
      .channel(`attendees-event-${eventTitle}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendees' },
        () => {
          queryClient.invalidateQueries({ queryKey: ['attendees', 'event', eventTitle] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, eventTitle]);

  return useQuery({
    queryKey: ['attendees', 'event', eventTitle],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('attendees')
        .select(`*, contacts (*)`)
        .eq('event_title', eventTitle)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data.map(mapAttendeeRow);
    },
    enabled: !!eventTitle,
  });
}

export function useCheckInAttendee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (attendeeId: string) => {
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
        .select(`*, contacts (*)`)
        .ilike('ticket_number', ticketNumber)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;

      return mapAttendeeRow(data);
    },
  });
}
