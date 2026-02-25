import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Event } from '@/types';
import { toast } from 'sonner';
import { useLocationId } from '@/contexts/LocationContext';

// Transform database row to Event type
const transformEvent = (row: any): Event => ({
  id: row.id,
  title: row.title,
  venue: row.venue,
  date: row.date,
  endDate: row.end_date,
  time: row.time,
  description: row.description || '',
  coverImage: row.cover_image || 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop',
  capacity: row.capacity,
  ticketsSold: row.tickets_sold || 0,
  ticketPrice: Number(row.ticket_price) || 0,
  isActive: row.is_active,
  locationId: row.location_id || null,
  ghlProductId: row.ghl_product_id || null,
});

export function useEvents() {
  const locationId = useLocationId();

  return useQuery({
    queryKey: ['events', locationId],
    queryFn: async () => {
      let query = supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true });

      if (locationId) {
        query = query.eq('location_id', locationId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data.map(transformEvent);
    },
  });
}

export function useEvent(id: string) {
  return useQuery({
    queryKey: ['events', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) return null;
      return transformEvent(data);
    },
    enabled: !!id,
  });
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  const locationId = useLocationId();

  return useMutation({
    mutationFn: async (event: Omit<Event, 'id'>) => {
      const { data, error } = await supabase
        .from('events')
        .insert({
          title: event.title,
          venue: event.venue,
          date: event.date,
          end_date: event.endDate,
          time: event.time,
          description: event.description,
          cover_image: event.coverImage,
          capacity: event.capacity,
          ticket_price: event.ticketPrice || 0,
          is_active: event.isActive,
          tickets_sold: 0,
          location_id: locationId,
        })
        .select()
        .single();

      if (error) throw error;
      return transformEvent(data);
    },
    onSuccess: (createdEvent) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });

      // Sync product to LeadConnector in the background
      if (createdEvent.locationId) {
        supabase.functions.invoke('sync-product', {
          body: {
            name: createdEvent.title,
            locationId: createdEvent.locationId,
            description: createdEvent.description,
            eventId: createdEvent.id,
          },
        }).then(({ error }) => {
          if (error) console.error('Failed to sync product to LeadConnector:', error);
          else console.log('Product synced to LeadConnector');
        });
      }
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Event> & { id: string }) => {
      const dbUpdates: any = {};
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.venue !== undefined) dbUpdates.venue = updates.venue;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      if (updates.endDate !== undefined) dbUpdates.end_date = updates.endDate;
      if (updates.time !== undefined) dbUpdates.time = updates.time;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.coverImage !== undefined) dbUpdates.cover_image = updates.coverImage;
      if (updates.capacity !== undefined) dbUpdates.capacity = updates.capacity;
      if (updates.ticketPrice !== undefined) dbUpdates.ticket_price = updates.ticketPrice;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;
      if (updates.ticketsSold !== undefined) dbUpdates.tickets_sold = updates.ticketsSold;

      const { data, error } = await supabase
        .from('events')
        .update(dbUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return transformEvent(data);
    },
    onSuccess: async (updatedEvent, variables) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['events', variables.id] });

      // Sync name/description changes to LeadConnector
      if ((variables.title !== undefined || variables.description !== undefined) && updatedEvent.locationId) {
        const { data } = await supabase
          .from('events')
          .select('ghl_product_id')
          .eq('id', variables.id)
          .single();

        if (data?.ghl_product_id) {
          supabase.functions.invoke('sync-product', {
            body: {
              action: 'update',
              name: updatedEvent.title,
              locationId: updatedEvent.locationId,
              description: updatedEvent.description,
              eventId: variables.id,
              ghlProductId: data.ghl_product_id,
            },
          }).then(({ error }) => {
            if (error) console.error('Failed to update product in LeadConnector:', error);
          });
        }
      }

      // Sync inventory when capacity changes
      if (variables.capacity !== undefined && updatedEvent.locationId) {
        try {
          const { data: bundles } = await supabase
            .from('bundle_options')
            .select('*')
            .eq('event_id', variables.id);

          if (bundles && bundles.length > 0) {
            const remaining = updatedEvent.capacity - (updatedEvent.ticketsSold || 0);
            const items = bundles
              .filter((b: any) => b.ghl_price_id)
              .map((b: any) => ({
                priceId: b.ghl_price_id,
                availableQuantity: Math.floor(remaining / b.bundle_quantity),
                allowOutOfStockPurchases: false,
              }));

            if (items.length > 0) {
              const { error } = await supabase.functions.invoke('sync-inventory', {
                body: {
                  locationId: updatedEvent.locationId,
                  items,
                },
              });
              if (error) console.error('Failed to sync inventory:', error);
              else {
                console.log('Inventory synced after capacity update');
                toast.success('Inventory synced with LeadConnector');
              }
            }
          }
        } catch (err) {
          console.error('Inventory sync error:', err);
        }
      }
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('events')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
