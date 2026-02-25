import { useState, useMemo } from 'react';
import { DollarSign, Users, Ticket, Calendar } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/stat-card';
import { EventCard } from '@/components/events/EventCard';
import { useEvents } from '@/hooks/useEvents';
import { useOrders } from '@/hooks/useOrders';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';

export default function Dashboard() {
  const { data: events = [], isLoading: eventsLoading } = useEvents();
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const [selectedEventId, setSelectedEventId] = useState<string>('all');

  const isLoading = eventsLoading || ordersLoading;

  const filteredOrders = useMemo(() => {
    if (selectedEventId === 'all') return orders;
    return orders.filter(o => o.eventId === selectedEventId);
  }, [orders, selectedEventId]);

  const filteredEvents = useMemo(() => {
    if (selectedEventId === 'all') return events;
    return events.filter(e => e.id === selectedEventId);
  }, [events, selectedEventId]);

  const stats = useMemo(() => {
    const totalRevenue = filteredOrders
      .filter(o => o.status === 'completed')
      .reduce((acc, o) => acc + o.total, 0);
    
    const totalTicketsSold = filteredEvents.reduce((acc, e) => acc + (e.ticketsSold || 0), 0);
    const totalCapacity = filteredEvents.reduce((acc, e) => acc + e.capacity, 0);
    const activeEvents = filteredEvents.filter(e => e.isActive).length;
    const completedOrders = filteredOrders.filter(o => o.status === 'completed').length;
    const pendingOrders = filteredOrders.filter(o => o.status === 'pending').length;

    return { totalRevenue, totalTicketsSold, totalCapacity, activeEvents, completedOrders, pendingOrders };
  }, [filteredEvents, filteredOrders]);

  // Generate sales data from orders
  const salesData = useMemo(() => {
    const grouped = filteredOrders
      .filter(o => o.status === 'completed')
      .reduce((acc, order) => {
        const date = format(new Date(order.createdAt), 'yyyy-MM-dd');
        if (!acc[date]) {
          acc[date] = { date, revenue: 0, tickets: 0 };
        }
        acc[date].revenue += order.total;
        acc[date].tickets += order.quantity;
        return acc;
      }, {} as Record<string, { date: string; revenue: number; tickets: number }>);

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date)).slice(-7);
  }, [filteredOrders]);

  if (isLoading) {
    return (
      <MainLayout>
        <div className="space-y-8">
          <Skeleton className="h-10 w-48" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
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
            <h1 className="text-3xl font-bold font-display">Dashboard</h1>
            <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your events.</p>
          </div>
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
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={`$${stats.totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatCard
            title="Tickets Sold"
            value={stats.totalTicketsSold}
            subtitle={`of ${stats.totalCapacity} capacity`}
            icon={Ticket}
            trend={{ value: 8.2, isPositive: true }}
          />
          <StatCard
            title="Active Events"
            value={stats.activeEvents}
            icon={Calendar}
          />
          <StatCard
            title="Orders"
            value={stats.completedOrders}
            subtitle={`${stats.pendingOrders} pending`}
            icon={Users}
          />
        </div>

        {/* Charts Section */}
        {salesData.length > 0 && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Revenue Chart */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold font-display">Revenue Over Time</h3>
                <p className="text-sm text-muted-foreground">Last 7 data points</p>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={salesData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(16, 90%, 60%)" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(16, 90%, 60%)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                      className="text-muted-foreground text-xs"
                    />
                    <YAxis 
                      tickFormatter={(value) => `$${value}`}
                      className="text-muted-foreground text-xs"
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                      }}
                      formatter={(value: number) => [`$${value}`, 'Revenue']}
                      labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="hsl(16, 90%, 60%)"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tickets Chart */}
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-6">
                <h3 className="text-lg font-semibold font-display">Tickets Sold</h3>
                <p className="text-sm text-muted-foreground">Last 7 data points</p>
              </div>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM d')}
                      className="text-muted-foreground text-xs"
                    />
                    <YAxis className="text-muted-foreground text-xs" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '0.75rem',
                      }}
                      formatter={(value: number) => [value, 'Tickets']}
                      labelFormatter={(label) => format(new Date(label), 'MMM d, yyyy')}
                    />
                    <Bar 
                      dataKey="tickets" 
                      fill="hsl(16, 90%, 60%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Recent Events */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold font-display">Recent Events</h3>
              <p className="text-sm text-muted-foreground">Your upcoming and active events</p>
            </div>
          </div>
          {filteredEvents.length === 0 ? (
            <div className="text-center py-12 rounded-2xl border border-dashed border-border">
              <p className="text-muted-foreground">No events yet. Create your first event!</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredEvents.slice(0, 6).map((event) => (
                <EventCard 
                  key={event.id} 
                  event={event} 
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
