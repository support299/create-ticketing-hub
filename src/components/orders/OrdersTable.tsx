import { Trash2 } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Order, Contact } from '@/types';
import { StatusBadge } from '@/components/ui/status-badge';
import { useEvents } from '@/hooks/useEvents';
import { useDeleteOrder } from '@/hooks/useOrders';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
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
  const { data: events = [] } = useEvents();
  const deleteOrder = useDeleteOrder();
  const [searchParams] = useSearchParams();
  const locationId = searchParams.get('id');

  const getEventTitle = (eventId: string) => {
    const event = events.find(e => e.id === eventId);
    return event?.title || 'Unknown';
  };

  const handleDelete = (orderId: string, contactName: string) => {
    deleteOrder.mutate(orderId, {
      onSuccess: () => {
        toast.success('Order deleted', {
          description: `Order for ${contactName} and related attendees have been removed.`,
        });
      },
      onError: (error) => {
        toast.error('Failed to delete order', {
          description: error instanceof Error ? error.message : undefined,
        });
      },
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50">
            <TableHead className="font-display">Order ID</TableHead>
            <TableHead className="font-display">Customer</TableHead>
            <TableHead className="font-display">Event</TableHead>
            <TableHead className="font-display">Seats</TableHead>
            <TableHead className="font-display">Total</TableHead>
            <TableHead className="font-display">Status</TableHead>
            <TableHead className="font-display">Date</TableHead>
            <TableHead className="font-display">Seats</TableHead>
            <TableHead className="font-display w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-mono text-sm">{order.id.slice(0, 8)}</TableCell>
              <TableCell>
                <div>
                  <p className="font-medium">{order.contact.name}</p>
                  <p className="text-xs text-muted-foreground">{order.contact.email}</p>
                </div>
              </TableCell>
              <TableCell className="max-w-[200px] truncate">{getEventTitle(order.eventId)}</TableCell>
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
               <TableCell>
                <Link to={`/orders/TKT-${order.id.substring(0, 8).toUpperCase()}${locationId ? `?id=${locationId}` : ''}`}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-primary"
                  >
                    Assign Seats
                  </Button>
                </Link>
               </TableCell>
              <TableCell>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Order</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete this order and remove the related attendee entry. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(order.id, order.contact.name)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
