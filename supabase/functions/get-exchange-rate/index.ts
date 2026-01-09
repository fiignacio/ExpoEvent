import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Fetch exchange rate from mindicador.cl (Chilean API)
    const response = await fetch('https://mindicador.cl/api/dolar');
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rate from mindicador.cl');
    }

    const data = await response.json();
    const exchangeRate = data.serie?.[0]?.valor;

    if (!exchangeRate) {
      throw new Error('Exchange rate not found in response');
    }

    // Optionally update the settings table
    const { updateSettings } = await req.json().catch(() => ({ updateSettings: false }));

    if (updateSettings) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const { error } = await supabase
        .from('settings')
        .update({
          usd_exchange_rate: exchangeRate,
          last_exchange_rate_update: new Date().toISOString(),
        })
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Update all settings rows

      if (error) {
        console.error('Error updating settings:', error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        exchangeRate: exchangeRate,
        source: 'mindicador.cl',
        date: data.serie?.[0]?.fecha,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
