import { Order, Contact } from '@/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { getEventById } from '@/data/mockData';
import { format } from 'date-fns';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface OrdersTableProps {
  orders: (Order & { contact: Contact })[];
}

export function OrdersTable({ orders }: OrdersTableProps) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-display">Order ID</TableHead>
            <TableHead className="font-display">Customer</TableHead>
            <TableHead className="font-display">Event</TableHead>
            <TableHead className="font-display">Quantity</TableHead>
            <TableHead className="font-display">Total</TableHead>
            <TableHead className="font-display">Status</TableHead>
            <TableHead className="font-display">Date</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => {
            const event = getEventById(order.eventId);
            return (
              <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                <TableCell className="font-mono text-sm">{order.id}</TableCell>
                <TableCell>
                  <div>
                    <p className="font-medium">{order.contact.name}</p>
                    <p className="text-xs text-muted-foreground">{order.contact.email}</p>
                  </div>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{event?.title || 'Unknown'}</TableCell>
                <TableCell>{order.quantity}</TableCell>
                <TableCell className="font-semibold font-display">
                  {order.total === 0 ? 'Free' : `$${order.total}`}
                </TableCell>
                <TableCell>
                  <StatusBadge status={order.status} />
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {format(new Date(order.createdAt), 'MMM d, yyyy')}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
