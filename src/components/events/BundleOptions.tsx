import { useState } from 'react';
import { Plus, Trash2, Package, Pencil, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBundleOptions, useCreateBundleOption, useDeleteBundleOption, useUpdateBundleOption } from '@/hooks/useBundleOptions';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { BundleOption } from '@/types';

interface BundleOptionsProps {
  eventId: string;
  ghlProductId?: string | null;
  locationId?: string | null;
  eventCapacity?: number;
  ticketsSold?: number;
}

export function BundleOptions({ eventId, ghlProductId, locationId, eventCapacity, ticketsSold }: BundleOptionsProps) {
  const { data: bundles = [], isLoading } = useBundleOptions(eventId);
  const createBundle = useCreateBundleOption();
  const deleteBundle = useDeleteBundleOption();
  const updateBundle = useUpdateBundleOption();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editPrice, setEditPrice] = useState('');

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error('Package name is required');
      return;
    }
    const bundlePrice = parseFloat(price) || 0;
    const bundleQty = parseInt(quantity) || 1;

    createBundle.mutate(
      {
        eventId,
        packageName: name.trim(),
        packagePrice: bundlePrice,
        bundleQuantity: bundleQty,
      },
      {
        onSuccess: async (createdBundle) => {
          toast.success('Bundle option added');

          if (ghlProductId && locationId) {
            try {
              const { data: syncData, error } = await supabase.functions.invoke('sync-bundle-price', {
                body: {
                  ghlProductId,
                  bundleName: name.trim(),
                  currency: 'USD',
                  amount: bundlePrice,
                  locationId,
                  eventCapacity: eventCapacity || 0,
                  bundleQuantity: bundleQty,
                  ticketsSold: ticketsSold || 0,
                },
              });
              if (error) {
                console.error('Failed to sync bundle price:', error);
                toast.error('Bundle saved but failed to sync price');
              } else {
                toast.success('Price synced successfully');
                // Save the GHL price ID back to the bundle
                const ghlPriceId = syncData?.data?._id;
                if (ghlPriceId) {
                  await supabase
                    .from('bundle_options')
                    .update({ ghl_price_id: ghlPriceId })
                    .eq('id', createdBundle.id);
                }
              }
            } catch (err) {
              console.error('Error syncing bundle price:', err);
            }
          }

          setName('');
          setPrice('');
          setQuantity('');
          setIsAdding(false);
        },
        onError: () => toast.error('Failed to add bundle option'),
      }
    );
  };

  const handleDelete = (id: string) => {
    deleteBundle.mutate(
      { id, eventId },
      {
        onSuccess: () => toast.success('Bundle option removed'),
        onError: () => toast.error('Failed to remove bundle option'),
      }
    );
  };

  const startEdit = (b: BundleOption) => {
    setEditingId(b.id);
    setEditName(b.packageName);
    setEditPrice(b.packagePrice.toString());
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditPrice('');
  };

  const handleSaveEdit = (b: BundleOption) => {
    if (!editName.trim()) {
      toast.error('Package name is required');
      return;
    }
    const newName = editName.trim();
    const newPrice = parseFloat(editPrice) || 0;

    updateBundle.mutate(
      {
        id: b.id,
        eventId,
        packageName: newName,
        packagePrice: newPrice,
      },
      {
        onSuccess: async () => {
          toast.success('Bundle option updated');
          cancelEdit();

          if (ghlProductId && locationId && b.ghlPriceId) {
            try {
              const remainingSeats = (eventCapacity || 0) - (ticketsSold || 0);
              const availableQty = Math.floor(remainingSeats / (b.bundleQuantity || 1));
              const { error } = await supabase.functions.invoke('update-bundle-price', {
                body: {
                  ghlProductId,
                  ghlPriceId: b.ghlPriceId,
                  bundleName: newName,
                  currency: 'USD',
                  amount: newPrice,
                  locationId,
                  availableQuantity: availableQty,
                },
              });
              if (error) {
                console.error('Failed to sync bundle price update:', error);
                toast.error('Bundle updated but failed to sync');
              } else {
                toast.success('Price updated successfully');
              }
            } catch (err) {
              console.error('Error syncing bundle price update:', err);
            }
          }
        },
        onError: () => toast.error('Failed to update bundle option'),
      }
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold font-display">Bundle Options</h3>
          <p className="text-sm text-muted-foreground">Manage pricing packages for this event</p>
        </div>
        {!isAdding && (
          <Button size="sm" onClick={() => setIsAdding(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Add Bundle
          </Button>
        )}
      </div>

      {isAdding && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="pkg-name">Package Name</Label>
              <Input id="pkg-name" placeholder="e.g. VIP Pass" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-price">Price ($)</Label>
              <Input id="pkg-price" type="number" min="0" step="0.01" placeholder="0.00" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pkg-qty">Bundle Quantity</Label>
              <Input id="pkg-qty" type="number" min="1" placeholder="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => { setIsAdding(false); setName(''); setPrice(''); setQuantity(''); }}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleAdd} disabled={createBundle.isPending}>
              {createBundle.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : bundles.length === 0 && !isAdding ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Package className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No bundle options yet. Add one to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {bundles.map((b) => (
            <div key={b.id} className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
              {editingId === b.id ? (
                <div className="flex-1 flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Package className="h-5 w-5 text-primary" />
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2 flex-1">
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      placeholder="Package name"
                      className="h-8"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={editPrice}
                      onChange={(e) => setEditPrice(e.target.value)}
                      placeholder="Price"
                      className="h-8"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground shrink-0 px-2">
                    Qty: {b.bundleQuantity} <span className="text-muted-foreground/60">(locked)</span>
                  </p>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleSaveEdit(b)} disabled={updateBundle.isPending}>
                      <Check className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={cancelEdit}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                      <Package className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{b.packageName}</p>
                      <p className="text-sm text-muted-foreground">
                        ${b.packagePrice.toFixed(2)} · {b.bundleQuantity} {b.bundleQuantity === 1 ? 'ticket' : 'tickets'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => startEdit(b)}>
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} disabled={deleteBundle.isPending}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
