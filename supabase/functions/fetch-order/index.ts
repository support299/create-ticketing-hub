import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const payload = await req.json();

    // Extract orderId from order.metadata.orderId
    const orderId = payload?.order?.metadata?.orderId;
    // Extract locationId from location.id
    const locationId = payload?.location?.id;

    if (!orderId || !locationId) {
      console.error('Missing required fields. orderId:', orderId, 'locationId:', locationId);
      return new Response(JSON.stringify({ error: 'orderId (from order.metadata.orderId) and locationId (from location.id) are required' }), {
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

    // Save response to DB
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

    return new Response(JSON.stringify({ success: true, data: responseData }), {
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
