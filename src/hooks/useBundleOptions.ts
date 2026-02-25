import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { BundleOption } from '@/types';

const mapRow = (row: any): BundleOption => ({
  id: row.id,
  eventId: row.event_id,
  packageName: row.package_name,
  packagePrice: Number(row.package_price),
  bundleQuantity: row.bundle_quantity,
  createdAt: row.created_at,
});

export function useBundleOptions(eventId: string) {
  return useQuery({
    queryKey: ['bundle-options', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('bundle_options')
        .select('*')
        .eq('event_id', eventId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(mapRow);
    },
    enabled: !!eventId,
  });
}

export function useCreateBundleOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (option: { eventId: string; packageName: string; packagePrice: number; bundleQuantity: number }) => {
      const { data, error } = await supabase
        .from('bundle_options')
        .insert({
          event_id: option.eventId,
          package_name: option.packageName,
          package_price: option.packagePrice,
          bundle_quantity: option.bundleQuantity,
        })
        .select()
        .single();
      if (error) throw error;
      return mapRow(data);
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bundle-options', data.eventId] });
    },
  });
}

export function useDeleteBundleOption() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, eventId }: { id: string; eventId: string }) => {
      const { error } = await supabase.from('bundle_options').delete().eq('id', id);
      if (error) throw error;
      return { eventId };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['bundle-options', data.eventId] });
    },
  });
}
