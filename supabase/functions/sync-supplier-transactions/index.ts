import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SaleItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  sku?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header to identify the user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user from token
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting supplier transaction sync for user:', user.id);

    // Get sales from the last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { data: sales, error: salesError } = await supabase
      .from('offline_sales')
      .select('*')
      .gte('created_at', sevenDaysAgo.toISOString());

    if (salesError) {
      console.error('Error fetching sales:', salesError);
      throw salesError;
    }

    console.log(`Found ${sales?.length || 0} sales in the last 7 days`);

    // Get all customer_products with supplier info (both 'supplier' and 'proveedor' types)
    const { data: customerProducts, error: cpError } = await supabase
      .from('customer_products')
      .select(`
        id,
        product_id,
        price,
        customer_id,
        customers (
          id,
          name,
          type
        )
      `);

    if (cpError) {
      console.error('Error fetching customer products:', cpError);
      throw cpError;
    }

    // Filter only suppliers (both types)
    const supplierProducts = customerProducts?.filter(
      (cp: any) => cp.customers?.type === 'supplier' || cp.customers?.type === 'proveedor'
    ) || [];

    console.log(`Found ${supplierProducts.length} supplier product links`);

    // Create a map of product_id -> supplier commission info
    const supplierCommissionMap = new Map<string, { supplierId: string; supplierName: string; commission: number }>();
    for (const sp of supplierProducts) {
      supplierCommissionMap.set(sp.product_id, {
        supplierId: sp.customer_id,
        supplierName: (sp as any).customers?.name || 'Unknown',
        commission: sp.price
      });
    }

    // Get existing transactions for the last 7 days to avoid duplicates
    const { data: existingTransactions, error: etError } = await supabase
      .from('customer_transactions')
      .select('description')
      .gte('created_at', sevenDaysAgo.toISOString())
      .eq('type', 'debt');

    if (etError) {
      console.error('Error fetching existing transactions:', etError);
    }

    const existingDescriptions = new Set(existingTransactions?.map(t => t.description) || []);

    // Accumulate commissions by supplier
    const supplierAccumulator = new Map<string, { 
      name: string; 
      totalCommission: number; 
      productDetails: { name: string; quantity: number; commission: number }[] 
    }>();

    let processedSales = 0;
    let skippedDuplicates = 0;

    for (const sale of sales || []) {
      const items: SaleItem[] = sale.items as SaleItem[];
      
      for (const item of items) {
        const supplierInfo = supplierCommissionMap.get(item.id);
        
        if (supplierInfo) {
          const totalCommission = supplierInfo.commission * item.quantity;
          
          // Check for duplicate based on description pattern
          const descriptionPattern = `Venta: ${item.quantity}x ${item.name}`;
          if (existingDescriptions.has(descriptionPattern)) {
            skippedDuplicates++;
            continue;
          }

          if (!supplierAccumulator.has(supplierInfo.supplierId)) {
            supplierAccumulator.set(supplierInfo.supplierId, {
              name: supplierInfo.supplierName,
              totalCommission: 0,
              productDetails: []
            });
          }

          const acc = supplierAccumulator.get(supplierInfo.supplierId)!;
          acc.totalCommission += totalCommission;
          acc.productDetails.push({
            name: item.name,
            quantity: item.quantity,
            commission: totalCommission
          });
          processedSales++;
        }
      }
    }

    console.log(`Processed ${processedSales} supplier-linked items, skipped ${skippedDuplicates} duplicates`);

    // Create transactions for each supplier
    const transactionsCreated: any[] = [];

    for (const [supplierId, data] of supplierAccumulator) {
      // Create individual transactions for each product sale
      for (const detail of data.productDetails) {
        const description = `Venta: ${detail.quantity}x ${detail.name}`;
        
        // Double check it doesn't exist
        if (existingDescriptions.has(description)) {
          continue;
        }

        const { data: transaction, error: insertError } = await supabase
          .from('customer_transactions')
          .insert({
            customer_id: supplierId,
            type: 'debt',
            amount: detail.commission,
            description: description,
            status: 'pending',
            created_by: user.id
          })
          .select()
          .single();

        if (insertError) {
          console.error('Error creating transaction:', insertError);
        } else {
          transactionsCreated.push(transaction);
          existingDescriptions.add(description); // Prevent duplicates within this run
        }
      }
    }

    console.log(`Created ${transactionsCreated.length} supplier transactions`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Sincronización completada`,
        stats: {
          salesProcessed: sales?.length || 0,
          supplierItemsFound: processedSales,
          duplicatesSkipped: skippedDuplicates,
          transactionsCreated: transactionsCreated.length
        },
        transactions: transactionsCreated
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: unknown) {
    console.error('Sync error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
