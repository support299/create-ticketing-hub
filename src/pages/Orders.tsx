import { MainLayout } from '@/components/layout/MainLayout';
import { OrdersTable } from '@/components/orders/OrdersTable';
import { getOrdersWithContacts } from '@/data/mockData';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';

export default function Orders() {
  const orders = getOrdersWithContacts();

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold font-display">Orders</h1>
            <p className="text-muted-foreground mt-1">View and manage all ticket orders</p>
          </div>
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search orders..." 
              className="pl-9"
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Total Orders</p>
            <p className="text-2xl font-bold font-display">{orders.length}</p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Completed</p>
            <p className="text-2xl font-bold font-display text-success">
              {orders.filter(o => o.status === 'completed').length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Pending</p>
            <p className="text-2xl font-bold font-display text-warning">
              {orders.filter(o => o.status === 'pending').length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">Cancelled</p>
            <p className="text-2xl font-bold font-display text-destructive">
              {orders.filter(o => o.status === 'cancelled').length}
            </p>
          </div>
        </div>

        {/* Orders Table */}
        <OrdersTable orders={orders} />
      </div>
    </MainLayout>
  );
}
