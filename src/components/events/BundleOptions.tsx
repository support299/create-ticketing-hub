import { useState } from 'react';
import { Plus, Trash2, Package } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBundleOptions, useCreateBundleOption, useDeleteBundleOption } from '@/hooks/useBundleOptions';
import { toast } from 'sonner';

interface BundleOptionsProps {
  eventId: string;
}

export function BundleOptions({ eventId }: BundleOptionsProps) {
  const { data: bundles = [], isLoading } = useBundleOptions(eventId);
  const createBundle = useCreateBundleOption();
  const deleteBundle = useDeleteBundleOption();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('');

  const handleAdd = () => {
    if (!name.trim()) {
      toast.error('Package name is required');
      return;
    }
    createBundle.mutate(
      {
        eventId,
        packageName: name.trim(),
        packagePrice: parseFloat(price) || 0,
        bundleQuantity: parseInt(quantity) || 1,
      },
      {
        onSuccess: () => {
          toast.success('Bundle option added');
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
              <Button variant="ghost" size="icon" onClick={() => handleDelete(b.id)} disabled={deleteBundle.isPending}>
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
