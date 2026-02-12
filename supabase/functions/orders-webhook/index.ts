import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

Deno.serve(async (req) => {
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

    const raw = await req.json();

    // Extract fields from the new payload structure
    const eventId = raw["Event ID"];
    const locationId = raw.location?.id || raw["Events Account ID"] || null;
    const firstName = raw.first_name || "";
    const lastName = raw.last_name || "";
    const fullName = raw.full_name || `${firstName} ${lastName}`.trim();
    const email = raw.email;
    const phone = raw.phone || null;
    const quantity = raw.order?.quantity || 1;
    const total = raw.order?.metadata?.amount ? raw.order.metadata.amount / 100 : (raw.order?.amount || 0); // use Stripe metadata amount (cents) if available
    const status = "completed";

    if (!eventId || !email || !fullName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: Event ID, email, full_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Check if event exists and has capacity
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return new Response(
        JSON.stringify({ error: 'Event not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const availableSeats = event.capacity - (event.tickets_sold || 0);
    if (quantity > availableSeats) {
      return new Response(
        JSON.stringify({ 
          error: 'Not enough seats available', 
          available: availableSeats,
          requested: quantity 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use location_id from payload, fall back to event's location_id
    const resolvedLocationId = locationId || event.location_id || null;

    // 2. Find or create contact
    let contactId: string;
    const { data: existingContact } = await supabase
      .from('contacts')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingContact) {
      contactId = existingContact.id;
    } else {
      const { data: newContact, error: contactError } = await supabase
        .from('contacts')
        .insert({
          name: fullName,
          email: email,
          phone: phone,
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
        event_id: eventId,
        contact_id: contactId,
        quantity: quantity,
        total: total,
        status: status,
        location_id: resolvedLocationId,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error('Failed to create order');
    }

    // 4. Create attendee for this order
    const ticketNumber = `TKT-${order.id.slice(0, 8).toUpperCase()}`;
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticketNumber}`;
    
    const { data: attendeeResult, error: attendeeError } = await supabase
      .from('attendees')
      .insert({
        order_id: order.id,
        contact_id: contactId,
        ticket_number: ticketNumber,
        qr_code_url: qrCodeUrl,
        event_title: event.title,
        total_tickets: quantity,
        check_in_count: 0,
        location_id: resolvedLocationId,
      })
      .select()
      .single();

    if (attendeeError) {
      throw new Error('Failed to create attendee');
    }

    // 5. Update event tickets_sold count
    const { error: updateError } = await supabase
      .from('events')
      .update({ tickets_sold: (event.tickets_sold || 0) + quantity })
      .eq('id', eventId);

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
          location_id: resolvedLocationId,
          created_at: order.created_at,
        },
        attendee: {
          id: attendeeResult.id,
          ticket_number: attendeeResult.ticket_number,
          qr_code_url: attendeeResult.qr_code_url,
          total_tickets: attendeeResult.total_tickets,
          check_in_count: attendeeResult.check_in_count,
          location_id: resolvedLocationId,
        },
        event: {
          title: event.title,
          remaining_seats: availableSeats - quantity,
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
