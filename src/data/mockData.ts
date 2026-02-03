import { Event, TicketType, Contact, Order, Attendee, SalesData } from '@/types';

export const mockEvents: Event[] = [
  {
    id: '1',
    title: 'Indie Music Night',
    venue: 'The Basement Club',
    date: '2024-03-15',
    time: '20:00',
    description: 'An intimate evening featuring emerging indie artists from the local scene. Enjoy craft cocktails and discover your new favorite band.',
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop',
    capacity: 150,
  },
  {
    id: '2',
    title: 'Creator Meetup: NYC',
    venue: 'WeWork Bryant Park',
    date: '2024-03-20',
    time: '18:30',
    description: 'Connect with fellow content creators, share insights, and build meaningful relationships in this monthly networking event.',
    coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop',
    capacity: 80,
  },
  {
    id: '3',
    title: 'Stand-up Comedy Showcase',
    venue: 'Laughs Comedy Club',
    date: '2024-03-25',
    time: '21:00',
    description: 'Five hilarious comedians take the stage for a night of non-stop laughter. Ages 18+ only.',
    coverImage: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&h=400&fit=crop',
    capacity: 200,
  },
];

export const mockTicketTypes: TicketType[] = [
  { id: '1', eventId: '1', name: 'General Admission', price: 25, quantity: 100, sold: 67, salesStart: '2024-02-01', salesEnd: '2024-03-15' },
  { id: '2', eventId: '1', name: 'VIP', price: 50, quantity: 30, sold: 22, salesStart: '2024-02-01', salesEnd: '2024-03-14' },
  { id: '3', eventId: '1', name: 'Early Bird', price: 15, quantity: 20, sold: 20, salesStart: '2024-02-01', salesEnd: '2024-02-15' },
  { id: '4', eventId: '2', name: 'Standard', price: 0, quantity: 80, sold: 45, salesStart: '2024-02-15', salesEnd: '2024-03-20' },
  { id: '5', eventId: '3', name: 'General Admission', price: 20, quantity: 150, sold: 89, salesStart: '2024-02-20', salesEnd: '2024-03-25' },
  { id: '6', eventId: '3', name: 'Front Row', price: 40, quantity: 20, sold: 18, salesStart: '2024-02-20', salesEnd: '2024-03-24' },
];

export const mockContacts: Contact[] = [
  { id: '1', name: 'Alex Johnson', email: 'alex.johnson@email.com', phone: '+1 555-0101' },
  { id: '2', name: 'Sarah Chen', email: 'sarah.chen@email.com', phone: '+1 555-0102' },
  { id: '3', name: 'Marcus Williams', email: 'marcus.w@email.com', phone: '+1 555-0103' },
  { id: '4', name: 'Emily Davis', email: 'emily.davis@email.com' },
  { id: '5', name: 'James Miller', email: 'j.miller@email.com', phone: '+1 555-0105' },
];

export const mockOrders: Order[] = [
  { id: 'ORD-001', eventId: '1', contactId: '1', total: 50, status: 'completed', createdAt: '2024-02-10T14:30:00Z', ticketTypeId: '1', quantity: 2 },
  { id: 'ORD-002', eventId: '1', contactId: '2', total: 50, status: 'completed', createdAt: '2024-02-11T09:15:00Z', ticketTypeId: '2', quantity: 1 },
  { id: 'ORD-003', eventId: '2', contactId: '3', total: 0, status: 'completed', createdAt: '2024-02-18T16:45:00Z', ticketTypeId: '4', quantity: 2 },
  { id: 'ORD-004', eventId: '3', contactId: '4', total: 40, status: 'completed', createdAt: '2024-02-22T11:00:00Z', ticketTypeId: '5', quantity: 2 },
  { id: 'ORD-005', eventId: '1', contactId: '5', total: 25, status: 'pending', createdAt: '2024-02-25T08:30:00Z', ticketTypeId: '1', quantity: 1 },
  { id: 'ORD-006', eventId: '3', contactId: '1', total: 40, status: 'cancelled', createdAt: '2024-02-23T13:20:00Z', ticketTypeId: '6', quantity: 1 },
];

export const mockAttendees: Attendee[] = [
  { id: '1', orderId: 'ORD-001', contactId: '1', ticketNumber: 'TKT-001-A', qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TKT-001-A', checkedInAt: null, ticketTypeName: 'General Admission', eventTitle: 'Indie Music Night' },
  { id: '2', orderId: 'ORD-001', contactId: '1', ticketNumber: 'TKT-001-B', qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TKT-001-B', checkedInAt: '2024-03-15T19:45:00Z', ticketTypeName: 'General Admission', eventTitle: 'Indie Music Night' },
  { id: '3', orderId: 'ORD-002', contactId: '2', ticketNumber: 'TKT-002-A', qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TKT-002-A', checkedInAt: null, ticketTypeName: 'VIP', eventTitle: 'Indie Music Night' },
  { id: '4', orderId: 'ORD-003', contactId: '3', ticketNumber: 'TKT-003-A', qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TKT-003-A', checkedInAt: null, ticketTypeName: 'Standard', eventTitle: 'Creator Meetup: NYC' },
  { id: '5', orderId: 'ORD-003', contactId: '3', ticketNumber: 'TKT-003-B', qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TKT-003-B', checkedInAt: null, ticketTypeName: 'Standard', eventTitle: 'Creator Meetup: NYC' },
  { id: '6', orderId: 'ORD-004', contactId: '4', ticketNumber: 'TKT-004-A', qrCodeUrl: 'https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=TKT-004-A', checkedInAt: null, ticketTypeName: 'General Admission', eventTitle: 'Stand-up Comedy Showcase' },
];

export const mockSalesData: SalesData[] = [
  { date: '2024-02-01', revenue: 450, tickets: 18 },
  { date: '2024-02-05', revenue: 625, tickets: 25 },
  { date: '2024-02-10', revenue: 890, tickets: 36 },
  { date: '2024-02-15', revenue: 1250, tickets: 50 },
  { date: '2024-02-20', revenue: 780, tickets: 32 },
  { date: '2024-02-25', revenue: 1100, tickets: 44 },
  { date: '2024-03-01', revenue: 1450, tickets: 58 },
];

// Helper to get contact by ID
export const getContactById = (id: string): Contact | undefined => 
  mockContacts.find(c => c.id === id);

// Helper to get event by ID
export const getEventById = (id: string): Event | undefined => 
  mockEvents.find(e => e.id === id);

// Helper to get ticket types by event ID
export const getTicketTypesByEventId = (eventId: string): TicketType[] => 
  mockTicketTypes.filter(t => t.eventId === eventId);

// Helper to get orders with contact info
export const getOrdersWithContacts = (): (Order & { contact: Contact })[] => 
  mockOrders.map(order => ({
    ...order,
    contact: getContactById(order.contactId)!,
  })).filter(o => o.contact);

// Helper to get attendees with contact info
export const getAttendeesWithContacts = (): (Attendee & { contact: Contact })[] => 
  mockAttendees.map(attendee => ({
    ...attendee,
    contact: getContactById(attendee.contactId)!,
  })).filter(a => a.contact);
