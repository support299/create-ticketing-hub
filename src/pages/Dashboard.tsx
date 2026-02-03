import { DollarSign, Users, Ticket, TrendingUp, Calendar } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatCard } from '@/components/ui/stat-card';
import { EventCard } from '@/components/events/EventCard';
import { mockEvents, mockTicketTypes, mockSalesData, mockOrders, getTicketTypesByEventId } from '@/data/mockData';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { format } from 'date-fns';

export default function Dashboard() {
  const totalRevenue = mockOrders
    .filter(o => o.status === 'completed')
    .reduce((acc, o) => acc + o.total, 0);
  
  const totalTicketsSold = mockTicketTypes.reduce((acc, t) => acc + t.sold, 0);
  const totalCapacity = mockTicketTypes.reduce((acc, t) => acc + t.quantity, 0);

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold font-display">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's what's happening with your events.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Revenue"
            value={`$${totalRevenue.toLocaleString()}`}
            icon={DollarSign}
            trend={{ value: 12.5, isPositive: true }}
          />
          <StatCard
            title="Tickets Sold"
            value={totalTicketsSold}
            subtitle={`of ${totalCapacity} capacity`}
            icon={Ticket}
            trend={{ value: 8.2, isPositive: true }}
          />
          <StatCard
            title="Active Events"
            value={mockEvents.length}
            icon={Calendar}
          />
          <StatCard
            title="Orders"
            value={mockOrders.filter(o => o.status === 'completed').length}
            subtitle={`${mockOrders.filter(o => o.status === 'pending').length} pending`}
            icon={Users}
          />
        </div>

        {/* Charts Section */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Chart */}
          <div className="rounded-2xl border border-border bg-card p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold font-display">Revenue Over Time</h3>
              <p className="text-sm text-muted-foreground">Last 7 data points</p>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={mockSalesData}>
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
                <BarChart data={mockSalesData}>
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

        {/* Recent Events */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold font-display">Recent Events</h3>
              <p className="text-sm text-muted-foreground">Your upcoming and active events</p>
            </div>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {mockEvents.map((event) => (
              <EventCard 
                key={event.id} 
                event={event} 
                ticketTypes={getTicketTypesByEventId(event.id)} 
              />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
