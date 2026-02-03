import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

interface OrderWebhookPayload {
  event_id: string;
  contact: {
    name: string;
    email: string;
    phone?: string;
  };
  quantity: number;
  total: number;
  status?: 'pending' | 'completed' | 'cancelled' | 'refunded';
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const payload: OrderWebhookPayload = await req.json();

    // Validate required fields
    if (!payload.event_id || !payload.contact?.name || !payload.contact?.email || !payload.quantity) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: event_id, contact.name, contact.email, quantity' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Check if event exists and has capacity
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', payload.event_id)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const availableSeats = event.capacity - (event.tickets_sold || 0);
    if (payload.quantity > availableSeats) {
      return new Response(
        JSON.stringify({ 
          error: 'Not enough seats available', 
          available: availableSeats,
          requested: payload.quantity 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Find or create contact
    let contactId: string;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', payload.contact.email)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          name: payload.contact.name,
          email: payload.contact.email,
          phone: payload.contact.phone || null,
        })
        .select('id')
        .single();

      if (contactError || !newContact) {
        throw new Error('Failed to create contact');
      }
      contactId = newContact.id;
    }

    // 3. Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        event_id: payload.event_id,
        contact_id: contactId,
        quantity: payload.quantity,
        total: payload.total || 0,
        status: payload.status || 'completed',
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error('Failed to create order');
    }

    // 4. Create attendees with unique ticket numbers
    const attendees = [];
    for (let i = 0; i < payload.quantity; i++) {
      const ticketNumber = `TKT-${order.id.slice(0, 8).toUpperCase()}-${String.fromCharCode(65 + i)}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticketNumber}`;
      
      attendees.push({
        order_id: order.id,
        contact_id: contactId,
        ticket_number: ticketNumber,
        qr_code_url: qrCodeUrl,
        event_title: event.title,
      });
    }

    const { data: createdAttendees, error: attendeesError } = await supabase
      .from('attendees')
      .insert(attendees)
      .select();

    if (attendeesError) {
      throw new Error('Failed to create attendees');
    }

    // 5. Update event tickets_sold count
    const { error: updateError } = await supabase
      .from('events')
      .update({ tickets_sold: (event.tickets_sold || 0) + payload.quantity })
      .eq('id', payload.event_id);

    if (updateError) {
      throw new Error('Failed to update event seat count');
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: order.id,
          event_id: order.event_id,
          contact_id: order.contact_id,
          quantity: order.quantity,
          total: order.total,
          status: order.status,
          created_at: order.created_at,
        },
        attendees: createdAttendees?.map(a => ({
          id: a.id,
          ticket_number: a.ticket_number,
          qr_code_url: a.qr_code_url,
        })),
        event: {
          title: event.title,
          remaining_seats: availableSeats - payload.quantity,
        },
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Internal server error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
