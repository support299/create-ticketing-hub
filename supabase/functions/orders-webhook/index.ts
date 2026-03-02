import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-secret',
};

async function getLocationApiKey(supabase: any, locationId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('location_api_keys')
    .select('api_key')
    .eq('location_id', locationId)
    .single();

  if (error || !data) return null;
  return data.api_key;
}

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

    const internalProductId = raw.order?.internalProductId || raw.internalProductId || null;
    const internalPriceId = raw.order?.internalPriceId || raw.internalPriceId || null;
    const legacyEventId = raw["Event ID"] || null;

    const locationId = raw.location?.id || raw["Events Account ID"] || null;
    const firstName = raw.first_name || "";
    const lastName = raw.last_name || "";
    const fullName = raw.full_name || `${firstName} ${lastName}`.trim();
    const email = raw.email;
    const phone = raw.phone || null;
    const quantity = raw.order?.quantity || 1;
    const rawAmount = raw.order?.amount;
    const total = rawAmount != null ? rawAmount : 0;
    const status = "completed";

    if (!email || !fullName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, full_name' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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

    const resolvedLocationId = locationId || event.location_id || null;

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

    const resolvedTotal = total;

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

    const { error: updateError } = await supabase
      .from('events')
      .update({ tickets_sold: (event.tickets_sold || 0) + resolvedQuantity })
      .eq('id', eventId);

    if (updateError) {
      throw new Error('Failed to update event seat count');
    }

    // Sync inventory to LeadConnector using per-location API key
    const updatedTicketsSold = (event.tickets_sold || 0) + resolvedQuantity;
    const remainingSeats = event.capacity - updatedTicketsSold;

    if (resolvedLocationId) {
      try {
        const apiKey = await getLocationApiKey(supabase, resolvedLocationId);
        if (apiKey) {
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
                  'Authorization': `Bearer ${apiKey}`,
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

    // Update GHL contact custom fields (Ticket ID + Ticket Quantity)
    const ghlContactId = raw.contact_id || null;
    if (resolvedLocationId && ghlContactId) {
      try {
        const cfApiKey = await getLocationApiKey(supabase, resolvedLocationId);
        if (cfApiKey) {
          const fieldsToResolve = ['Ticket ID', 'Ticket Quantity'];
          const resolvedFields: Record<string, string> = {};

          // Check cached fields
          const { data: cachedFields } = await supabase
            .from('location_custom_fields')
            .select('field_id, field_name')
            .eq('location_id', resolvedLocationId)
            .in('field_name', fieldsToResolve);

          if (cachedFields) {
            for (const cf of cachedFields) {
              resolvedFields[cf.field_name] = cf.field_id;
            }
          }

          // Fetch missing fields from GHL API
          const missingFields = fieldsToResolve.filter(f => !resolvedFields[f]);
          if (missingFields.length > 0) {
            const cfRes = await fetch(
              `https://services.leadconnectorhq.com/locations/${resolvedLocationId}/customFields`,
              {
                headers: {
                  'Accept': 'application/json',
                  'Version': '2021-07-28',
                  'Authorization': `Bearer ${cfApiKey}`,
                },
              }
            );
            if (cfRes.ok) {
              const cfData = await cfRes.json();
              const allFields = cfData?.customFields || [];
              for (const fieldName of missingFields) {
                const found = allFields.find((f: any) => f.name === fieldName && f.model === 'contact');
                if (found) {
                  resolvedFields[fieldName] = found.id;
                  await supabase
                    .from('location_custom_fields')
                    .upsert(
                      { location_id: resolvedLocationId, field_id: found.id, field_name: found.name },
                      { onConflict: 'location_id,field_name' }
                    );
                }
              }
            } else {
              const cfBody = await cfRes.text();
              console.error('Custom fields API failed:', cfRes.status, cfBody);
            }
          }

          // Update GHL contact
          if (resolvedFields['Ticket ID'] || resolvedFields['Ticket Quantity']) {
            const customFieldsPayload: any[] = [];
            if (resolvedFields['Ticket ID']) {
              customFieldsPayload.push({ id: resolvedFields['Ticket ID'], key: 'ticket_id', field_value: ticketNumber });
            }
            if (resolvedFields['Ticket Quantity']) {
              customFieldsPayload.push({ id: resolvedFields['Ticket Quantity'], key: 'ticket_qty', field_value: String(resolvedQuantity) });
            }

            const updateRes = await fetch(
              `https://services.leadconnectorhq.com/contacts/${ghlContactId}`,
              {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Version': '2021-07-28',
                  'Authorization': `Bearer ${cfApiKey}`,
                },
                body: JSON.stringify({ customFields: customFieldsPayload }),
              }
            );
            const updateBody = await updateRes.text();
            if (updateRes.ok) {
              console.log(`Updated GHL contact ${ghlContactId} with ticket_id=${ticketNumber}, ticket_qty=${resolvedQuantity}`);
            } else {
              console.error(`Failed to update GHL contact ${ghlContactId}:`, updateRes.status, updateBody);
            }
          }
        }
      } catch (cfErr) {
        console.error('Custom field update failed (non-fatal):', cfErr);
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
