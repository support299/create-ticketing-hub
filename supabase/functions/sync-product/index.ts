import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LEADCONNECTOR_API_KEY = Deno.env.get('LEADCONNECTOR_API_KEY');
    if (!LEADCONNECTOR_API_KEY) {
      throw new Error('LEADCONNECTOR_API_KEY is not configured');
    }

    const { name, locationId, description } = await req.json();

    if (!name || !locationId) {
      return new Response(JSON.stringify({ error: 'name and locationId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const response = await fetch('https://services.leadconnectorhq.com/products/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Version': '2021-07-28',
        'Authorization': `Bearer ${LEADCONNECTOR_API_KEY}`,
      },
      body: JSON.stringify({
        name,
        locationId,
        description: description || '',
        productType: 'DIGITAL',
        availableInStore: true,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('LeadConnector API error:', JSON.stringify(data));
      throw new Error(`LeadConnector API failed [${response.status}]: ${JSON.stringify(data)}`);
    }

    console.log('Product created in LeadConnector:', data);

    return new Response(JSON.stringify({ success: true, data }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error syncing product:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
