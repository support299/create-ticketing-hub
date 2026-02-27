import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getLocationApiKey(supabase: any, locationId: string): Promise<string> {
  const { data, error } = await supabase
    .from('location_api_keys')
    .select('api_key')
    .eq('location_id', locationId)
    .single();

  if (error || !data) {
    throw new Error(`No API key found for location ${locationId}`);
  }
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

    const { ghlProductId, ghlPriceId, bundleName, currency, amount, locationId, availableQuantity } = await req.json();

    if (!ghlProductId || !ghlPriceId || !bundleName || !locationId) {
      return new Response(JSON.stringify({ error: 'ghlProductId, ghlPriceId, bundleName, and locationId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const apiKey = await getLocationApiKey(supabase, locationId);

    const response = await fetch(`https://services.leadconnectorhq.com/products/${ghlProductId}/price/${ghlPriceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        name: bundleName,
        type: 'one_time',
        currency: currency || 'USD',
        amount: amount || 0,
        locationId,
        trackInventory: true,
        availableQuantity: availableQuantity ?? 0,
        allowOutOfStockPurchases: false,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('LeadConnector price update API error:', JSON.stringify(data));
      throw new Error(`LeadConnector API failed [${response.status}]: ${JSON.stringify(data)}`);
    }

    console.log('Price updated in LeadConnector:', data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error updating bundle price:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
