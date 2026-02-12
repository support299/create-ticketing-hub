import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Order, Contact } from '@/types';
import { useLocationId } from '@/contexts/LocationContext';

export function useOrders() {
  const locationId = useLocationId();

  return useQuery({
    queryKey: ['orders', locationId],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`*, contacts (*)`)
        .order('created_at', { ascending: false });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
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
      // Get order details to know the quantity for updating event tickets_sold
      const { data: order, error: orderFetchError } = await supabase
        .from('orders')
        .select('quantity, event_id')
        .eq('id', orderId)
        .single();

      if (orderFetchError) throw orderFetchError;

      // Delete attendees linked to this order
      const { error: attendeeError } = await supabase
        .from('attendees')
        .delete()
        .eq('order_id', orderId);

      if (attendeeError) throw attendeeError;

      // Delete the order
      const { error } = await supabase
        .from('orders')
        .delete()
        .eq('id', orderId);

      if (error) throw error;

      // Reduce tickets_sold on the event
      const { data: event } = await supabase
        .from('events')
        .select('tickets_sold')
        .eq('id', order.event_id)
        .single();

      if (event) {
        await supabase
          .from('events')
          .update({ tickets_sold: Math.max(0, (event.tickets_sold || 0) - order.quantity) })
          .eq('id', order.event_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['attendees'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
