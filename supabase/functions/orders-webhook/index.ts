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

    // Accept GHL-based identifiers from inside order object
    const internalProductId = raw.order?.internalProductId || raw.internalProductId || null;
    const internalPriceId = raw.order?.internalPriceId || raw.internalPriceId || null;
    // Legacy fallback
    const legacyEventId = raw["Event ID"] || null;

    const locationId = raw.location?.id || raw["Events Account ID"] || null;
    const firstName = raw.first_name || "";
    const lastName = raw.last_name || "";
    const fullName = raw.full_name || `${firstName} ${lastName}`.trim();
    const email = raw.email;
    const phone = raw.phone || null;
    const quantity = raw.order?.quantity || 1;
    const total = raw.order?.metadata?.amount ? raw.order.metadata.amount / 100 : (raw.order?.amount || 0);
    const status = "completed";

    if (!email || !fullName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, full_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Resolve event: prefer internalProductId (ghl_product_id), then legacy Event ID
    let event: any = null;

    if (internalProductId) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('ghl_product_id', internalProductId)
        .single();
      if (!error && data) event = data;
    }

    if (!event && legacyEventId) {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', legacyEventId)
        .single();
      if (!error && data) event = data;
    }

    if (!event) {
      return new Response(
        JSON.stringify({ error: 'Event not found. Provide internalProductId or Event ID.' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const eventId = event.id;

    // 1b. If internalPriceId provided, look up the bundle to get quantity
    let bundleMatch: any = null;

    if (internalPriceId) {
      const { data: bundle } = await supabase
        .from('bundle_options')
        .select('*')
        .eq('ghl_price_id', internalPriceId)
        .single();

      if (bundle) {
        bundleMatch = bundle;
      }
    }
    // quantity = bundleQuantity * orderQuantity
    const bundleQuantity = bundleMatch ? bundleMatch.bundle_quantity : 1;
    const resolvedQuantity = bundleQuantity * quantity;

    const availableSeats = event.capacity - (event.tickets_sold || 0);
    if (resolvedQuantity > availableSeats) {
      return new Response(
        JSON.stringify({ 
          error: 'Not enough seats available', 
          available: availableSeats,
          requested: resolvedQuantity 
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

    // Resolve total: if bundle matched use bundle price when total is 0
    const resolvedTotal = total > 0 ? total : (bundleMatch ? bundleMatch.package_price : 0);

    // 3. Create order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        event_id: eventId,
        contact_id: contactId,
        quantity: resolvedQuantity,
        total: resolvedTotal,
        status: status,
        location_id: resolvedLocationId,
        bundle_option_id: bundleMatch ? bundleMatch.id : null,
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
        total_tickets: resolvedQuantity,
        check_in_count: 0,
        location_id: resolvedLocationId,
      })
      .select()
      .single();

    if (attendeeError) {
      throw new Error('Failed to create attendee');
    }

    // 4b. Create seat assignment rows for each ticket
    const seatRows = Array.from({ length: resolvedQuantity }, (_, i) => ({
      attendee_id: attendeeResult.id,
      seat_number: i + 1,
    }));

    const { error: seatError } = await supabase
      .from('seat_assignments')
      .insert(seatRows);

    if (seatError) {
      console.error('Failed to create seat assignments:', seatError);
    }

    // 5. Update event tickets_sold count
    const { error: updateError } = await supabase
      .from('events')
      .update({ tickets_sold: (event.tickets_sold || 0) + resolvedQuantity })
      .eq('id', eventId);

    if (updateError) {
      throw new Error('Failed to update event seat count');
    }

    // 6. Sync inventory to LeadConnector for all bundles of this event
    const updatedTicketsSold = (event.tickets_sold || 0) + resolvedQuantity;
    const remainingSeats = event.capacity - updatedTicketsSold;

    if (resolvedLocationId) {
      try {
        const LEADCONNECTOR_API_KEY = Deno.env.get('LEADCONNECTOR_API_KEY');
        if (LEADCONNECTOR_API_KEY) {
          const { data: allBundles } = await supabase
            .from('bundle_options')
            .select('*')
            .eq('event_id', eventId);

          if (allBundles && allBundles.length > 0) {
            const items = allBundles
              .filter((b: any) => b.ghl_price_id)
              .map((b: any) => ({
                priceId: b.ghl_price_id,
                availableQuantity: Math.floor(remainingSeats / b.bundle_quantity),
                allowOutOfStockPurchases: false,
              }));

            if (items.length > 0) {
              const inventoryRes = await fetch('https://services.leadconnectorhq.com/products/inventory', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Version': '2021-07-28',
                  'Authorization': `Bearer ${LEADCONNECTOR_API_KEY}`,
                },
                body: JSON.stringify({
                  altId: resolvedLocationId,
                  altType: 'location',
                  items,
                }),
              });

              const inventoryData = await inventoryRes.text();
              console.log('LeadConnector inventory sync response:', inventoryRes.status, inventoryData);
            }
          }
        }
      } catch (invErr) {
        console.error('LeadConnector inventory sync failed (non-fatal):', invErr);
      }
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
          remaining_seats: availableSeats - resolvedQuantity,
        },
        ...(bundleMatch ? { bundle: { name: bundleMatch.package_name, quantity: bundleMatch.bundle_quantity } } : {}),
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
