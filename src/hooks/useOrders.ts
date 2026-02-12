import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, Contact } from '@/types';

export function useOrders() {
  return useQuery({
    queryKey: ['orders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select(`*, contacts (*)`)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((row): Order & { contact: Contact } => ({
        id: row.id,
        eventId: row.event_id,
        contactId: row.contact_id,
        total: Number(row.total),
        status: row.status as Order['status'],
        createdAt: row.created_at,
        quantity: row.quantity,
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

export function useDeleteOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      // First delete related attendees
      const { error: attendeeError } = await supabase
        .from('attendees')
        .delete()
        .eq('order_id', orderId);

      if (attendeeError) throw attendeeError;

      // Then delete the order
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
