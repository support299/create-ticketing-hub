export interface Event {
  id: string;
  title: string;
  venue: string;
  date: string;
  endDate: string;
  time: string;
  description: string;
  coverImage: string;
  capacity: number;
  ticketsSold?: number;
  ticketPrice?: number;
  isActive: boolean;
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
  eventTitle: string;
}

export interface SalesData {
  date: string;
  revenue: number;
  tickets: number;
}
