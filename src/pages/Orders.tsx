import { useState, useMemo } from 'react';
import { MainLayout } from '@/components/layout/MainLayout';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { useOrders } from '@/hooks/useOrders';
import { useEvents } from '@/hooks/useEvents';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function Orders() {
  const { data: orders = [], isLoading } = useOrders();
  const { data: events = [] } = useEvents();
  const [search, setSearch] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string>('all');

  const filteredOrders = useMemo(() => {
    return orders.filter(o => {
      if (selectedEventId !== 'all' && o.eventId !== selectedEventId) return false;
      if (!search) return true;
      const q = search.toLowerCase();
      return (
        o.contact.name.toLowerCase().includes(q) ||
        o.contact.email.toLowerCase().includes(q) ||
        o.id.toLowerCase().includes(q)
      );
    });
  }, [orders, search, selectedEventId]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-[400px] rounded-xl" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Orders</h1>
            <p className="text-muted-foreground mt-1">View and manage all ticket orders</p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedEventId} onValueChange={setSelectedEventId}>
              <SelectTrigger className="w-48 bg-card">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="all">All Events</SelectItem>
                {events.map(event => (
                  <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search orders..." 
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold font-display">{filteredOrders.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold font-display text-success">
              {filteredOrders.filter(o => o.status === 'completed').length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold font-display text-warning">
              {filteredOrders.filter(o => o.status === 'pending').length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Cancelled</p>
            <p className="text-2xl font-bold font-display text-destructive">
              {filteredOrders.filter(o => o.status === 'cancelled').length}
            </p>
          </div>
        </div>

        {/* Orders Table */}
        {filteredOrders.length === 0 ? (
          <div className="text-center py-12 rounded-2xl border border-dashed border-border">
            <p className="text-muted-foreground">
              {search || selectedEventId !== 'all' ? 'No matching orders found.' : 'No orders yet.'}
            </p>
          </div>
        ) : (
          <OrdersTable orders={filteredOrders} />
        )}
      </div>
    </MainLayout>
  );
}