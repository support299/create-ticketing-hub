import { Event, Contact, Order, Attendee, SalesData } from '@/types';

export let mockEvents: Event[] = [
  {
    id: '1',
    title: 'Indie Music Night',
    venue: 'The Basement Club',
    date: '2024-03-15',
    endDate: '2024-03-15',
    time: '20:00',
    description: 'An intimate evening featuring emerging indie artists from the local scene. Enjoy craft cocktails and discover your new favorite band.',
    coverImage: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop',
    capacity: 150,
    ticketsSold: 109,
    ticketPrice: 25,
    isActive: true,
  },
  {
    id: '2',
    title: 'Creator Meetup: NYC',
    venue: 'WeWork Bryant Park',
    date: '2024-03-20',
    endDate: '2024-03-20',
    time: '18:30',
    description: 'Connect with fellow content creators, share insights, and build meaningful relationships in this monthly networking event.',
    coverImage: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=400&fit=crop',
    capacity: 80,
    ticketsSold: 45,
    ticketPrice: 0,
    isActive: true,
  },
  {
    id: '3',
    title: 'Stand-up Comedy Showcase',
    venue: 'Laughs Comedy Club',
    date: '2024-03-25',
    endDate: '2024-03-25',
    time: '21:00',
    description: 'Five hilarious comedians take the stage for a night of non-stop laughter. Ages 18+ only.',
    coverImage: 'https://images.unsplash.com/photo-1585699324551-f6c309eedeca?w=800&h=400&fit=crop',
    capacity: 200,
    ticketsSold: 107,
    ticketPrice: 20,
    isActive: false,
  },
];

export const mockContacts: Contact[] = [
  { id: '1', name: 'Alex Johnson', email: 'alex.johnson@email.com', phone: '+1 555-0101' },
  { id: '2', name: 'Sarah Chen', email: 'sarah.chen@email.com', phone: '+1 555-0102' },
  { id: '3', name: 'Marcus Williams', email: 'marcus.w@email.com', phone: '+1 555-0103' },
  { id: '4', name: 'Emily Davis', email: 'emily.davis@email.com' },
  { id: '5', name: 'James Miller', email: 'j.miller@email.com', phone: '+1 555-0105' },
];

export const mockOrders: Order[] = [];

// Mutable attendees array for check-in state
export let mockAttendees: Attendee[] = [];

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

// Helper to check in an attendee - modifies the shared state
export const checkInAttendee = (attendeeId: string): void => {
  mockAttendees = mockAttendees.map(a => 
    a.id === attendeeId 
      ? { ...a, checkedInAt: new Date().toISOString() }
      : a
  );
};

// Helper to toggle event active status
export const toggleEventStatus = (eventId: string): void => {
  mockEvents = mockEvents.map(e => 
    e.id === eventId 
      ? { ...e, isActive: !e.isActive }
      : e
  );
};

// Helper to update an event
export const updateEvent = (eventId: string, updates: Partial<Event>): void => {
  mockEvents = mockEvents.map(e => 
    e.id === eventId 
      ? { ...e, ...updates }
      : e
  );
};

// Helper to delete an event
export const deleteEvent = (eventId: string): void => {
  mockEvents = mockEvents.filter(e => e.id !== eventId);
};
