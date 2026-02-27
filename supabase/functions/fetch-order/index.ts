import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();

    const orderId = payload?.order?.metadata?.metadata?.orderId;
    const locationId = payload?.location?.id;

    if (!orderId || !locationId) {
      console.error('Missing required fields. orderId:', orderId, 'locationId:', locationId);
      return new Response(JSON.stringify({ error: 'orderId and locationId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Fetching order ${orderId} for location ${locationId}`);

    // Get API key for this location
    const { data: keyData, error: keyError } = await supabase
      .from('location_api_keys')
      .select('api_key')
      .eq('location_id', locationId)
      .single();

    if (keyError || !keyData) {
      throw new Error(`No API key found for location ${locationId}`);
    }

    // Call LeadConnector API
    const lcResponse = await fetch(
      `https://services.leadconnectorhq.com/payments/orders/${orderId}?altType=location&altId=${locationId}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Version': '2021-07-28',
          'Authorization': `Bearer ${keyData.api_key}`,
        },
      }
    );

    const responseText = await lcResponse.text();
    console.log('LeadConnector order response:', lcResponse.status, responseText);

    if (!lcResponse.ok) {
      throw new Error(`LeadConnector API failed [${lcResponse.status}]: ${responseText}`);
    }

    const responseData = JSON.parse(responseText);

    // Save raw response to DB
    const { error: insertError } = await supabase
      .from('order_responses')
      .insert({
        order_id: orderId,
        location_id: locationId,
        response_data: responseData,
      });

    if (insertError) {
      console.error('Error saving order response:', insertError);
      throw new Error(`Failed to save order response: ${insertError.message}`);
    }

    // Extract contact info from contactSnapshot
    const contactSnapshot = responseData?.contactSnapshot || {};
    const contactName = [contactSnapshot.firstName, contactSnapshot.lastName].filter(Boolean).join(' ') || null;
    const contactEmail = contactSnapshot.email || null;
    const contactPhone = contactSnapshot.phone || null;
    const ghlContactId = responseData?.contactId || contactSnapshot?.id || null;

    // Extract line items from items array
    const items = responseData?.items || [];

    const lineItems = items.map((item: any) => ({
      order_id: orderId,
      location_id: locationId,
      contact_name: contactName,
      contact_email: contactEmail,
      contact_phone: contactPhone,
      contact_id: ghlContactId,
      product_id: item?.product?._id || null,
      price_id: item?.price?._id || item?._id,
      price_name: item?.price?.name || item?.name || null,
      quantity: item?.qty || 1,
      unit_price: item?.price?.amount || 0,
      currency: item?.price?.currency || responseData?.currency || 'AUD',
    }));

    if (lineItems.length > 0) {
      const { error: lineItemsError } = await supabase
        .from('order_line_items')
        .insert(lineItems);

      if (lineItemsError) {
        console.error('Error saving order line items:', lineItemsError);
        throw new Error(`Failed to save order line items: ${lineItemsError.message}`);
      }
      console.log(`Saved ${lineItems.length} line items for order ${orderId}`);
    }

    // ── PROCESS LINE ITEMS INTO ORDERS ──
    // Group line items by product_id + price_id combo
    const grouped: Record<string, { productId: string; priceId: string; totalQty: number; unitPrice: number; currency: string }> = {};

    for (const li of lineItems) {
      if (!li.product_id || !li.price_id) {
        console.warn('Skipping line item without product_id or price_id');
        continue;
      }
      const key = `${li.product_id}::${li.price_id}`;
      if (!grouped[key]) {
        grouped[key] = {
          productId: li.product_id,
          priceId: li.price_id,
          totalQty: 0,
          unitPrice: li.unit_price,
          currency: li.currency,
        };
      }
      grouped[key].totalQty += li.quantity;
    }

    const createdOrders: any[] = [];

    // Resolve or create contact
    let internalContactId: string | null = null;
    if (contactEmail) {
      const { data: existingContact } = await supabase
        .from('contacts')
        .select('id')
        .eq('email', contactEmail)
        .maybeSingle();

      if (existingContact) {
        internalContactId = existingContact.id;
      } else {
        const { data: newContact, error: contactError } = await supabase
          .from('contacts')
          .insert({
            name: contactName || 'Unknown',
            email: contactEmail,
            phone: contactPhone,
          })
          .select('id')
          .single();

        if (contactError || !newContact) {
          throw new Error('Failed to create contact');
        }
        internalContactId = newContact.id;
      }
    }

    if (!internalContactId) {
      console.warn('No contact email found, skipping order processing');
      return new Response(JSON.stringify({ success: true, data: responseData, lineItems, warning: 'No contact email, orders not processed' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    for (const [_key, group] of Object.entries(grouped)) {
      // Find event by product_id (ghl_product_id)
      const { data: event, error: eventErr } = await supabase
        .from('events')
        .select('*')
        .eq('ghl_product_id', group.productId)
        .single();

      if (eventErr || !event) {
        console.warn(`No event found for product_id ${group.productId}, skipping`);
        continue;
      }

      // Find bundle by price_id (ghl_price_id)
      const { data: bundle } = await supabase
        .from('bundle_options')
        .select('*')
        .eq('ghl_price_id', group.priceId)
        .single();

      const bundleQuantity = bundle ? bundle.bundle_quantity : 1;
      const resolvedQuantity = bundleQuantity * group.totalQty;

      // Check capacity
      const availableSeats = event.capacity - (event.tickets_sold || 0);
      if (resolvedQuantity > availableSeats) {
        console.warn(`Not enough seats for event ${event.title}: need ${resolvedQuantity}, have ${availableSeats}`);
        continue;
      }

      const resolvedTotal = group.unitPrice > 0
        ? (group.unitPrice * group.totalQty) / 100 // cents to dollars
        : (bundle ? bundle.package_price * group.totalQty : 0);

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          event_id: event.id,
          contact_id: internalContactId,
          quantity: resolvedQuantity,
          total: resolvedTotal,
          status: 'completed',
          location_id: locationId,
          bundle_option_id: bundle ? bundle.id : null,
        })
        .select()
        .single();

      if (orderError || !order) {
        console.error('Failed to create order:', orderError);
        continue;
      }

      // Create single attendee with 1 QR for all seats
      const ticketNumber = `TKT-${order.id.slice(0, 8).toUpperCase()}`;
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${ticketNumber}`;

      const { data: attendee, error: attendeeError } = await supabase
        .from('attendees')
        .insert({
          order_id: order.id,
          contact_id: internalContactId,
          ticket_number: ticketNumber,
          qr_code_url: qrCodeUrl,
          event_title: event.title,
          total_tickets: resolvedQuantity,
          check_in_count: 0,
          location_id: locationId,
        })
        .select()
        .single();

      if (attendeeError || !attendee) {
        console.error('Failed to create attendee:', attendeeError);
        continue;
      }

      // Create seat assignments
      const seatRows = Array.from({ length: resolvedQuantity }, (_, i) => ({
        attendee_id: attendee.id,
        seat_number: i + 1,
      }));

      const { error: seatError } = await supabase
        .from('seat_assignments')
        .insert(seatRows);

      if (seatError) {
        console.error('Failed to create seat assignments:', seatError);
      }

      // Update event tickets_sold
      const { error: updateError } = await supabase
        .from('events')
        .update({ tickets_sold: (event.tickets_sold || 0) + resolvedQuantity })
        .eq('id', event.id);

      if (updateError) {
        console.error('Failed to update event tickets_sold:', updateError);
      }

      // Sync inventory to LeadConnector
      const updatedTicketsSold = (event.tickets_sold || 0) + resolvedQuantity;
      const remainingSeats = event.capacity - updatedTicketsSold;

      try {
        const apiKey = await getLocationApiKey(supabase, locationId);
        if (apiKey) {
          const { data: allBundles } = await supabase
            .from('bundle_options')
            .select('*')
            .eq('event_id', event.id);

          if (allBundles && allBundles.length > 0) {
            const invItems = allBundles
              .filter((b: any) => b.ghl_price_id)
              .map((b: any) => ({
                priceId: b.ghl_price_id,
                availableQuantity: Math.floor(remainingSeats / b.bundle_quantity),
                allowOutOfStockPurchases: false,
              }));

            if (invItems.length > 0) {
              const inventoryRes = await fetch('https://services.leadconnectorhq.com/products/inventory', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                  'Version': '2021-07-28',
                  'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify({
                  altId: locationId,
                  altType: 'location',
                  items: invItems,
                }),
              });

              const inventoryData = await inventoryRes.text();
              console.log('Inventory sync response:', inventoryRes.status, inventoryData);
            }
          }
        }
      } catch (invErr) {
        console.error('Inventory sync failed (non-fatal):', invErr);
      }

      createdOrders.push({
        orderId: order.id,
        eventTitle: event.title,
        seats: resolvedQuantity,
        ticketNumber,
        qrCodeUrl,
        bundle: bundle ? bundle.package_name : null,
      });

      console.log(`Created order ${order.id} with ${resolvedQuantity} seats for event ${event.title}`);
    }

    return new Response(JSON.stringify({
      success: true,
      lineItemsStored: lineItems.length,
      ordersCreated: createdOrders,
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching order:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
