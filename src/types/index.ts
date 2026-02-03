export interface Event {
  id: string;
  title: string;
  venue: string;
  date: string;
  time: string;
  description: string;
  coverImage: string;
  capacity: number;
}

export interface TicketType {
  id: string;
  eventId: string;
  name: string;
  price: number;
  quantity: number;
  sold: number;
  salesStart: string;
  salesEnd: string;
}

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone?: string;
}

export interface Order {
  id: string;
  eventId: string;
  contactId: string;
  contact?: Contact;
  total: number;
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  createdAt: string;
  ticketTypeId: string;
  quantity: number;
}

export interface Attendee {
  id: string;
  orderId: string;
  contactId: string;
  contact?: Contact;
  ticketNumber: string;
  qrCodeUrl: string;
  checkedInAt: string | null;
  ticketTypeName: string;
  eventTitle: string;
}

export interface SalesData {
  date: string;
  revenue: number;
  tickets: number;
}
